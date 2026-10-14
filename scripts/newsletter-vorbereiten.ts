/** Prepare a reviewed newsletter from the same published regional packages as the website.
 * node --conditions react-server --import tsx scripts/newsletter-vorbereiten.ts --monat 2026-09 --ausgabe /private/tmp/newsletter.json --vorschau /private/tmp/newsletter-preview
 * This command never sends. The existing aussendung.ts sender rechecks eligibility and records every attempt.
 */
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {MAIN_CHECKOUT} from './lib/contact-v2-config';
const arg=(name:string)=>{const i=process.argv.indexOf('--'+name);return i<0?undefined:process.argv[i+1]};
async function main(){
 for(const line of readFileSync(join(MAIN_CHECKOUT,'.env.local'),'utf8').split('\n')){const m=line.match(/^([A-Z0-9_]+)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^["']|["']$/g,'');}
 const month=arg('monat'),output=arg('ausgabe'),preview=arg('vorschau');
 if(!month||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!output||!preview)throw Error('--monat, --ausgabe and --vorschau required');
 if(month!=='2026-09')throw Error('This reviewed newsletter edition is September 2026; approve the next edition before sending it');
 if(!process.env.CRON_SECRET)throw Error('Missing operator authentication');
 const {orteMitAbos,empfaengerFuerOrt}=await import('../lib/gemeinde-abo');
 const jobs:any[]=[],held:{regionId:string;reason:string}[]=[];
 const ids=await orteMitAbos();if(!ids.length)throw Error('No confirmed subscriptions returned; verify database availability');
 for(const regionId of ids){
  const subscribers=(await empfaengerFuerOrt(regionId)).filter(a=>a.quelle==='gemeinde');if(!subscribers.length)continue;
  let data;const prepared=[];
  for(const abo of subscribers){
   const r:Response=await fetch('https://solar-check.io/api/abo/versenden',{method:'POST',headers:{authorization:`Bearer ${process.env.CRON_SECRET}`,'content-type':'application/json'},body:JSON.stringify({aktion:'vorbereiten',id:abo.id,regionId,month}),signal:AbortSignal.timeout(60000)});
   if(!r.ok){held.push({regionId,reason:`Preparation refused: HTTP ${r.status}`});break;}
   const result:{region:import('../lib/newsletter-region').NewsletterRegion;abmeldeUrl:string;einstellungenUrl:string}=await r.json();
   if(result.region?.regionId!==regionId||result.region?.month!==month)throw Error('Wrong prepared region/month');
   data=result.region;prepared.push({...abo,links:{abmeldeUrl:result.abmeldeUrl,einstellungenUrl:result.einstellungenUrl}});
  }
  if(prepared.length===subscribers.length)jobs.push({region:data,subscribers:prepared});
 }
 if(held.length){console.error(JSON.stringify({held}));throw Error('Batch held: incomplete regions. No send file written');}
 const dir=mkdtempSync(join(tmpdir(),'newsletter-render-'));const input=join(dir,'input.json');
 try{writeFileSync(input,JSON.stringify(jobs),{mode:0o600});const env:NodeJS.ProcessEnv={...process.env,TSX_TSCONFIG_PATH:join(process.cwd(),'scripts/tsconfig.newsletter.json')};delete env.NODE_OPTIONS;execFileSync(process.execPath,['--import','tsx','scripts/newsletter-render.tsx',input,output,preview],{env,stdio:'inherit'});}finally{rmSync(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
