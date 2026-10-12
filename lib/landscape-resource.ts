import {landscapePlaces} from './landscape-places';
/** Prepared public assets only; visitor requests never prepare geometry. */
export function landscapeResourcePath(path:string):boolean {
 const tour=path.match(/^\/geo\/landscape-tours\/(\d{5}|\d{8})\/scene\.json$/);
 if(tour)return Object.hasOwn(landscapePlaces,tour[1]);
 return ['/geo/nidda-preview/scene.json','/geo/nidda-preview/solar.json','/geo/nidda-preview/wind-overview.json','/geo/wind-boundaries/05774040.geo.json','/geo/wind-terrain/05774040.json','/geo/wind-context/05774040.json','/geo/wuennenberg-preview/register.json','/geo/wuennenberg-preview/buildings.json'].includes(path);
}
export function landscapeResourceUrl(path:string){
 if(!landscapeResourcePath(path))throw new Error('Unsupported landscape asset');
 return '/api/widgets/landscape?'+new URLSearchParams({path});
}
