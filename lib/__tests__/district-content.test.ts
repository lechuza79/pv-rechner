import {beforeEach,describe,expect,it,vi} from 'vitest';
import {brotliCompressSync} from 'node:zlib';
import type {GemeindePaket} from '../gemeinde-paket';
import {GEMEINDE_PAKET_VERSION} from '../gemeinde-paket';
import {DISTRICT_PACKAGE_VERSION,DISTRICT_POINTER_PATH,buildDistrictPackage,checkDistrictPackage,computeDistrictContent,districtsFromRegister,type DistrictManifest} from '../district-package';

vi.mock('server-only',()=>({}));
const objects=vi.hoisted(()=>new Map<string,Buffer|Error>());
const fetchMock=vi.hoisted(()=>vi.fn(async(url:string)=>{
  const path=url.split('/gemeinde-pakete/')[1];
  const hit=objects.get(path);
  if(hit instanceof Error)return new Response('boom',{status:503});
  return hit?new Response(new Uint8Array(hit)):new Response('not found',{status:404});
}));
vi.stubGlobal('fetch',fetchMock);
process.env.SUPABASE_URL='https://x.supabase.co';process.env.SUPABASE_SERVICE_KEY='k';
import {loadDistrictContent,preparedState} from '../district-monitor-server';
import {districtSolarCells} from '../district-monitor';

const packet=(ags:string,stand='2026-09-10')=>({ags,name:ags,registerStand:stand,district:{peers:[],districtPeers:[]},stories:[{kind:'bar',label:'L'+ags,town:ags,title:'T'}],register:{own:{sums:{alle:{kwp:100}}}},monitorHistory:null,monitorPeriods:null}) as unknown as GemeindePaket;
const members=['07339001','07339002'];
function publish(pkg:object,regionId='07339'){
  const path=`kreise/v${DISTRICT_PACKAGE_VERSION}/g1/${regionId}.json.br`;
  objects.set(path,brotliCompressSync(Buffer.from(JSON.stringify(pkg))));
  const m:DistrictManifest={version:DISTRICT_PACKAGE_VERSION,townPackageVersion:GEMEINDE_PAKET_VERSION,generation:'g1',publishedAt:'',previousGeneration:null,districts:{[regionId]:{path,fingerprint:'f',members:2,editions:[],missing:0,bytes:1}}};
  objects.set(DISTRICT_POINTER_PATH,Buffer.from(JSON.stringify(m)));
}

describe('district aggregation (former request-time loader)',()=>{
  it('keeps complete capacity coverage only when every town is present on one edition',()=>{
    const ok=computeDistrictContent(members,members.map(a=>packet(a)),'K');
    expect(ok.monitor.sites).toEqual([{ags:'07339001',kwp:100},{ags:'07339002',kwp:100}]);
    expect(ok.monitor.status).toBe('unavailable'); // no month history: never invented
    expect(computeDistrictContent(members,[packet(members[0]),null],'K').monitor.sites).toBeNull();
    const mixed=computeDistrictContent(members,[packet(members[0]),packet(members[1],'2026-08-09')],'K');
    expect(mixed.monitor.sites).toBeNull();
    expect(mixed.monitor.energy).toBeNull();
  });
  it('selects at most one story per town, as before',()=>{
    expect(computeDistrictContent(members,members.map(a=>packet(a)),'K').stories.map(s=>s.town).sort()).toEqual(members);
  });
  it('records missing towns and editions without inventing values',()=>{
    const pkg=buildDistrictPackage({regionId:'07339',name:'K',members},[packet(members[0]),null],'fp','now');
    expect(pkg.missing).toEqual([members[1]]);
    expect(pkg.editions).toEqual(['2026-09-10']);
    expect(pkg.content.monitor.sites).toBeNull();
  });
  it('refuses a package for another membership, region or version',()=>{
    const pkg=buildDistrictPackage({regionId:'07339',name:'K',members},members.map(a=>packet(a)),'fp','now');
    expect(checkDistrictPackage(pkg,'07339',members).ok).toBe(true);
    expect(checkDistrictPackage(pkg,'07339',[...members,'07339003'])).toEqual({ok:false,reason:'membership'});
    expect(checkDistrictPackage(pkg,'07339',[members[0]])).toEqual({ok:false,reason:'membership'});
    expect(checkDistrictPackage(pkg,'07340',members)).toEqual({ok:false,reason:'region'});
    expect(checkDistrictPackage({...pkg,version:DISTRICT_PACKAGE_VERSION+1},'07339',members)).toEqual({ok:false,reason:'version'});
  });
});

