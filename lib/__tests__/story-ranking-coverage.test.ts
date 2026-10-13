import {it,expect} from 'vitest';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {atlasRankMonth} from '../story-ranking-atlas';
import {rankingHighlights,rankingMonthRows} from '../story-ranking-month';
import data from '../story-ranking-month-data.json';
import type {GemeindeStats} from '../awards';
it('checks every bundled municipality and preserves exact filtered ranking links',()=>{
 for(const [id,edition] of Object.entries(data)){
  const selected=rankingHighlights(rankingMonthRows(edition.current));
  console.log(id,`${selected.length}/${edition.current.ranks.length} notable ranks`);
  for(const rank of edition.current.ranks){expect(rank.href).toMatch(/^\/solar-atlas\/ranking\/.+#rangliste$/);expect(rank.href).not.toContain('undefined');}
  for(const row of selected)expect(row.rank===1||row.rank/row.size<=0.1).toBe(true);
 }
});
it.runIf(existsSync('scripts/.cache/story-ranking-month/sources'))('checks actual national data across population sizes and wind municipalities',()=>{
 const root='scripts/.cache/story-ranking-month/sources';
 const files=readdirSync(root).filter(f=>f.endsWith('.json'));
 const raw=JSON.parse(readFileSync(`${root}/${files[0]}`,'utf8'));
 const stats=(Array.isArray(raw)?raw:raw.stats) as GemeindeStats[];
 const sorted=[...stats].sort((a,b)=>a.population-b.population);
 const sample=[...Array.from({length:10},(_,i)=>sorted[Math.floor(i*(sorted.length-1)/9)]),...stats.filter(s=>s.windKwp>0).slice(0,3)];
 for(const city of sample){
  const snapshot=atlasRankMonth(stats,city.regionId,'2026-09-09','Landkreis');
  const selected=rankingHighlights(rankingMonthRows(snapshot));
  console.log(city.name,city.population,`${selected.length}/${snapshot.ranks.length}`);
  for(const rank of selected){expect(rank.size).toBeGreaterThanOrEqual(3);expect(rank.rank===1||rank.rank/rank.size<=0.1).toBe(true);}
 }
},60000);
it('the shared ranking cache never answers for another data set',()=>{
 const town=(n:number):GemeindeStats=>({regionId:`010010${String(n).padStart(2,'0')}`,name:`Ort ${n}`,bezeichnung:'Gemeinde',population:1000+n*37,privatDachKwp:50+n*3,gewerbeDachKwp:10,freiflaecheKwp:0,balkonCount:5+n,balkonKwp:4+n,batteriePrivatKwh:20+n,batterieGewerbeKwh:0,windKwp:0,biomasseKwp:0,wasserKwp:0,solarZubauKwp:5+n});
 const many=Array.from({length:40},(_,n)=>town(n+1));
 const id=many[10].regionId;
 const first=atlasRankMonth(many,id,'2026-09-09','Landkreis');
 expect(first.ranks.length).toBeGreaterThan(0);
 // Same data again: the cached answer equals the first one.
 expect(atlasRankMonth(many,id,'2026-09-09','Landkreis')).toEqual(first);
 // Fewer towns: every ranking must be rebuilt, so every size shrinks.
 const fewer=many.slice(0,20);
 const second=atlasRankMonth(fewer,id,'2026-09-09','Landkreis');
 expect(second.ranks.length).toBe(first.ranks.length);
 second.ranks.forEach((rank,i)=>expect(rank.size).toBeLessThan(first.ranks[i].size));
});
