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
