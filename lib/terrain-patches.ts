import type {SceneTerrain} from './wind-terrain';

type Point=[number,number];
/** Replace coarse triangles inside each detailed rectangle without overlapping surfaces. */
export function combineTerrain(base:SceneTerrain,patches:SceneTerrain[]):SceneTerrain {
  let surface=base.groundSurface!;
  for(const patch of patches){
    const vertices:Point[]=[],indices:number[]=[];
    const emit=(polygon:Point[])=>{
      const offset=vertices.length;vertices.push(...polygon);
      for(let j=1;j<polygon.length-1;j++)indices.push(offset,offset+j,offset+j+1);
    };
    const [w,n,e,s]=patch.groundBounds;
    const edges:[number,number,number][]=[[0,w,1],[0,e,-1],[1,n,1],[1,s,-1]];
    for(let i=0;i<surface.indices.length;i+=3){
      let polygon=surface.indices.slice(i,i+3).map(j=>surface.vertices[j]);
      if(polygon.every(p=>p[0]<=w)||polygon.every(p=>p[0]>=e)||polygon.every(p=>p[1]<=n)||polygon.every(p=>p[1]>=s)){emit(polygon);continue;}
      for(const [axis,bound,sign] of edges){
        const inside:Point[]=[],outside:Point[]=[];
        for(let j=0;j<polygon.length;j++){
          const a=polygon[j],b=polygon[(j+1)%polygon.length];
          const da=(a[axis]-bound)*sign,db=(b[axis]-bound)*sign;
          if(da>=0)inside.push(a);
          if(da<=0)outside.push(a);
          if((da<0&&db>0)||(da>0&&db<0)){
            const t=da/(da-db),p:Point=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];
            inside.push(p);outside.push(p);
          }
        }
        emit(outside);polygon=inside;
        if(!polygon.length)break;
      }
    }
    const offset=vertices.length;
    for(const point of patch.groundSurface!.vertices)vertices.push(point);
    for(const index of patch.groundSurface!.indices)indices.push(index+offset);
    surface={vertices,indices};
  }
  const vertices:Point[]=[],lookup=new Map<string,number>();
  const remap=surface.vertices.map(p=>{const key=p.map(v=>v.toFixed(7)).join('/');let index=lookup.get(key);if(index===undefined){index=vertices.length;vertices.push(p);lookup.set(key,index);}return index;});
  return {...base,patches,groundSurface:{vertices,indices:surface.indices.map(i=>remap[i])}};
}
