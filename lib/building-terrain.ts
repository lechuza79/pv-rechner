import type {SceneTerrain} from './wind-terrain';
import {combineTerrain} from './terrain-patches';

type Rectangle = [number,number,number,number];

/** Bound overview geometry while retaining measured cells around real objects. */
export function buildingTerrainSurface(terrain:SceneTerrain,detailBounds:Rectangle[],smallSceneStride:number):SceneTerrain {
 const {width,height,groundBounds:[w,n,e,s]}=terrain;
 if(width<2||height<2)throw new Error('Terrain needs at least two rows and columns');
 const large=width*height>300_000;
 const stride=large?Math.max(2,Math.ceil(Math.sqrt(width*height/40_000))):smallSceneStride;
 const grid=(first:number,last:number,step:number)=>{
  const result:number[]=[];for(let i=first;i<=last;i+=step)result.push(i);
  if(result.at(-1)!==last)result.push(last);return result;
 };
 const x=(column:number)=>w+(e-w)*column/(width-1),z=(row:number)=>n+(s-n)*row/(height-1);
 // Prefix counts prevent a coarse triangle from spanning any missing fine cell.
 const missing=terrain.elevations.some(value=>!Number.isFinite(value));
 const pitch=width+1;
 const invalid=missing?new Uint32Array((height+1)*pitch):undefined;
 if(invalid)for(let row=0;row<height;row++)for(let col=0;col<width;col++)invalid[(row+1)*pitch+col+1]=invalid[row*pitch+col+1]+invalid[(row+1)*pitch+col]-invalid[row*pitch+col]+(Number.isFinite(terrain.elevations[row*width+col])?0:1);
 const valid=(left:number,top:number,right:number,bottom:number)=>!invalid||invalid[(bottom+1)*pitch+right+1]-invalid[top*pitch+right+1]-invalid[(bottom+1)*pitch+left]+invalid[top*pitch+left]===0;
 const surface=(columns:number[],rows:number[])=>{
  const vertices:[number,number][]=[];const indices:number[]=[];const lookup=new Map<number,number>();
  const vertex=(column:number,row:number)=>{const key=row*width+column;let index=lookup.get(key);if(index===undefined){index=vertices.length;vertices.push([x(column),z(row)]);lookup.set(key,index);}return index;};
  for(let j=0;j<rows.length-1;j++)for(let i=0;i<columns.length-1;i++){
   if(!valid(columns[i],rows[j],columns[i+1],rows[j+1]))continue;
   const a=vertex(columns[i],rows[j]),b=vertex(columns[i+1],rows[j]),c=vertex(columns[i],rows[j+1]),d=vertex(columns[i+1],rows[j+1]);
   indices.push(a,c,b,b,c,d);
  }
  return {vertices,indices};
 };
 const base={...terrain,groundSurface:surface(grid(0,width-1,stride),grid(0,height-1,stride))};
 if(!large)return base;
 const rectangles:Rectangle[]=[];
 for(const [left,top,right,bottom] of detailBounds){
  const rect:Rectangle=[Math.max(0,Math.floor((left-w)/(e-w)*(width-1))-1),Math.max(0,Math.floor((top-n)/(s-n)*(height-1))-1),Math.min(width-1,Math.ceil((right-w)/(e-w)*(width-1))+1),Math.min(height-1,Math.ceil((bottom-n)/(s-n)*(height-1))+1)];
  if(rect[0]>=rect[2]||rect[1]>=rect[3])continue;
  // Merge overlapping detail windows so the same cells are not triangulated twice.
  let merged=true;
  while(merged){merged=false;for(let i=rectangles.length-1;i>=0;i--){const other=rectangles[i];if(rect[0]>other[2]||rect[2]<other[0]||rect[1]>other[3]||rect[3]<other[1])continue;
   rect[0]=Math.min(rect[0],other[0]);rect[1]=Math.min(rect[1],other[1]);rect[2]=Math.max(rect[2],other[2]);rect[3]=Math.max(rect[3],other[3]);rectangles.splice(i,1);merged=true;
  }}
  rectangles.push(rect);
 }
 const patches=rectangles.map(([left,top,right,bottom]):SceneTerrain=>{
  const elevations:number[]=[];
  for(let row=top;row<=bottom;row++)for(let col=left;col<=right;col++)elevations.push(terrain.elevations[row*width+col]);
  return {...terrain,patches:undefined,width:right-left+1,height:bottom-top+1,elevations,
   groundBounds:[x(left),z(top),x(right),z(bottom)],groundSurface:surface(grid(left,right,1),grid(top,bottom,1))};
 });
 return patches.length?combineTerrain(base,patches):base;
}
