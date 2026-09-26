import 'server-only';
import {brotliDecompressSync} from 'node:zlib';
import {GEMEINDE_PAKET_BUCKET} from './gemeinde-paket-server';
import {energyYearTitle} from './story-energy-year-labels';
import {DB_READ_TIMEOUT_MS,withDbTimeout} from './db-timeout';
import {ATLAS_DATEN_TAG,KREIS_PAKET_TAG} from './atlas-revalidate-routen';
import {DISTRICT_POINTER_PATH,checkDistrictPackage,checkManifest,type DistrictComputed,type DistrictMonitor,type DistrictRefusal} from './district-package';
import type {StoryConcept} from './story-konzepte';
import {checkRegionPackage} from './region-package';

/**
 * The district page reads ONE precomputed package (lib/district-package.ts),
 * never its member towns. Built by scripts/kreis-paket.ts in the monthly run
 * and by the daily recovery workflow (.github/workflows/kreis-pakete.yml).
 *
 * Three outcomes, each named on the page:
 *   current        package of the register cycle the page shows
 *   older-edition  valid package whose town data predates the page's register
 *                  cycle — shown with its own date, never called current
 *   unavailable    no package, or one for another membership/version: the
 *                  sections say so. There is deliberately NO request-time
 *                  fallback to reading every town: that is the 3–12 s this
 *                  replaces, and a silent one would hide a broken refresh.
 * A failed READ throws (render fails, the CDN keeps the last good page),
 * exactly like the town package reader.
 */
export type DistrictPrepared =
  | {state:'current'|'older-edition';editions:string[];generation:string;builtAt:string}
  | {state:'unavailable';reason:'not-published'|DistrictRefusal};
export type DistrictContent = DistrictComputed & {prepared:DistrictPrepared};

const UNAVAILABLE_MONITOR:DistrictMonitor={status:'unavailable',reason:'not-prepared',energy:null,sites:null};

async function readObject(path:string):Promise<Buffer|null>{
  const url=process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_KEY;
  if(!url||!key)throw new Error('kreis-paket: Supabase-Zugang fehlt');
  const res=await withDbTimeout(fetch(`${url}/storage/v1/object/${GEMEINDE_PAKET_BUCKET}/${path}`,{
    headers:{apikey:key,Authorization:`Bearer ${key}`},
    // Both tags: the monthly Atlas invalidation and the narrow district one.
    next:{revalidate:86400,tags:[ATLAS_DATEN_TAG,KREIS_PAKET_TAG]},
  }),`kreis-paket/${path}`,DB_READ_TIMEOUT_MS);
  if(res.status===400||res.status===404)return null;
  if(!res.ok)throw new Error(`kreis-paket/${path}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const unavailable=(reason:'not-published'|DistrictRefusal):DistrictContent=>({monitor:UNAVAILABLE_MONITOR,stories:[],prepared:{state:'unavailable',reason}});

/** Same-cycle test: the register database and the town packages are built days apart within one month. */
export function preparedState(editions:string[],stand:string):'current'|'older-edition'{
  const newest=editions.at(-1);
  return newest&&stand&&newest.slice(0,7)<stand.slice(0,7)?'older-edition':'current';
}

export async function loadDistrictContent(regionId:string,members:string[],stand:string):Promise<DistrictContent>{
  const pointer=await readObject(DISTRICT_POINTER_PATH);
  const manifest=pointer?JSON.parse(pointer.toString('utf8')):null;
  if(!manifest||!checkManifest(manifest))return unavailable('not-published');
  const entry=manifest.districts[regionId];
  if(!entry)return unavailable('not-published');
  const body=await readObject(entry.path);
  if(!body)return unavailable('not-published');
  const check=checkDistrictPackage(JSON.parse(brotliDecompressSync(body).toString('utf8')),regionId,members);
  if(!check.ok)return unavailable(check.reason);
  const {pkg}=check;
  // Story titles of energy years follow the current code, like the town reader.
  const stories=pkg.content.stories.map((s:StoryConcept)=>s.energyYear?{...s,title:energyYearTitle(s.energyYear)}:s);
  return {monitor:pkg.content.monitor,stories,prepared:{state:preparedState(pkg.editions,stand),editions:pkg.editions,generation:manifest.generation,builtAt:pkg.builtAt}};
}

/**
 * Bundesland and Deutschland: the region package of the same generation
 * (lib/region-package.ts). `children` are the page's child regions (Kreise
 * resp. Bundesländer); a different child list refuses the package. Same three
 * outcomes as a district. `monitor.sites` is always null here: the live power
 * widget has no upper-level source yet; `stories` is always empty.
 */
export async function loadRegionContent(regionId:string,children:string[],stand:string):Promise<DistrictContent>{
  const pointer=await readObject(DISTRICT_POINTER_PATH);
  const manifest=pointer?JSON.parse(pointer.toString('utf8')):null;
  if(!manifest||!checkManifest(manifest))return unavailable('not-published');
  const entry=manifest.regions?.[regionId];
  if(!entry)return unavailable('not-published');
  const body=await readObject(entry.path);
  if(!body)return unavailable('not-published');
  const check=checkRegionPackage(JSON.parse(brotliDecompressSync(body).toString('utf8')),regionId,children);
  if(!check.ok)return unavailable(check.reason);
  const {pkg}=check;
  return {monitor:pkg.content.monitor,stories:[],prepared:{state:preparedState(pkg.editions,stand),editions:pkg.editions,generation:manifest.generation,builtAt:pkg.builtAt}};
}

/** The daily power endpoint consumes the same package. */
export async function loadDistrictMonitor(regionId:string,members:string[],stand:string){
  return (await loadDistrictContent(regionId,members,stand)).monitor;
}
