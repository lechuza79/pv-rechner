import {projectWindContext,type WindContext,type SceneContext} from "./wind-context";
import { regionProjection, type RegionGeometry } from "./region-perspektive";
export type WindTerrain = {
  context?:WindContext; id:string; width:number; height:number; bounds:[number,number,number,number];
  surface?:{vertices:[number,number][];indices:number[]};
  elevations:number[];
  minimum:number; maximum:number; retrievedAt:string;
};
export type SceneTerrain = Pick<WindTerrain, 'id' | 'width' | 'height' | 'elevations' | 'minimum' | 'maximum'> & { patches?:SceneTerrain[]; display?:'contours'; groundSurface?:{vertices:[number,number][];indices:number[]}; sceneContext?:SceneContext; groundBounds:[number,number,number,number]; unitsPerMetre:number; reference:number };
export function projectWindTerrain(feature:RegionGeometry,terrain:WindTerrain):SceneTerrain {
  const projection=regionProjection([feature]);
  const bounds=(b:number[]):[number,number,number,number]=>{
    const nw=projection.groundPoint([b[0],b[3]]),se=projection.groundPoint([b[2],b[1]]);
    return [nw[0],nw[1],se[0],se[1]];
  };
  return {...terrain,groundSurface:terrain.surface?{vertices:terrain.surface.vertices.map(p=>projection.groundPoint(p)),indices:terrain.surface.indices}:undefined,sceneContext:terrain.context?projectWindContext(feature,terrain.context):undefined,groundBounds:bounds(terrain.bounds),unitsPerMetre:projection.unitsPerMetre,reference:Math.floor(terrain.minimum/10)*10};
}
/** Sample the exact triangle surface used by the terrain mesh. */
export function terrainHeight(terrain:SceneTerrain,x:number,z:number):number {
  const patch=terrain.patches?.find(p=>{const [w,n,e,s]=p.groundBounds;return x>=w&&x<=e&&z>=n&&z<=s;});
  if(patch)return terrainHeight(patch,x,z);
  const [west,north,east,south]=terrain.groundBounds;
  const u=Math.max(0,Math.min(terrain.width-1,(x-west)/(east-west)*(terrain.width-1)));
  const v=Math.max(0,Math.min(terrain.height-1,(z-north)/(south-north)*(terrain.height-1)));
  const i=Math.min(terrain.width-2,Math.floor(u)),j=Math.min(terrain.height-2,Math.floor(v));
  const a=u-i,b=v-j,e=terrain.elevations,w=terrain.width;
  const nw=e[j*w+i],ne=e[j*w+i+1],sw=e[(j+1)*w+i],se=e[(j+1)*w+i+1];
  // Zero-weight neighbours must not turn an exact measured edge sample into NaN.
  // A missing sample with positive weight remains unknown, never zero metres.
  const terms=a+b<=1?[[nw,1-a-b],[ne,a],[sw,b]]:[[se,a+b-1],[sw,1-a],[ne,1-b]];
  let metres=0;for(const [height,weight] of terms)if(weight>1e-12){if(!Number.isFinite(height))return Number.NaN;metres+=height*weight;}
  return (metres-terrain.reference)*terrain.unitsPerMetre;
}
