import {compareRanks,comparisonText} from './rank-comparison.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
async function main(){
 const source=process.env.STORY_SOURCE_ROOT??'/Users/eule/projects/pv-rechner/.worktrees/codex-kommunen-templates';
 const {rankingMonthRows,rankingDistinction}=await import(path.join(source,'lib/story-ranking-month.ts'));
 const {rankingRows,rankingKategorien}=await import(path.join(source,'lib/atlas-ranking.ts'));
 const {RANKING_FELDER}=await import(path.join(source,'lib/ranking-felder.ts'));
 const snapshots=JSON.parse(await readFile(path.join(source,'lib/story-ranking-month-data.json'),'utf8'));
 const snapshot=snapshots['09679147'];
 const temporal=compareRanks(snapshot.current,[snapshot.previous,snapshot.previousYear,...(snapshot.history??[])].filter(Boolean));
 const temporalByKey=new Map(temporal.map(row=>[row.key,row]));
 const temporalText=(row:any,kind:string)=>{const result=temporalByKey.get(row.key);return result?comparisonText(result,kind)??(result.comparisons[kind].status==='changed-basis'?'Vergleichsgruppe oder Berechnung geändert':'Kein gespeicherter Vergleichsstand'):'Kein gespeicherter Vergleichsstand';};
 const rows=rankingMonthRows(snapshot.current,snapshot.previous).sort((a:any,b:any)=>a.rank/a.size-b.rank/b.size);
 const statsPath=path.join(source,'scripts/.cache/story-ranking-month/sources/3a1bf9ee977d1a94c75b09e7a6890eed3278fd4fa03bed9ca5021972a81c7182.json');
 const stats=JSON.parse(await readFile(statsPath,'utf8'));
 const categories=new Map(rankingKategorien().map((category:any)=>[category.key,category]));
 const fields=new Map(RANKING_FELDER.map((field:any)=>[field.slug,field]));
 const unitFor=(format:string)=>({wattProKopf:'Wp / Einwohner',countPer1000:'Anlagen / 1.000 Einwohner',je100Dach:'je 100 Dächer',whProKopf:'Wh / Einwohner',pvLeistung:'kWp',mixLeistung:'kW',count:'Anlagen',speicherKwh:'kWh'} as Record<string,string>)[format]??'';
 const scopeIdFor=(scope:string)=>scope==='de'?null:scope;
 const fullSnapshots=rows.map((saved:any)=>{
  const [categoryKey,scope,fieldSlug]=saved.key.split(':');
  const category=categories.get(categoryKey);
  const field=fieldSlug==='all'?null:fields.get(fieldSlug);
  if(!category||fieldSlug!=='all'&&!field)throw new Error(`Ranking definition missing for ${saved.key}`);
  const computed=rankingRows(stats,category,scopeIdFor(scope),field,true);
  const own=computed.find((row:any)=>row.regionId==='09679147');
  const matches=Boolean(own&&own.platz===saved.rank&&computed.length===saved.size&&own.wert===saved.value);
  return {
   ...saved,distinction:saved.rank<=3?'Platz '+saved.rank:rankingDistinction(saved.rank,saved.size),
   unit:unitFor(category.format),asOf:snapshot.current.observedAt,
   comparisonMonth:temporalText(saved,'month'),comparisonYear:temporalText(saved,'year'),
   changePeriod:category.metricVorjahr?'Seit Jahresbeginn':null,
   ...(matches?{rows:computed.map((row:any)=>({id:row.regionId,name:row.name,rank:row.platz,value:row.wert,change:row.veraenderung}))}:{rowsUnavailableReason:'Die vollständige Liste dieses gespeicherten Datenstands liegt hier noch nicht vor.'}),
  };
 });
 const district=JSON.parse(await readFile('public/atlas-design-preview/ranking-data.json','utf8'));
 const peers=district.districtPeers.filter((r:any)=>r.population>=district.populationMin&&r.population<district.populationMaxExclusive);
 const metrics=[{label:'Zahl der Solaranlagen',value:(r:any,o:string)=>r.sums[o].count},{label:'Solarleistung je Einwohner',value:(r:any,o:string)=>1000*r.sums[o].kwp/r.population},{label:'Speicherkapazität je Einwohner',value:(r:any,o:string)=>1000*r.sums[o].speicher/r.population}];
 for(const [owner,label] of [['alle','alle Anlagen'],['privat','private Anlagen'],['gewerbe','gewerbliche Anlagen / Freiflächen']]){
  for(const metric of metrics){
   const mine=peers.find((r:any)=>r.region_id==='09679147');const value=metric.value(mine,owner);
   rows.push({label:metric.label+' · '+label,scope:'Landkreis Würzburg · Gemeinden und Kleinstädte (5.000–19.999 Einwohner)',rank:1+peers.filter((r:any)=>metric.value(r,owner)>value).length,size:peers.length,value,state:'initial',district:true,href:'/solar-atlas/bayern/landkreis-wuerzburg/hoechberg',asOf:district.dataAsOf});
  }
 }
 // A podium position remains meaningful even in a small comparison group.
 const distinction=(r:any)=>r.rank<=3?'Platz '+r.rank:rankingDistinction(r.rank,r.size);
 rows.sort((a:any,b:any)=>Number(b.rank<=3)-Number(a.rank<=3)||a.rank/a.size-b.rank/b.size);
 const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
 const nf=(n:number)=>n.toLocaleString('de-DE');
 const highlights=rows.filter((r:any)=>distinction(r));
 await writeFile('public/atlas-design-preview/ranking-discoveries.json',JSON.stringify(fullSnapshots.sort((a:any,b:any)=>Number(b.rank<=3)-Number(a.rank<=3)||a.rank/a.size-b.rank/b.size)));
 const table=rows.map((r:any)=>`<tr data-highlight="${Boolean(distinction(r))}"><td>${esc(r.label)}</td><td>${esc(r.scope)}</td><td>${nf(r.rank)} / ${nf(r.size)}</td><td>${esc(distinction(r)??'—')}</td><td>${esc(temporalText(r,'month'))}</td><td>${esc(temporalText(r,'year'))}</td><td>${r.href?`<a href="https://solar-check.io${esc(r.href)}" target="_blank" rel="noopener">Rangliste öffnen</a>`:'—'}</td></tr>`).join('');
 const html=`<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Höchberg · interne Rangübersicht</title><style>body{margin:0;background:#08191c;color:#e8eee9;font:16px/1.6 system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:32px 24px}h1{font-size:30px}p{max-width:800px;color:#b6c9be}a{color:inherit}button{font:inherit;border:1px solid #b6c9be66;border-radius:24px;padding:8px 18px;background:transparent;color:inherit;cursor:pointer}button[aria-pressed=true]{background:#d4ff24;color:#173b42}.table{overflow:auto;margin-top:24px}table{width:100%;border-collapse:collapse;min-width:850px}th,td{text-align:left;padding:14px;border-bottom:1px solid #b6c9be33;vertical-align:top}th{font-size:13px;color:#b6c9be}td:nth-child(3){white-space:nowrap}tr[data-highlight=true] td:nth-child(4){color:#d4ff24;font-weight:700}body.only-highlights tr[data-highlight=false]{display:none}</style><main><a href="/atlas-design-preview/index.html?displayfont=montserrat-bold#atlas-ranking">Zur Kommunenseite</a><h1>Höchbergs Rangpositionen</h1><p>Interne Konzeptübersicht: alle ${rows.length} verfügbaren Rangpositionen aus dem gespeicherten Monatsstand und den drei Landkreis-Kategorien für alle drei Anlagenbereiche, davon ${highlights.length} mit Auszeichnung. Zeitraum: ${esc(snapshot.current.month)} · erfasst: ${esc(snapshot.current.observedAt)}. Landkreis-Registerstand: ${esc(district.dataAsOf)}. Keine vollständige Liste aller denkbaren Kennzahlen oder aller teilnehmenden Orte.</p><p>Podest und weitere Auszeichnungen: Podestplätze 1–3 werden immer angezeigt. Ergänzend vorderste 10 %; „Top 3/10/25/50/100“ nur, wenn auch diese Grenze höchstens 10 % der Vergleichsgruppe umfasst. Mehrere Treffer können dieselbe Kennzahl in unterschiedlichen Vergleichsgruppen betreffen.</p><button id="filter" aria-pressed="false">Nur Auszeichnungen</button><div class="table"><table><thead><tr><th>Kennzahl</th><th>Vergleichsgruppe</th><th>Platz / Teilnehmer</th><th>Auszeichnung</th><th>Zum Vormonat</th><th>Zum Vorjahresmonat</th><th>Alle Orte</th></tr></thead><tbody>${table}</tbody></table></div></main><script>document.querySelector('#filter').onclick=function(){const on=this.getAttribute('aria-pressed')!=='true';this.setAttribute('aria-pressed',String(on));document.body.classList.toggle('only-highlights',on);};</script></html>`;
 if(process.env.WRITE_RANK_OVERVIEW==='1') await writeFile('public/atlas-design-preview/rank-overview.html',html);
 console.log(JSON.stringify({count:rows.length,highlights:highlights.map((r:any)=>({label:r.label,scope:r.scope,rank:r.rank,size:r.size,distinction:distinction(r)}))}));
}
main();
