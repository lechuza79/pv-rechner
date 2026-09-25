import {describe,expect,it} from 'vitest';
import {brotliDecompressSync} from 'node:zlib';
import type {GemeindePaket} from '../gemeinde-paket';
import {GEMEINDE_PAKET_VERSION} from '../gemeinde-paket';
import {DISTRICT_PACKAGE_VERSION,DISTRICT_PACKAGE_PREFIX,DISTRICT_POINTER_PATH,type DistrictManifest,type DistrictMembership} from '../district-package';
import {refreshDistricts,type DistrictStore} from '../district-package-publish';

const packet=(ags:string,stand='2026-09-10')=>({ags,name:ags,registerStand:stand,district:{peers:[],districtPeers:[]},stories:[],register:{own:{sums:{alle:{kwp:1}}}},monitorHistory:null,monitorPeriods:null}) as unknown as GemeindePaket;
const D:DistrictMembership[]=[
  {regionId:'01001',name:'A',members:['01001001','01001002']},
  {regionId:'01002',name:'B',members:['01002001','01002002','01002003']},
];
const tags=(extra:Record<string,string>={})=>new Map([...D.flatMap(d=>d.members.map(a=>[a,'e'+a] as [string,string])),...Object.entries(extra)]);

function memoryStore(opts:{failPut?:(p:string)=>boolean;onPointerRead?:()=>void}={}){
  const files=new Map<string,Buffer>();
  let pointerReads=0;
  const store:DistrictStore={
    async getBytes(p){return files.get(p)??null;},
    async getJson(p){if(p===DISTRICT_POINTER_PATH){pointerReads++;if(pointerReads>1)opts.onPointerRead?.();}const b=files.get(p);return b?JSON.parse(b.toString()):null;},
    async put(p,b){if(opts.failPut?.(p))throw new Error('storage write failed: '+p);files.set(p,b);},
    async list(prefix){const names=new Set<string>();for(const k of files.keys())if(k.startsWith(prefix+'/'))names.add(k.slice(prefix.length+1).split('/')[0]);return [...names];},
    async remove(ps){for(const p of ps)files.delete(p);},
  };
  const pointer=()=>{const b=files.get(DISTRICT_POINTER_PATH);return b?JSON.parse(b.toString()) as DistrictManifest:null;};
  return {store,files,pointer};
}
let clock=0;
const now=()=>new Date(Date.UTC(2026,8,25,0,0,clock++));
const readAll=async(ags:string)=>packet(ags);

