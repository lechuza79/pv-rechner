import {describe,expect,it} from 'vitest';
import {brotliDecompressSync} from 'node:zlib';
import type {GemeindePaket,MonitorObservation} from '../gemeinde-paket';
import {buildDistrictPackage,DISTRICT_POINTER_PATH,type DistrictManifest,type DistrictMembership} from '../district-package';
import {aggregateDistrictEnergy} from '../district-energy';
import {aggregateDistrictMonitor} from '../district-monitor';
import {buildRegionPackage,checkRegionPackage,partFromAggregate,partFromTown,regionsFromRegister} from '../region-package';
import {refreshDistricts,type DistrictStore} from '../district-package-publish';

const STAND='2026-09-10';
const ends=Array.from({length:25},(_,i)=>new Date(Date.UTC(2026,8-i,0)).toISOString().slice(0,10));
function town(ags:string,kwp:number,opts:{valuation?:string|null}={}):GemeindePaket{
  const obs:MonitorObservation[]=ends.map(end=>({end,solarCount:kwp,solarKwp:kwp*10,solarAdditions:1,batteryCount:1,batteryKwh:5,solarCounts:{privat_dach:kwp},solarMix:[{label:'Dach',value:kwp*10}]}));
  const days=Array.from({length:28},(_,i)=>({date:`2026-02-${String(i+1).padStart(2,'0')}`,mw:Array.from({length:24},(_,h)=>h===2?null:kwp),mwh:kwp*23}));
  return {ags,name:ags,registerStand:STAND,district:{peers:[],districtPeers:[]},stories:[],register:{own:{sums:{alle:{kwp}}}},
    monitorHistory:{method:'active-register-by-commissioning-date',observations:obs},
    monitorPeriods:{valuationAssumptionDate:opts.valuation===undefined?STAND:opts.valuation,privateSelfConsumption:0.3,weatherPoint:{latitude:50,longitude:10},
      monthly:[{month:'2026-02',solar:{month:'2026-02',town:ags,days,totalMwh:kwp*23*28,peakDay:'2026-02-01',peakMw:kwp,sourceDate:STAND,retrievedAt:STAND,sourceUrl:'https://example.com'} as never,value:{euro:kwp*100,feedInEuro:kwp*10,totalMwh:kwp,unitCount:kwp,approximateTariffCount:0,unknownModeCount:0,commercialSelfUseUnknownCount:0}}],annual:[]}} as unknown as GemeindePaket;
}
const districtOf=(id:string,towns:GemeindePaket[])=>buildDistrictPackage({regionId:id,name:id,members:towns.map(t=>t.ags)},towns,'fp','2026-09-26');
const flat=(towns:GemeindePaket[])=>{const s=towns.map(t=>({ags:t.ags,registerStand:t.registerStand,monitorHistory:t.monitorHistory,monitorPeriods:t.monitorPeriods}));return {monitor:aggregateDistrictMonitor(towns.map(t=>t.ags),s,STAND),energy:aggregateDistrictEnergy(towns.map(t=>t.ags),s,'x')};};

