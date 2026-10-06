import React from 'react';
import {windPowerProfile} from '../microchart-power';
import {WeatherMicroTile} from '../../components/charts/WeatherMicroTile';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {SolarMicroRadial} from '../../components/charts/MonthlySolarRadial';
import {WindMicroCompass} from '../../components/charts/WindMicroCompass';
describe('microchart data semantics',()=>{
 it('shows a genuine zero below model cut-in, distinct from missing power',()=>{
  const time='2026-10-02T12:25:00Z';
  const day=windPowerProfile([{time,value:2}],24200,100);
  expect(day).toEqual([{time,value:0}]);
  const html=renderToStaticMarkup(<WeatherMicroTile kind="wind" validAt={time} day={day} chart={{speedMs:2,directionDeg:270}}/>);
  expect(html).toContain('Modellierte Leistung');expect(html).toContain('kW');expect(html).not.toContain('Höhenwind fehlt');
  expect(windPowerProfile([{time,value:4}],24200,100)?.[0].value).toBeGreaterThan(0);
  expect(windPowerProfile(null,24200,100)).toBeNull();
 });
 it('keeps the shared radial line thin under an inherited scene projection scale',()=>{
  const time='2026-10-02T12:25:00Z',html=renderToStaticMarkup(<SolarMicroRadial power kind="wind" points={[{time,value:100}]} size={80}/>);
  expect(html).toContain('calc(1px / var(--chart-projection-scale, 1))');
 });
 it('keeps calm distinct from missing wind',()=>{
  expect(renderToStaticMarkup(<WindMicroCompass speedMs={0} directionDeg={null}/>)).toContain('Windstille');
  expect(renderToStaticMarkup(<WindMicroCompass speedMs={0} directionDeg={null}/>)).toContain('data-wind-flow="still"');
  expect(renderToStaticMarkup(<WindMicroCompass speedMs={null} directionDeg={0}/>)).toContain('nicht verfügbar');
 });
 it('points south for wind from north',()=>{
  const html=renderToStaticMarkup(<WindMicroCompass speedMs={10} directionDeg={0} maxSpeedMs={20}/>);
  expect(html).toContain('rotate(180 56 56)');
  expect(html).toContain('aus N');
 });
 it('points north for wind from south and keeps a single north marker',()=>{
  const html=renderToStaticMarkup(<WindMicroCompass speedMs={10} directionDeg={180} maxSpeedMs={20}/>);
  expect(html).toContain('rotate(360 56 56)');
  expect(html).toContain('aus S');
  expect(html.match(/aria-label="Norden"/g)).toHaveLength(1);
 });
 it('shows real zero solar and rejects incomplete values',()=>{
  const points=[{time:'2026-10-01T00:00:00+02:00',value:0},{time:'2026-10-01T00:15:00+02:00',value:0}];
  expect(renderToStaticMarkup(<SolarMicroRadial points={points} currentTime={points[0].time}/>)).toContain('0 %');
  expect(renderToStaticMarkup(<SolarMicroRadial points={[...points,{time:'bad',value:NaN}]}/>)).toContain('nicht verfügbar');
 });
});
