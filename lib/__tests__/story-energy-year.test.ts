import {it,expect} from 'vitest';
import {energyYear,referenceWindFactor,type YearWeather} from '../story-energy-year';
import {appendAnnualEnergy} from '../story-monthly-candidate';
import {discoverStories} from '../story-discovery';
import {buildStoryPool} from '../story-pool';
import {conceptFromFinding} from '../story-finding-concept';
import {storyVisualTemplate} from '../story-approved-visual';
import data from '../story-energy-year-data.json';
const config={town:'Test',year:2025,solarKwp:0,windKw:1000,sourceDate:'2026-09-10',retrievedAt:'2026-09-16',sourceUrl:'source'};
const weather=(year=2025):YearWeather=>{const hours=(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/3600000;return {hourly:{time:Array.from({length:hours},(_,i)=>new Date(Date.UTC(year,0,1)+i*3600000).toISOString().slice(0,16)),temperature_2m:Array(hours).fill(20),shortwave_radiation:Array(hours).fill(0),wind_speed_100m:Array(hours).fill(12)}};};
it('bounds the reference curve including shutdown',()=>{expect(referenceWindFactor(2)).toBe(0);expect(referenceWindFactor(3)).toBe(0);expect(referenceWindFactor(12)).toBe(1);expect(referenceWindFactor(24)).toBe(1);expect(referenceWindFactor(25)).toBe(0);expect(()=>referenceWindFactor(-1)).toThrow();});
it('integrates hourly power exactly, including both DST dates',()=>{const result=energyYear(weather(),config);expect(result.days).toHaveLength(365);expect(result.days.every(d=>d.windMwh===24&&d.solarMwh===0)).toBe(true);expect(result.days.reduce((s,d)=>s+d.windMwh,0)).toBe(8760);});
it('supports leap years and rejects gaps, duplicates and null observations',()=>{expect(energyYear(weather(2024),{...config,year:2024}).days).toHaveLength(366);const w=weather();w.hourly.time[1]=w.hourly.time[0];expect(()=>energyYear(w,config)).toThrow();const missing=weather();missing.hourly.time.pop();expect(()=>energyYear(missing,config)).toThrow();const invalid=weather();invalid.hourly.wind_speed_100m[2]=null;expect(()=>energyYear(invalid,config)).toThrow();});
it('ships a full bounded Nidda reference year',()=>{expect(data.days).toHaveLength(365);expect(data.windKw).toBe(3600);expect(data.days.every(d=>d.solarMwh>=0&&d.windMwh>=0&&d.windMwh<=data.windKw/1000*24)).toBe(true);});

it('exposes the annual chart through the finished-template gallery',()=>{const report=discoverStories({name:'Nidda',regionId:'06440016',source:'export',sourceDate:'2026-09-10',completeExport:true,rows:[]});appendAnnualEnergy(report);const topic=buildStoryPool(report).topics[0];expect(topic).toBeDefined();expect(storyVisualTemplate(conceptFromFinding(report,topic))).toBe('energy-year');});