describe('Bundesland and Deutschland packages',()=>{
  const a=[town('15001001',1),town('15001002',2)],b=[town('15002001',4)],city=town('15003000',8);
  const state={regionId:'15',name:'Sachsen-Anhalt',level:'bundesland' as const,parts:[{id:'15001',kind:'district' as const},{id:'15002',kind:'district' as const},{id:'15003',kind:'town' as const,town:'15003000'}],excluded:[] as string[]};
  const parts=()=>[partFromAggregate('15001',districtOf('15001',a)),partFromAggregate('15002',districtOf('15002',b)),partFromTown('15003',city)];

  it('equals the flat sum over all towns: history, hourly energy, value',()=>{
    const pkg=buildRegionPackage(state,parts(),'fp','now');
    const want=flat([...a,...b,city]);
    const m=pkg.content.monitor;
    expect(m.status).toBe('ready');
    if(m.status!=='ready'||want.monitor.status!=='ready')throw new Error('unready');
    expect(m.history.observations).toEqual(want.monitor.history.observations);
    expect(m.history.observations[0].solarKwp).toBe(150);
    expect(m.energy!.monthly[0].solar.days[0].mw[12]).toBe(15);
    expect(m.energy!.monthly[0].solar.days[0].mw[2]).toBeNull(); // missing hour stays missing
    expect(m.energy!.monthly[0].value).toEqual(want.energy!.monthly[0].value);
    expect(m.energy!.monthly[0].value!.euro).toBe(1500);
    expect(m.energy!.valuationAssumptionDate).toBe(STAND);
    expect(m.sites).toBeNull();
    expect(pkg.editions).toEqual([STAND]);
  });

  it('Deutschland from states equals the flat sum too',()=>{
    const st=buildRegionPackage(state,parts(),'fp','now');
    const other=town('16001000',16);
    const st2=buildRegionPackage({regionId:'16',name:'T',level:'bundesland',parts:[{id:'16001',kind:'town',town:'16001000'}],excluded:[]},[partFromTown('16001',other)],'fp','now');
    const de=buildRegionPackage({regionId:'de',name:'Deutschland',level:'de',parts:[{id:'15',kind:'state'},{id:'16',kind:'state'}],excluded:[]},[partFromAggregate('15',st),partFromAggregate('16',st2)],'fp','now');
    const m=de.content.monitor;
    if(m.status!=='ready')throw new Error(m.reason);
    expect(m.history.observations[0].solarKwp).toBe(310);
    expect(m.energy!.monthly[0].value!.euro).toBe(3100);
  });

  it('an incomplete part makes the level unavailable, never a smaller total',()=>{
    const partial=buildDistrictPackage({regionId:'15001',name:'A',members:a.map(t=>t.ags)},[a[0],null],'fp','now');
    const pkg=buildRegionPackage(state,[partFromAggregate('15001',partial),partFromAggregate('15002',districtOf('15002',b)),partFromTown('15003',city)],'fp','now');
    expect(pkg.missing).toEqual(['15001']);
    expect(pkg.content.monitor.status).toBe('unavailable');
    expect(pkg.content.monitor.energy).toBeNull();
    expect(buildRegionPackage(state,[...parts().slice(0,2),partFromTown('15003',null)],'fp','now').content.monitor.status).toBe('unavailable');
  });

  it('keeps generation but drops money when a part has no common valuation basis',()=>{
    const mixed=districtOf('15001',[a[0],town('15001002',2,{valuation:'2026-08-01'})]);
    expect(mixed.content.monitor.energy!.valuationAssumptionDate).toBeNull();
    const pkg=buildRegionPackage(state,[partFromAggregate('15001',mixed),...parts().slice(1)],'fp','now');
    expect(pkg.content.monitor.energy!.monthly).toHaveLength(1);
    expect(pkg.content.monitor.energy!.monthly[0].value).toBeNull();
    expect(pkg.content.monitor.energy!.valuationAssumptionDate).toBeNull();
  });

  it('refuses a package whose child list differs from the page',()=>{
    const pkg=buildRegionPackage(state,parts(),'fp','now');
    expect(checkRegionPackage(pkg,'15',['15001','15002','15003']).ok).toBe(true);
    expect(checkRegionPackage(pkg,'15',['15001','15002'])).toEqual({ok:false,reason:'membership'});
    expect(checkRegionPackage(pkg,'16',['15001','15002','15003'])).toEqual({ok:false,reason:'region'});
  });

  it('children the page lists but the sum leaves out must be confirmed plant-free',()=>{
    const withGap={...state,excluded:['15009','15000999']};
    const ok=buildRegionPackage(withGap,parts(),'fp','now',new Set(['15009','15000999']));
    expect(ok.content.monitor.status).toBe('ready');
    expect(checkRegionPackage(ok,'15',['15001','15002','15003','15009','15000999']).ok).toBe(true);
    expect(checkRegionPackage(ok,'15',['15001','15002','15003'])).toEqual({ok:false,reason:'membership'});
    const open=buildRegionPackage(withGap,parts(),'fp','now',new Set(['15009']));
    expect(open.missing).toEqual(['15000999']);
    expect(open.content.monitor.status).toBe('unavailable');
    expect(partFromAggregate('15',open)).toBeNull();
  });

  it('reads Länder from the register: districts, kreisfreie Städte, retired Kreise left out',()=>{
    const row=(region_id:string,level:string,parent:string|null,bezeichnung:string|null=null)=>({region_id,name:region_id,level,parent_region_id:parent,bezeichnung});
    const rows=[row('de','de',null),row('15','bundesland','de'),row('15001','landkreis','15'),row('15001001','gemeinde','15001'),row('15001002','gemeinde','15001'),row('15003','landkreis','15','Kreisfreie Stadt'),row('15003000','gemeinde','15003','Kreisfreie Stadt'),row('15009','landkreis','15'),row('15000999','gemeinde','15','Gemeindefreies Gebiet')];
    const districts:DistrictMembership[]=[{regionId:'15001',name:'A',members:['15001001','15001002']}];
    const {regions,skipped}=regionsFromRegister(rows,districts);
    expect(regions.map(r=>r.regionId)).toEqual(['15','de']);
    expect(regions[0].parts).toEqual([{id:'15001',kind:'district'},{id:'15003',kind:'town',town:'15003000'}]);
    expect(regions[0].excluded).toEqual(['15000999','15009']);
    expect(regions[1].parts).toEqual([{id:'15',kind:'state'}]);
    expect(skipped.sort()).toEqual(['15000999','15009']);
  });
});

