/** Read the current official stock snapshot without mutating the database. */
import {existsSync,mkdirSync,writeFileSync,renameSync} from 'node:fs';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
const headers={apikey:process.env.SUPABASE_SERVICE_KEY,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_KEY}`};
async function get(path){const r=await fetch(new URL('/rest/v1/'+path,process.env.SUPABASE_URL),{headers,signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Stock read failed: '+r.status);return r.json();}
const before=(await get('mastr_meta?select=imported_at&id=eq.1'))[0]?.imported_at;
if(!before)throw Error('Missing stock edition');
const rows=[];
for(let offset=0;;offset+=1000){const page=await get(`mastr_gemeinde_award?select=region_id,wind_kwp_ly,batterie_privat_count,batterie_privat_kwh&order=region_id.asc&offset=${offset}&limit=1000`);rows.push(...page);if(page.length<1000)break;}
const after=(await get('mastr_meta?select=imported_at&id=eq.1'))[0]?.imported_at;
if(before!==after)throw Error('Stock changed during read; retry the snapshot');
const number=v=>v==null?null:Number(v);
const data={sourceDate:before.slice(0,10),retrievedAt:new Date().toISOString(),stats:rows.map(r=>({regionId:r.region_id,windKwpLy:number(r.wind_kwp_ly),batteriePrivatCount:number(r.batterie_privat_count),batteriePrivatKwh:number(r.batterie_privat_kwh)}))};
mkdirSync('scripts/.cache/story-inputs',{recursive:true});const path='scripts/.cache/story-inputs/valuation-stock.json';writeFileSync(path+'.tmp',JSON.stringify(data));renameSync(path+'.tmp',path);console.log({cities:rows.length,sourceDate:data.sourceDate});
