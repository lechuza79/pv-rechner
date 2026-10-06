import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {microchartWind} from '../use-microcharts';
import {rotorSpeed} from '../wind-animation';
import type {MicrochartData} from '../microchart-data';
import {WeatherMicroTile} from '../../components/charts/WeatherMicroTile';

const at='2026-10-03T06:00:00.000Z';
const data:MicrochartData={place:'Landstuhl',postcode:'66849',at,until:'2026-10-03T22:00Z',modelRun:'2026-10-03T03:00Z',windHeightMetres:100,solar:null,wind:[{time:at,value:0}],conditions:{speedMs:2.97,directionDeg:62,validAt:at}};
it('uses the same timestamp and below-threshold wind for rotor and current power tile',()=>{
 const wind=microchartWind(data,Date.parse(at))!;
 expect(wind.validAt).toBe(data.wind![0].time);
 expect(wind.speedMs).toBe(data.conditions!.speedMs);
 expect(wind.heightMetres).toBe(100);
 expect(rotorSpeed(wind.speedMs,112)).toBe(0);
 const html=renderToStaticMarkup(<WeatherMicroTile kind="wind" validAt={wind.validAt} day={data.wind} chart={{speedMs:wind.speedMs,directionDeg:wind.directionDeg}}/>);
 expect(html).toContain('2,97');expect(html).toContain('0 <small>kW');
});
it('keeps a real above-threshold value moving and refuses expired animation data',()=>{
 const payload={...data,conditions:{...data.conditions!,speedMs:3.04}};
 const wind=microchartWind(payload,Date.parse(at))!;
 expect(rotorSpeed(wind.speedMs,112)).toBeGreaterThan(0);
 expect(microchartWind(payload,Date.parse(at)+16*60*1000)).toBeNull();
});
it('preserves explicit preview attribution without borrowing the solar model run',()=>{
 const wind=microchartWind({...data,windSource:'open-meteo-preview',windModelRun:null},Date.parse(at))!;
 expect(wind.modelRun).toBeNull();expect(wind.source).toBe('open-meteo');
 expect(wind.postcode).toBe('66849');
});
