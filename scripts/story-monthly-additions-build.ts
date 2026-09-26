import {readFileSync,writeFileSync} from 'node:fs';
import {appendMonthlyAdditions} from '../lib/story-monthly-additions';
import type {SolarRow} from '../lib/story-discovery';
const root='scripts/.cache/story-discovery';
const index=JSON.parse(readFileSync(root+'/index.json','utf8'));
const input=JSON.parse(readFileSync('scripts/.cache/bnetza/story-history-2026-09-10/full.json','utf8'));
const byCity=new Map<string,SolarRow[]>();for(const row of input.rows){const rows=byCity.get(row.region_id)??[];rows.push(row);byCity.set(row.region_id,rows);}
let count=0;
for(const city of index){const path=root+'/'+city.regionId+'.json';const report=JSON.parse(readFileSync(path,'utf8'));if(report.sourceDate!==input.sourceDate)throw Error('Mismatched source edition');appendMonthlyAdditions(report,byCity.get(city.regionId)??[],true);if(report.candidates.some((c:{family:string})=>c.family==='Zubau-Monatsrecap'))count++;writeFileSync(path,JSON.stringify(report));city.total=report.candidates.length;}
writeFileSync(root+'/index.json',JSON.stringify(index));console.log({cities:index.length,monthlyRecaps:count});