describe('register membership',()=>{
  it('excludes unincorporated areas, retired keys and independent cities',()=>{
    const rows=[
      {region_id:'07339',name:'Mainz-Bingen',level:'landkreis',bezeichnung:'Landkreis',parent_region_id:'07'},
      {region_id:'07339001',name:'A',level:'gemeinde',bezeichnung:'Gemeinde',parent_region_id:'07339'},
      {region_id:'07339002',name:'B',level:'gemeinde',bezeichnung:'Stadt',parent_region_id:'07339'},
      // Dissolved into Ingelheim am Rhein in 2019 (Destatis change list): the register keeps the row.
      {region_id:'07339027',name:'Heidesheim am Rhein',level:'gemeinde',bezeichnung:null,parent_region_id:'07339'},
      {region_id:'07339099',name:'Forst',level:'gemeinde',bezeichnung:'Gemeindefreies Gebiet',parent_region_id:'07339'},
      {region_id:'07315',name:'Mainz',level:'landkreis',bezeichnung:'Kreisfreie Stadt',parent_region_id:'07'},
      {region_id:'07315000',name:'Mainz',level:'gemeinde',bezeichnung:'Stadt',parent_region_id:'07315'},
    ];
    expect(districtsFromRegister(rows)).toEqual([{regionId:'07339',name:'Mainz-Bingen',members:['07339001','07339002']}]);
  });
});

describe('page reader',()=>{
  beforeEach(()=>{objects.clear();fetchMock.mockClear();});
  it('reads the pointer and ONE package, never a town',async()=>{
    publish(buildDistrictPackage({regionId:'07339',name:'K',members},members.map(a=>packet(a)),'fp','now'));
    const c=await loadDistrictContent('07339',members,'2026-09-09');
    expect(c.prepared.state).toBe('current');
    expect(c.monitor.sites).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.every(([u])=>!/\d{8}\.json\.br$/.test(String(u)))).toBe(true);
  });
  it('names an older town edition instead of calling it current',async()=>{
    publish(buildDistrictPackage({regionId:'07339',name:'K',members},members.map(a=>packet(a,'2026-09-10')),'fp','now'));
    expect((await loadDistrictContent('07339',members,'2026-10-01')).prepared.state).toBe('older-edition');
    expect(preparedState(['2026-09-10'],'2026-09-09')).toBe('current');
  });
  it('shows no data — not stale totals — when membership changed or nothing is published',async()=>{
    expect((await loadDistrictContent('07339',members,'2026-09-09')).prepared).toEqual({state:'unavailable',reason:'not-published'});
    publish(buildDistrictPackage({regionId:'07339',name:'K',members},members.map(a=>packet(a)),'fp','now'));
    const c=await loadDistrictContent('07339',[...members,'07339003'],'2026-09-09');
    expect(c.prepared).toEqual({state:'unavailable',reason:'membership'});
    expect(c.monitor).toMatchObject({status:'unavailable',reason:'not-prepared',sites:null,energy:null});
    expect(c.stories).toEqual([]);
  });
  it('propagates storage failures instead of answering "unavailable"',async()=>{
    objects.set(DISTRICT_POINTER_PATH,new Error('down'));
    await expect(loadDistrictContent('07339',members,'2026-09-09')).rejects.toThrow('HTTP 503');
  });
});

describe('monitor totals summed on the server',()=>{
  it('yield the same year and segment totals as the raw municipality cells',()=>{
    const segs=['privat_dach','gewerbe_dach','steckersolar','freiflaeche','batterie_privat'];
    const raw=Array.from({length:233},(_,t)=>segs.flatMap((segment,si)=>Array.from({length:27},(_,y)=>({region_id:`07232${String(t).padStart(3,'0')}`,segment,year:2000+y,count:(t*7+si*3+y)%11,kwp:((t+1)*(si+2)*(y+3))%97/7,kwh:(t*si+y)%13/3})))).flat();
    const summed=districtSolarCells(raw);
    expect(summed.length).toBe(segs.length*27);
    const by=(rows:typeof raw,f:(r:typeof raw[number])=>string)=>{const m=new Map<string,{c:number;k:number;h:number}>();for(const r of rows){const x=m.get(f(r))??{c:0,k:0,h:0};x.c+=r.count;x.k+=r.kwp;x.h+=r.kwh;m.set(f(r),x);}return m;};
    for(const key of [(r:typeof raw[number])=>String(r.year),(r:typeof raw[number])=>r.segment,(r:typeof raw[number])=>`${r.year}|${r.segment}`]){
      const a=by(raw,key),b=by(summed,key);
      expect([...b.keys()].sort()).toEqual([...a.keys()].sort());
      for(const [k,v] of a){expect(b.get(k)!.c).toBe(v.c);expect(b.get(k)!.k).toBeCloseTo(v.k,6);expect(b.get(k)!.h).toBeCloseTo(v.h,6);}
    }
  });
});
