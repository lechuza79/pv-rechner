import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {parseWidgetAppearance,parseWidgetAppearanceObject,widgetPreviewSource} from '../widget-appearance';
import {allWidgets} from '../widget-registry';
import {WidgetPresentationProvider} from '../../components/dashboard/WidgetPresentationContext';
import {WindMicroCompass} from '../../components/charts/WindMicroCompass';
import {RankingPodiumWidget,type RankingPodiumData} from '../../components/gemeinde/GemeindeRankingWidget';

const podium:RankingPodiumData={place:'Testort',category:'count',title:'Zahl der Anlagen',unit:'Anlagen',scope:'Testkreis',stand:'2026-10-02',animate:true,rows:[{id:'a',name:'Alpha',rank:1,value:120,formatted:'120',own:false}]};

describe('Widget autoplay appearance',()=>{
 it('keeps omission distinct from true and false in URLs and live messages',()=>{
  expect(parseWidgetAppearance({autoplay:'on'}).autoplay).toBe(true);
  expect(parseWidgetAppearance({autoplay:'off'}).autoplay).toBe(false);
  for(const autoplay of [undefined,'invalid','false'])expect(parseWidgetAppearance({autoplay}).autoplay).toBeUndefined();
  expect(parseWidgetAppearanceObject({autoplay:false})?.autoplay).toBe(false);
  expect(parseWidgetAppearanceObject({autoplay:true})?.autoplay).toBe(true);
  expect(parseWidgetAppearanceObject({autoplay:'off'})?.autoplay).toBeUndefined();
  expect(parseWidgetAppearanceObject(null)).toBeUndefined();
  expect(parseWidgetAppearanceObject([])).toBeUndefined();
 });
 it('does not change iframe identity when autoplay changes',()=>{
  expect(widgetPreviewSource('/embed/galerie/gemeinde-solar-monat?ags=06440016&autoplay=on')).toBe(widgetPreviewSource('/embed/galerie/gemeinde-solar-monat?ags=06440016&autoplay=off'));
  expect(widgetPreviewSource('/embed/regional-race/06440?metric=kwp&autoplay=off')).toBe('/embed/regional-race/06440?metric=kwp');
 });
 it('offers autoplay only for wired animated widgets',()=>{
  expect(allWidgets().filter(w=>w.configuration?.autoplay).map(w=>w.id).sort()).toEqual(['gemeinde-ranking','gemeinde-solar-monat','heizkostenrennen','kommunen-landschaft','laender-strommix-pro-kopf','laender-strommixrennen','micro-wind','pv-kostenrennen','regional-map','regional-race','strommix-radar','welt-stromrennen','welt-zubaurennen']);
 });
 it('stops wind particles while retaining actual speed and direction',()=>{
  const render=(autoplay?:boolean)=>renderToStaticMarkup(<WidgetPresentationProvider appearance={{autoplay}}><WindMicroCompass speedMs={8} directionDeg={90}/></WidgetPresentationProvider>);
  const off=render(false),on=render(true);
  expect(off).toContain('data-wind-flow="still"');
  expect(off).toContain('transform:translateY(');
  expect(off).toContain('Wind aus O, 8 Meter pro Sekunde');
  expect(on).toContain('data-wind-flow="moving"');
  expect(render()).toContain('data-wind-flow="moving"');
  expect((off.match(/<rect /g)??[]).length).toBe((on.match(/<rect /g)??[]).length);
 });
 it('shows final podium values when autoplay is off and keeps the original default otherwise',()=>{
  const off=renderToStaticMarkup(<WidgetPresentationProvider appearance={{autoplay:false}}><RankingPodiumWidget data={podium}/></WidgetPresentationProvider>);
  expect(off).not.toContain('data-animate="true"');
  expect(off).toContain('>120<');
  const on=renderToStaticMarkup(<RankingPodiumWidget data={podium}/>);
  expect(on).toContain('data-animate="true"');
 });
 it('keeps monthly manual playback and deterministic export controls independent of autoplay',()=>{
  const source=readFileSync('components/gemeinde/MonitorMonthlySolarChart.tsx','utf8');
  expect(source).toContain('autoPlay={linkPlayback || (presentation.autoplay??autoPlay)}');
  expect(source).toContain("setLinkPlayback(query.get('autoplay')==='on')");
  expect(source).toContain('onClick={togglePlayback}');
  expect(source).toContain("command.mode==='seek'");
  expect(source).toContain("command.mode==='restore'");
  expect(source).toContain("command.mode==='describe'");
 });
});
