/** Read existing source tables into a local, replayable input bundle. No writes to production. */
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
const directory='scripts/.cache/story-inputs';mkdirSync(directory,{recursive:true});
const sources=[['mastr_regions','regions','region_id','gemeinde'],['funding_programs','funding-programmes','id'],['funding_history','funding-history','id'],['zensus_wohnungen','housing','region_id'],['social_funde','legacy-findings','kennung']];
const manifest={retrievedAt:new Date().toISOString(),tables:{}};
for(const [table,file,order,level] of sources){
 const rows=[];
 for(let offset=0;;offset+=1000){
  const url=new URL('/rest/v1/'+table,process.env.SUPABASE_URL);
  const params={select:'*',order:order+'.asc',offset:String(offset),limit:'1000',...(level?{level:'eq.'+level}:{})};
  for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);
  const response=await fetch(url,{headers:{apikey:process.env.SUPABASE_SERVICE_KEY,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_KEY}`}});
  if(!response.ok)throw new Error(`Source read failed (${table}, ${response.status})`);
  const page=await response.json();rows.push(...page);if(page.length<1000)break;
 }
 writeFileSync(`${directory}/${file}.json`,JSON.stringify(rows));manifest.tables[table]=rows.length;console.log(table,rows.length);
}
writeFileSync(`${directory}/manifest.json`,JSON.stringify(manifest,null,2));