describe('district generations',()=>{
  it('publishes a complete generation and skips everything when nothing changed',async()=>{
    const m=memoryStore();
    const r=await refreshDistricts({store:m.store,readTown:readAll,districts:D,townTags:tags(),now});
    expect(r.status).toBe('veröffentlicht');
    expect(Object.keys(m.pointer()!.districts)).toEqual(['01001','01002']);
    const pkg=JSON.parse(brotliDecompressSync(m.files.get(m.pointer()!.districts['01002'].path)!).toString());
    expect(pkg.members).toEqual(D[1].members);
    let reads=0;
    const again=await refreshDistricts({store:m.store,readTown:async a=>{reads++;return packet(a);},districts:D,townTags:tags(),now});
    expect(again.status).toBe('aktuell');
    expect(reads).toBe(0);
  });

  it('rebuilds only the district whose town package changed, and removes superseded generations',async()=>{
    const m=memoryStore();
    await refreshDistricts({store:m.store,readTown:readAll,districts:D,townTags:tags(),now});
    const first=m.pointer()!;
    const read:string[]=[];
    const r=await refreshDistricts({store:m.store,readTown:async a=>{read.push(a);return packet(a);},districts:D,townTags:tags({'01002002':'changed'}),now});
    expect(r).toMatchObject({status:'veröffentlicht',rebuilt:1,kept:1});
    expect(read.sort()).toEqual(D[1].members);
    const second=m.pointer()!;
    expect(second.districts['01001']).toEqual(first.districts['01001']);
    expect(second.previousGeneration).toBe(first.generation);
    await refreshDistricts({store:m.store,readTown:readAll,districts:D,townTags:tags(),now});
    // Three generations written; only those referenced by the current and previous pointer remain.
    const gens=await m.store.list(DISTRICT_PACKAGE_PREFIX);
    expect(gens.filter(g=>g!=='aktuell.json').length).toBeLessThanOrEqual(3);
    for(const e of Object.values(m.pointer()!.districts))expect(m.files.has(e.path)).toBe(true);
  });

  it('keeps the last valid generation when a write fails midway, and recovers on the next run',async()=>{
    const m=memoryStore();
    await refreshDistricts({store:m.store,readTown:readAll,districts:D,townTags:tags(),now});
    const before=m.pointer()!;
    const broken=memoryStore({failPut:p=>p.endsWith('01002.json.br')});
    for(const [k,v] of m.files)broken.files.set(k,v);
    await expect(refreshDistricts({store:broken.store,readTown:readAll,districts:D,townTags:tags({'01001001':'x','01002001':'y'}),now})).rejects.toThrow('storage write failed');
    expect(broken.pointer()).toEqual(before);
    const fixed=memoryStore();for(const [k,v] of broken.files)fixed.files.set(k,v);
    const r=await refreshDistricts({store:fixed.store,readTown:readAll,districts:D,townTags:tags({'01001001':'x','01002001':'y'}),now});
    expect(r).toMatchObject({status:'veröffentlicht',rebuilt:2});
  });

  it('aborts on a failed town read instead of treating it as a missing town',async()=>{
    const m=memoryStore();
    await expect(refreshDistricts({store:m.store,readTown:async a=>{if(a==='01002002')throw new Error('HTTP 503');return packet(a);},districts:D,townTags:tags(),now})).rejects.toThrow('HTTP 503');
    expect(m.pointer()).toBeNull();
  });

  it('aborts when a whole district or too many towns are missing (systemic fault)',async()=>{
    const m=memoryStore();
    await expect(refreshDistricts({store:m.store,readTown:async a=>a.startsWith('01002')?null:packet(a),districts:D,townTags:tags(),now})).rejects.toThrow('kein einziges');
    await expect(refreshDistricts({store:m.store,readTown:async a=>a==='01002003'?null:packet(a),districts:D,townTags:tags(),now})).rejects.toThrow('fehlen');
    expect(m.pointer()).toBeNull();
  });

  it('publishes an honest district with one missing town among many (monitor unavailable, no partial sites)',async()=>{
    const big:DistrictMembership[]=[{regionId:'09999',name:'Gross',members:Array.from({length:60},(_,i)=>`09999${String(i).padStart(3,'0')}`)}];
    const m=memoryStore();
    await refreshDistricts({store:m.store,readTown:async a=>a==='09999000'?null:packet(a),districts:big,townTags:new Map(big[0].members.map(a=>[a,'e'])),now});
    const pkg=JSON.parse(brotliDecompressSync(m.files.get(m.pointer()!.districts['09999'].path)!).toString());
    expect(pkg.missing).toEqual(['09999000']);
    expect(pkg.content.monitor.sites).toBeNull();
  });

  it('rebuilds a district whose register membership changed and drops a district that left the register',async()=>{
    const m=memoryStore();
    await refreshDistricts({store:m.store,readTown:readAll,districts:D,townTags:tags(),now});
    const merged:DistrictMembership[]=[{regionId:'01002',name:'B',members:['01002001','01002002']}];
    const r=await refreshDistricts({store:m.store,readTown:readAll,districts:merged,townTags:tags(),now});
    expect(r).toMatchObject({status:'veröffentlicht',rebuilt:1,kept:0,dropped:['01001']});
    expect(Object.keys(m.pointer()!.districts)).toEqual(['01002']);
  });

  it('rebuilds a district whose published object disappeared',async()=>{
    const m=memoryStore();
    await refreshDistricts({store:m.store,readTown:readAll,districts:D,townTags:tags(),now});
    m.files.delete(m.pointer()!.districts['01001'].path);
    const r=await refreshDistricts({store:m.store,readTown:readAll,districts:D,townTags:tags(),now,dryRun:true});
    expect(r).toMatchObject({status:'plan',rebuild:[{id:'01001',why:'fehlt'}]});
  });

  it('never overwrites a pointer another run moved meanwhile',async()=>{
    const m=memoryStore({onPointerRead:()=>m.files.set(DISTRICT_POINTER_PATH,Buffer.from(JSON.stringify({version:DISTRICT_PACKAGE_VERSION,townPackageVersion:GEMEINDE_PAKET_VERSION,generation:'other',districts:{}})))});
    await expect(refreshDistricts({store:m.store,readTown:readAll,districts:D,townTags:tags(),now})).rejects.toThrow('anderer Lauf');
    expect(m.pointer()!.generation).toBe('other');
  });

  it('computes in the page order and aborts when that order names other towns',async()=>{
    const m=memoryStore();
    const seen:string[]=[];
    await refreshDistricts({store:m.store,readTown:async a=>{seen.push(a);return packet(a);},districts:[D[1]],townTags:tags(),now,concurrency:1,orderMembers:async()=>['01002003','01002001','01002002']});
    expect(seen).toEqual(['01002003','01002001','01002002']);
    const pkg=JSON.parse(brotliDecompressSync(m.files.get(m.pointer()!.districts['01002'].path)!).toString());
    expect(pkg.members).toEqual(D[1].members); // stored sorted for the membership check
    await expect(refreshDistricts({store:memoryStore().store,readTown:readAll,districts:[D[1]],townTags:tags(),now,orderMembers:async()=>['01002001','01002002']})).rejects.toThrow('andere Gemeinden');
  });

  it('rebuilds everything once when the register import changes (member order may have moved)',async()=>{
    const m=memoryStore();
    await refreshDistricts({store:m.store,readTown:readAll,districts:D,townTags:tags(),now,registerEdition:'a'});
    expect((await refreshDistricts({store:m.store,readTown:readAll,districts:D,townTags:tags(),now,registerEdition:'a'})).status).toBe('aktuell');
    expect(await refreshDistricts({store:m.store,readTown:readAll,districts:D,townTags:tags(),now,registerEdition:'b'})).toMatchObject({status:'veröffentlicht',rebuilt:2});
  });
});
