import type {GenerationDataPoint} from './energy';
const DAY = 24 * 60 * 60 * 1000;
/** `at` selects an explicit story observation; `stand` only refreshes live sharing. */
export function radarObservation(query:Record<string,string>):string|undefined {
 const value=query.at;
 if(!value)return undefined;
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value)))throw new Error('Invalid radar observation timestamp');
 return new Date(value).toISOString();
}
export function radarDateRange(query:Record<string,string>){
 const at=radarObservation(query);
 return at?{start:new Date(Date.parse(at)-DAY).toISOString().slice(0,10),end:at.slice(0,10)}:undefined;
}
export function radarDataEndpoint(query:Record<string,string>){
 const range=radarDateRange(query);
 return range?`/api/energy/generation?country=de&start=${range.start}&end=${range.end}`:'/api/energy/generation?country=de&hours=24';
}
export function radarObservationPoints(points:GenerationDataPoint[],at?:string){
 if(!at)return points;
 const end=Date.parse(at);
 // Missing requested observations must not silently become a different snapshot.
 if(!points.some(point=>Date.parse(point.ts)===end))return [];
 return points.filter(point=>Date.parse(point.ts)<=end&&Date.parse(point.ts)>end-DAY);
}
