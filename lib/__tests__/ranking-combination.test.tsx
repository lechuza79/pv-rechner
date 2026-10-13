import {describe,it,expect} from 'vitest';
import {municipalRankingCombination} from '../widget-ranking-combination';
import type {GemeindePaket} from '../gemeinde-paket';
import {renderToStaticMarkup} from 'react-dom/server';
import {RankingPodiumWidget,RankingWidgetCombination,RankingPodiumWithList,type RankingPodiumData} from '../../components/gemeinde/GemeindeRankingWidget';

const data:RankingPodiumData={place:'Delta',category:'count',title:'Zahl der Solaranlagen',unit:'Anlagen',scope:'Testkreis',stand:'2026-10-01',animate:false,
 rows:['Alpha','Beta','Gamma','Delta'].map((name,index)=>({id:name,name,rank:index+1,value:40-index*10,formatted:String(40-index*10),own:name==='Delta'}))};

describe('Standalone podium and ranking combination',()=>{
 it('preserves the three-place podium and adds the complete-list action only in the combination',()=>{
  const standalone=renderToStaticMarkup(<RankingPodiumWidget data={data}/>);
  const combination=renderToStaticMarkup(<RankingWidgetCombination categories={[{data}]} label="Deltas Platzierungen"/>);
  expect(standalone).not.toContain('Orte in dieser Kategorie ansehen');
  expect(combination).toContain('Deltas Platzierungen');
  expect(combination).toContain('Platzierungen durchblättern');
  expect(combination).toContain('ranking-footer');
  expect(combination).not.toContain('Orte in dieser Kategorie ansehen');
  expect(renderToStaticMarkup(<RankingPodiumWithList data={data}/>)).toContain('Alle 4 Orte in dieser Kategorie ansehen');
  for(const html of [standalone,combination]){
   expect(html.match(/data-podium-rank/g)).toHaveLength(3);
   expect(html.match(/<article/g)).toHaveLength(1);
   expect(html).toContain('Optionen für Zahl der Solaranlagen');
  }
 });
 it('keeps all category choices and opens the requested comparison',()=>{
  const other={...data,category:'power',title:'Solarleistung je Einwohner',unit:'Wp / Einwohner'};
  const html=renderToStaticMarkup(<RankingWidgetCombination categories={[{data},{data:other}]} initialCategory="power" label="Deltas Platzierungen"/>);
  expect(html).toContain('Optionen für Solarleistung');
  expect(html.match(/class="ranking-choice"/g)).toHaveLength(2);
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
  expect(html).toContain('Vorherige Platzierung');
 });
 it('does not offer an empty or unavailable ranking list',()=>{
  for(const missing of [{...data,rows:[]},{...data,missing:'No comparable data'}]){
   expect(renderToStaticMarkup(<RankingPodiumWithList data={missing}/>)).not.toContain('Orte in dieser Kategorie ansehen');
  }
 });
});

describe('Municipality comparison coverage',()=>{
 const packet={ags:'12063080',name:'Falkensee',kreis:{ags:'12063',name:'Havelland'},rangStand:'2026-10-01',
  register:{own:{population:45000}},district:{peers:[],rank:null},rankings:[{key:'balcony:12:all',label:'Balkonkraftwerke je 1.000 Einwohner',format:'countPer1000',scope:'Brandenburg',rank:3,distinction:'Platz 3',asOf:'2026-10-01'}]} as unknown as GemeindePaket;
 it('retains the remote per-resident comparison without enough local peers',()=>{
  const result=municipalRankingCombination(packet,{id:'12',name:'Brandenburg'});
  const power=result.categories.find(c=>c.data.category==='power')!;
  const query=new URL(power.rowsUrl!,'https://solar-check.io').searchParams;
  expect(power.data.scope).toBe('Brandenburg');
  expect(query.get('gebiet')).toBe('12');
  expect(query.get('klasse')).toBe('mittelgrosse-staedte');
  expect(query.get('voll')).toBe('1');
  expect(result.categories.some(c=>c.data.category==='count')).toBe(false);
  expect(result.categories.some(c=>c.data.category==='balcony:12:all')).toBe(true);
 });
 it('compares city states nationally rather than against themselves',()=>{
  const result=municipalRankingCombination({...packet,ags:'11000000',name:'Berlin'},{id:'11',name:'Berlin'});
  const power=result.categories.find(c=>c.data.category==='power')!;
  expect(power.data.scope).toBe('Deutschland');
  expect(new URL(power.rowsUrl!,'https://solar-check.io').searchParams.get('gebiet')).toBe('');
 });
});
