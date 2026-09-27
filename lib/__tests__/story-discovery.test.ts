import {describe,it,expect} from 'vitest';
import {discoverStories,type DiscoveryInput,type SolarRow} from '../story-discovery';
const series=(count=10):SolarRow[]=>Array.from({length:81},(_,i)=>({region_id:'12345678',segment:'gebaeude',month:`${2020+Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}`,count,kwp:count*10}));
const input=(rows=series()):DiscoveryInput=>({name:'Teststadt',regionId:'12345678',sourceDate:'2026-09-10',source:'test-export',completeExport:true,rows});
describe('Auditable municipality discovery',()=>{
 it('does not force event stories from a flat series',()=>{const r=discoverStories(input());expect(r.candidates.filter(c=>c.family!=='Bestandsprofil'&&c.family!=='Vorjahreszeitraum')).toEqual([]);expect(r.candidates.some(c=>c.family==='Bestandsprofil')).toBe(true);expect(r.checks.some(c=>c.family==='Historische Rangänderung'&&c.status==='missing')).toBe(true);});
 it('blocks uncertain coverage, duplicate rows and absent provenance',()=>{for(const x of [{...input(),completeExport:false},{...input(),sourceDate:''},input([...series(),series()[0]])])expect(discoverStories(x).candidates).toEqual([]);});
 it('detects declines as well as growth',()=>{const rows=series().map(r=>r.month.startsWith('2025')?{...r,count:2,kwp:20}:r);const r=discoverStories(input(rows));expect(r.candidates.some(c=>c.title.includes('weniger'))).toBe(true);});
 it('ignores immature spikes in event comparisons',()=>{const rows=series().map(r=>r.month==='2026-08'?{...r,count:99999,kwp:999990}:r);const r=discoverStories(input(rows));expect(r.candidates.some(c=>c.family==='Monatsspitze')).toBe(false);expect(r.candidates.some(c=>c.evidence.some(e=>e.value===99999))).toBe(false);});
 it('retains independent statements for the same segment and year',()=>{const rows=series().map(r=>r.month==='2025-08'?{...r,count:1,kwp:20000}:r);const result=discoverStories(input(rows));const claims=result.candidates.filter(c=>c.eventKey==='gebaeude-2025');expect(claims.length).toBeGreaterThan(1);expect(claims.some(c=>c.status==='ready')).toBe(true);expect(claims.some(c=>c.family==='Großanlagen-Hinweis'&&c.status==='ready')).toBe(true);expect(new Set(result.candidates.map(c=>c.id)).size).toBe(result.candidates.length);});
 it('finds older annual changes instead of cutting them off after three years',()=>{const rows=series().map(r=>r.month.startsWith('2021')?{...r,count:30,kwp:300}:r);expect(discoverStories(input(rows)).candidates.some(c=>c.family==='Jahresveränderung'&&c.period==='2021')).toBe(true);});
 it('keeps seasonal comparisons tied to matching months',()=>{const rows=series().map(r=>({...r,count:r.month.endsWith('-05')?30:2}));const result=discoverStories(input(rows));expect(result.candidates.filter(c=>c.family==='Kalendermonatsvergleich')).toEqual([]);});
 it('never presents funding coincidence as automatically ready',()=>{const rows=series().map(r=>({...r,segment:'steckersolar',count:r.month==='2024-08'?150:10}));const r=discoverStories({...input(rows),funding:[{start:'2024-07',label:'Verified programme',url:'https://example.org/source'}]});const c=r.candidates.find(c=>c.family==='Förderkontext')!;expect(c.status).toBe('review');expect(c.limitations.join(' ')).toContain('keine gemessene Förderwirkung');});
 it('requires population provenance before a peer comparison is selected',()=>{const r=discoverStories({...input(),peer:{population:10000,median:100,n:20,minPopulation:5000,maxPopulation:20000}});const c=r.candidates.find(c=>c.family==='Ortsvergleich')!;expect(c.status).toBe('review');expect(c.limitations.join(' ')).toContain('Bezugsdatum');});
 it('does not call an immature previous year complete in January',()=>{const rows=series().filter(r=>r.month<='2026-01').map(r=>r.month.startsWith('2025')?{...r,count:200,kwp:2000}:r);const result=discoverStories({...input(rows),sourceDate:'2026-01-10'});expect(result.candidates.filter(c=>c.family==='Jahreshöchstwert'||c.family==='Jahresveränderung').some(c=>c.period==='2025')).toBe(false);});
 it('blocks future commissioning months',()=>{expect(discoverStories(input([...series(),{region_id:'12345678',segment:'gebaeude',month:'2027-01',count:1,kwp:10}])).candidates).toEqual([]);});
 it('is deterministic and independent of input row ordering',()=>{expect(discoverStories(input(series().reverse()))).toEqual(discoverStories(input()));});
});

