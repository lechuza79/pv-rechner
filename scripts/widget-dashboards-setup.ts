/** Use the existing privileged setup RPC; never require a new admin backdoor. */
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {createClient} from '@supabase/supabase-js';
import {envLaden} from './env-laden';
envLaden();
async function main() {
 const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_KEY;
 if(!url||!key)throw new Error('Missing database environment');
 const db=createClient(url,key,{auth:{persistSession:false}});
 if(process.argv.includes('--apply')){
  const sql=await readFile(new URL('./sql/widget-dashboards.sql',import.meta.url),'utf8');
  const {error}=await db.rpc('exec_sql',{sql});
  if(error)throw new Error(`Dashboard setup failed (${error.code})`);
 }
 let probe=await db.from('widget_dashboards').select('id').limit(1);
 // PostgREST refreshes its schema cache asynchronously after the migration.
 for(let attempt=0;probe.error?.code==='PGRST205'&&attempt<10;attempt++){
  await delay(500);
  probe=await db.from('widget_dashboards').select('id').limit(1);
 }
 if(probe.error)throw new Error(`Dashboard storage unavailable (${probe.error.code})`);
 const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!anonKey)throw new Error('Missing anonymous key for access verification');
 const anon=createClient(url,anonKey,{auth:{persistSession:false}});
 const denied=await anon.from('widget_dashboards').select('id').limit(1);
 if(denied.status!==401&&denied.status!==403)throw new Error('Anonymous table access was not denied');
 if(process.argv.includes('--verify-write')){
  const id=randomUUID(),configuration={version:1,sections:[{id:'probe',title:'Storage acceptance',root:{id:'trade',label:'Trade',widgetId:'stromhandel'}}],sources:{trade:'/embed/stromhandel?period=seven'}};
  const inserted=await db.from('widget_dashboards').insert({id,configuration});
  if(inserted.error)throw new Error(`Test write failed (${inserted.error.code})`);
  try{
   const loaded=await db.from('widget_dashboards').select('configuration').eq('id',id).single();
   if(loaded.error||loaded.data?.configuration?.sources?.trade!==configuration.sources.trade)throw new Error('Saved dashboard could not be reopened');
  }finally{
   // Remove only the disposable record created by this invocation.
   const removed=await db.from('widget_dashboards').delete().eq('id',id);
   if(removed.error)throw new Error('Disposable acceptance record could not be removed');
  }
 }
 console.log('Dashboard storage ready; anonymous access denied'+(process.argv.includes('--verify-write')?'; write/read verified and test record removed.':'.'));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
