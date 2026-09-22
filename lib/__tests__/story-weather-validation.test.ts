import {it,expect} from 'vitest';
import {validateStoryWeather} from '../story-weather-validation';
const fixture=()=>({hourly:{time:Array.from({length:24},(_,i)=>`2026-08-01T${String(i).padStart(2,'0')}:00`),temperature_2m:Array(24).fill(20),shortwave_radiation:Array(24).fill(100),wind_speed_100m:Array(24).fill(5)},hourly_units:{wind_speed_100m:'m/s'}});
it('accepts complete explicit wind units',()=>{expect(()=>validateStoryWeather(fixture(),'2026-08-01','2026-08-01',true)).not.toThrow();});
it('rejects unavailable recent values before they become a permanent cache hit',()=>{const r=fixture();r.hourly.shortwave_radiation[23]=null;expect(()=>validateStoryWeather(r,'2026-08-01','2026-08-01',false)).toThrow();});
it('rejects duplicate hours and wrong wind units',()=>{const r=fixture();r.hourly.time[23]=r.hourly.time[22];expect(()=>validateStoryWeather(r,'2026-08-01','2026-08-01',false)).toThrow();const w=fixture();w.hourly_units.wind_speed_100m='km/h';expect(()=>validateStoryWeather(w,'2026-08-01','2026-08-01',true)).toThrow();});