it('retains a historic monthly maximum and a later local capacity peak',()=>{
 const rows=series().map(r=>r.month==='2020-08'?{...r,kwp:10000}:r.month==='2025-08'?{...r,kwp:2000}:r);
 const cs=discoverStories(input(rows)).candidates;
 expect(cs.some(c=>c.family==='Monatsspitze'&&c.period==='2020-08')).toBe(true);
 expect(cs.some(c=>c.family==='Lokale Monatsspitze'&&c.period==='2025-08'&&c.evidence[0].unit==='kWp')).toBe(true);
});
it('does not erase older commissioning records at an arbitrary year boundary',()=>{
 const rows=series().map(r=>({...r,month:r.month.replace(/^202/, '199')}));
 expect(discoverStories(input(rows)).candidates.some(c=>c.family==='Bestandsprofil')).toBe(true);
 const peaked=rows.map(r=>r.month==='1991-08'?{...r,count:200,kwp:2000}:r);
 expect(discoverStories(input(peaked)).candidates.some(c=>c.family==='Monatsspitze'&&c.period==='1991-08')).toBe(true);
});
it('does not manufacture local peaks in a steadily growing or seasonal series',()=>{
 for(const rows of [series().map((r,i)=>({...r,count:10+i,kwp:100+i*10})),series().map(r=>({...r,count:r.month.endsWith('-05')?50:10,kwp:r.month.endsWith('-05')?500:100}))]){
 expect(discoverStories(input(rows)).candidates.filter(c=>c.family==='Lokale Monatsspitze')).toEqual([]);
 }
});

it('counts zero months and zero years inside the complete export when defining coverage',()=>{
 const rows:SolarRow[]=[{region_id:'12345678',segment:'freiflaeche',month:'2010-01',count:1,kwp:50},{region_id:'12345678',segment:'freiflaeche',month:'2020-08',count:1,kwp:5000}];
 const cs=discoverStories(input(rows)).candidates;
 expect(cs.some(c=>c.family==='Monatsspitze'&&c.period==='2020-08')).toBe(true);
 expect(cs.some(c=>c.family==='Jahreshöchstwert'&&c.period==='2020')).toBe(true);
});

it('includes August provisionally and excludes September from matching-year totals',()=>{
 const rows=series().map(r=>({...r,count:r.month==='2026-08'?25:r.month==='2026-09'?9999:10}));
 const c=discoverStories(input(rows)).candidates.find(c=>c.family==='Vorjahreszeitraum')!;
 expect(c.period).toBe('2026-01 bis 2026-08');
 expect(c.evidence.map(e=>e.value)).toEqual([80,95]);
 expect(c.comparison).toContain('Januar bis August');
 expect(c.limitations.join(' ')).toContain('Vorläufig');
});
it('compares the immediately preceding year also in February',()=>{
 const rows=series().filter(r=>r.month<='2026-02');
 const c=discoverStories({...input(rows),sourceDate:'2026-02-10'}).candidates.find(c=>c.family==='Vorjahreszeitraum')!;
 expect(c.evidence.map(e=>e.label)).toEqual(['2025','2026']);
 expect(c.evidence.map(e=>e.value)).toEqual([10,10]);
});