describe('register-confirmed empty towns',()=>{
  const empty={...town('01054039',0),monitorHistory:null,monitorPeriods:null,register:null} as unknown as GemeindePaket;
  const full=[town('01054001',1),town('01054002',2)];
  const d={regionId:'01054',name:'NF',members:['01054001','01054002','01054039']};
  it('add zero instead of blocking the district, and are listed',()=>{
    const pkg=buildDistrictPackage(d,[...full,empty],'fp','now',new Set(['01054039']));
    const want=flat(full);
    expect(pkg.empty).toEqual(['01054039']);
    expect(pkg.members).toEqual(d.members);
    if(pkg.content.monitor.status!=='ready'||want.monitor.status!=='ready')throw new Error('unready');
    expect(pkg.content.monitor.history).toEqual(want.monitor.history);
    expect(pkg.content.monitor.energy!.monthly[0].value).toEqual(want.energy!.monthly[0].value);
    expect(pkg.content.monitor.sites).toHaveLength(2);
  });
  it('without register confirmation the district stays unavailable',()=>{
    const pkg=buildDistrictPackage(d,[...full,empty],'fp','now');
    expect(pkg.empty).toBeUndefined();
    expect(pkg.content.monitor.status).toBe('unavailable');
  });
  it('a town with data is never dropped, whatever the register check says',()=>{
    const pkg=buildDistrictPackage(d,[...full,town('01054039',4)],'fp','now',new Set(['01054039']));
    expect(pkg.empty).toBeUndefined();
    if(pkg.content.monitor.status!=='ready')throw new Error('unready');
    expect(pkg.content.monitor.history.observations[0].solarKwp).toBe(70);
  });
});

describe('region packages in the district generation',()=>{
  const towns=new Map([...['15001001','15001002','15003000'].map(a=>[a,town(a,1)] as const)]);
  const D:DistrictMembership[]=[{regionId:'15001',name:'A',members:['15001001','15001002']}];
  const R=regionsFromRegister([
    {region_id:'de',name:'Deutschland',level:'de',parent_region_id:null,bezeichnung:null},
    {region_id:'15',name:'Sachsen-Anhalt',level:'bundesland',parent_region_id:'de',bezeichnung:null},
    {region_id:'15001',name:'A',level:'landkreis',parent_region_id:'15',bezeichnung:null},
    {region_id:'15001001',name:'x',level:'gemeinde',parent_region_id:'15001',bezeichnung:null},
    {region_id:'15001002',name:'y',level:'gemeinde',parent_region_id:'15001',bezeichnung:null},
    {region_id:'15003',name:'C',level:'landkreis',parent_region_id:'15',bezeichnung:'Kreisfreie Stadt'},
    {region_id:'15003000',name:'C',level:'gemeinde',parent_region_id:'15003',bezeichnung:'Kreisfreie Stadt'},
  ],D).regions;
  function memoryStore(){
    const files=new Map<string,Buffer>();
    const store:DistrictStore={
      async getBytes(p){return files.get(p)??null;},async getJson(p){const b=files.get(p);return b?JSON.parse(b.toString()):null;},
      async put(p,b){files.set(p,b);},async remove(ps){for(const p of ps)files.delete(p);},
      async list(prefix){const n=new Set<string>();for(const k of files.keys())if(k.startsWith(prefix+'/'))n.add(k.slice(prefix.length+1).split('/')[0]);return [...n];},
    };
    return {store,files,pointer:()=>JSON.parse(files.get(DISTRICT_POINTER_PATH)!.toString()) as DistrictManifest};
  }
  const lock={hold:async()=>true,release:async()=>{}};
  let t=0;const now=()=>new Date(Date.UTC(2026,8,26,0,0,t++));
  const tags=(x:Record<string,string>={})=>new Map([...[...towns.keys()].map(a=>[a,'e'+a] as [string,string]),...Object.entries(x)]);

  it('publishes Länder and Deutschland with the districts, then skips; a changed kreisfreie town rebuilds them',async()=>{
    const m=memoryStore();
    const readTown=async(a:string)=>towns.get(a)??null;
    const r=await refreshDistricts({store:m.store,readTown,districts:D,townTags:tags(),now,lock,regions:R});
    expect(r).toMatchObject({status:'veröffentlicht',regionsRebuilt:2});
    const p=m.pointer();
    expect(Object.keys(p.regions!)).toEqual(['15','de']);
    const st=JSON.parse(brotliDecompressSync(m.files.get(p.regions!['15'].path)!).toString());
    expect(st.content.monitor.status).toBe('ready');
    expect(st.content.monitor.history.observations[0].solarKwp).toBe(30);
    expect((await refreshDistricts({store:m.store,readTown,districts:D,townTags:tags(),now,lock,regions:R})).status).toBe('aktuell');
    const again=await refreshDistricts({store:m.store,readTown,districts:D,townTags:tags({'15003000':'neu'}),now,lock,regions:R});
    expect(again).toMatchObject({status:'veröffentlicht',rebuilt:0,regionsRebuilt:2});
    // The kept district's generation and the new region generation both survive cleanup.
    const q=m.pointer();
    expect(m.files.has(q.districts['15001'].path)).toBe(true);
    expect(m.files.has(q.regions!.de.path)).toBe(true);
  });
});
