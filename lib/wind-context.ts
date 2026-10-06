import {insidePolygon,polygons,regionProjection,type RegionGeometry} from './region-perspektive';
export type Point=[number,number];
export type ContextGeometry={type:'Polygon';coordinates:Point[][]}|{type:'MultiPolygon';coordinates:Point[][][]}|{type:'LineString';coordinates:Point[]}|{type:'MultiLineString';coordinates:Point[][]};
export type WindContext={id:string;retrievedAt:string;waterContinuationMetres?:number;features:{id:string;kind:'water'|'stream'|'settlement';name:string;geometry:ContextGeometry}[];places:{name:string;point:Point}[]};
export type SceneContext={waterContinuation?:{outline:Point[][][];distance:number};unitsPerMetre:number;areas:{kind:'water'|'settlement';rings:Point[][]}[];streams:Point[][];places:{name:string;point:Point}[]};
export function projectWindContext(feature:RegionGeometry,context:WindContext):SceneContext{
  const projection=regionProjection([feature]),point=(p:Point)=>projection.groundPoint(p) as Point;
  const areas:SceneContext['areas']=[],streams:Point[][]=[];
  for(const f of context.features){
    const g=f.geometry;
    if(g.type==='Polygon'||g.type==='MultiPolygon'){
      if(f.kind==='stream')continue;
      for(const rings of g.type==='Polygon'?[g.coordinates]:g.coordinates)areas.push({kind:f.kind,rings:rings.map(r=>r.map(point))});
    }else for(const line of g.type==='LineString'?[g.coordinates]:g.coordinates)streams.push(line.map(point));
  }
  return {waterContinuation:context.waterContinuationMetres?{outline:polygons(feature).map(poly=>poly.map(ring=>ring.map(point))),distance:context.waterContinuationMetres*projection.unitsPerMetre}:undefined,unitsPerMetre:projection.unitsPerMetre,areas,streams,places:context.places.filter(p=>polygons(feature).some(poly=>insidePolygon(p.point,poly))).map(p=>({...p,point:point(p.point)}))};
}

/** Fade only the original water geometry beyond the physical municipality edge. */
export function waterEdgeOpacity(p:Point, continuation:SceneContext['waterContinuation']) {
  if(!continuation || continuation.outline.some(poly=>insidePolygon(p,poly)))return 1;
  let distance=Infinity;
  for(const poly of continuation.outline)for(const ring of poly)for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1];
    const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1)));
    distance=Math.min(distance,Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz));
  }
  const t=Math.min(1,distance/continuation.distance);
  return 1-t*t*(3-2*t);
}
