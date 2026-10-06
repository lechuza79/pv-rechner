import {landscapePlaces} from './landscape-places';
import { insidePolygon, polygons, regionProjection, type Point, type RegionGeometry } from "./region-perspektive";

export const WIND_BUFFER_M = 500;
const METRES_PER_DEGREE = 6371008.8 * Math.PI / 180;
export const WIND_TOWNS = [
  { id: "05774040", name: "Bad Wünnenberg" }, { id: "03455020", name: "Wangerland" },
  { id: "03452011", name: "Hinte" }, { id: "01055046", name: "Fehmarn" },
  { id: "12060250", name: "Sydower Fließ" }, { id: "06632009", name: "Heringen (Werra)" },
] as const;
// Every prepared single-municipality stage is its own weather town; districts name theirs explicitly.
export const isWindWeatherTown=(id:string)=>["06440016","09679147","07312000","03458009","07335022","03458014","09679170"].includes(id)||WIND_TOWNS.some(t=>t.id===id)||(id.length===8&&id in landscapePlaces);
export type WindTurbine = {
  mastr_nr: string; region_id: string | null; status: string; lage: string | null;
  lat: number | null; lon: number | null; nabenhoehe_m: number | null; rotor_m: number | null;
  brutto_kw: number | null; hersteller: string | null; typ: string | null;
  windpark: string | null; inbetriebnahme: string | null;
};
export type SceneTurbine = { id: string; x: number; z: number; hub: number | null; rotor: number | null; rotorMetres?:number | null; manufacturer?:string|null; model?:string|null; ratedKw?:number|null };
export const hasCoordinates = (t: WindTurbine) => t.lat !== null && t.lon !== null && Number.isFinite(t.lat) && Number.isFinite(t.lon);
export const hasDimensions = (t: WindTurbine) => t.nabenhoehe_m !== null && t.nabenhoehe_m > 0 && t.rotor_m !== null && t.rotor_m > 0;

export function windBounds(feature: RegionGeometry) {
  const points = polygons(feature).flat(2);
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const minLat = Math.min(...ys), maxLat = Math.max(...ys);
  const dy = WIND_BUFFER_M / METRES_PER_DEGREE;
  const dx = dy / Math.cos((Math.max(Math.abs(minLat), Math.abs(maxLat)) + dy) * Math.PI / 180);
  return { minLon: Math.min(...xs)-dx, maxLon: Math.max(...xs)+dx, minLat:minLat-dy, maxLat:maxLat+dy };
}

function segmentDistance(p: Point, a: Point, b: Point) {
  const dx=b[0]-a[0], dy=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy || 1)));
  return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
}

/** Positive buffer includes boundary edges and contracts holes, across all islands. */
export function selectWindTurbines(feature: RegionGeometry, candidates: WindTurbine[], bufferM = WIND_BUFFER_M) {
  const { groundPoint, unitsPerMetre } = regionProjection([feature]);
  const ground = polygons(feature).map(poly => poly.map(ring => ring.map(groundPoint)));
  return candidates.filter(t => {
    if (t.status !== "35" || t.lage !== "Windkraft an Land" || !hasCoordinates(t)) return false;
    const point = groundPoint([t.lon!,t.lat!]);
    return ground.some(poly => insidePolygon(point,poly) || poly.some(ring => ring.some((a,i) =>
      segmentDistance(point,a,ring[(i+1)%ring.length]) <= bufferM * unitsPerMetre)));
  });
}

export function sceneTurbines(feature: RegionGeometry, turbines: WindTurbine[]): SceneTurbine[] {
  const projection=regionProjection([feature]);
  return turbines.map(t => {
    const [x,z]=projection.groundPoint([t.lon!,t.lat!]);
    return { id:t.mastr_nr, x,z, manufacturer:t.hersteller,model:t.typ,ratedKw:t.brutto_kw,rotorMetres:hasDimensions(t)?t.rotor_m:null,
      hub:hasDimensions(t)?t.nabenhoehe_m! * projection.unitsPerMetre:null,
      rotor:hasDimensions(t)?t.rotor_m! * projection.unitsPerMetre:null };
  });
}
