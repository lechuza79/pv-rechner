/** Cross-check independent generation and valuation totals across the prepared estate. */
import {readFileSync,readdirSync} from 'node:fs';
import type {PreparedStoryData} from '../lib/story-prepared-data';
const root='scripts/.cache/story-prepared';let cities=0,monthly=0,annual=0,values=0;
const finite=(value:number)=>{if(!Number.isFinite(value)||value<0)throw Error('Invalid prepared measure');};
const close=(a:number,b:number)=>{if(Math.abs(a-b)>Math.max(.001,Math.abs(a)*.00001))throw Error('Conflicting generation totals');};
for(const edition of readdirSync(root).filter(f=>/^\d{4}-\d{2}-\d{2}$/.test(f)))for(const file of readdirSync(root+'/'+edition).filter(f=>f.endsWith('.json'))){
 const d=JSON.parse(readFileSync(root+'/'+edition+'/'+file,'utf8')) as PreparedStoryData;
 if(d.sourceDate!==edition)throw Error('Mixed source edition');cities++;
 if(d.monthly){monthly++;finite(d.monthly.totalMwh);close(d.monthly.days.reduce((s,x)=>s+x.mwh,0),d.monthly.totalMwh);if(d.monthly.days.some(x=>x.mw.length!==24))throw Error('Invalid radial clock');}
 if(d.annual){annual++;if(d.annual.days.length!==((Date.UTC(d.annual.year+1,0,1)-Date.UTC(d.annual.year,0,1))/86400000))throw Error('Incomplete year');for(const day of d.annual.days){finite(day.solarMwh);finite(day.windMwh);}}
 for(const v of Object.values(d.values??{})){values++;finite(v.euro);finite(v.feedInEuro);if(v.feedInEuro>v.euro+.001)throw Error('Remuneration exceeds complete electricity value');if(d.monthly?.month===v.month)close(v.totalMwh,d.monthly.totalMwh);}
}
console.log({cities,monthly,annual,values,checks:'all passed'});
