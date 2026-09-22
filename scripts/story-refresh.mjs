/** Repeatable local preparation after a new official archive; no publication step. */
import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,readdirSync,writeFileSync,mkdirSync} from 'node:fs';
const run=(cmd,args)=>{const result=spawnSync(cmd,args,{stdio:'inherit'});if(result.status!==0)throw Error('Preparation failed: '+cmd+' '+args[0]);};
const node=(file,args=[])=>run(process.execPath,['--import','tsx',file,...args]);
const archive=readdirSync('scripts/.cache/bnetza').filter(f=>/^Gesamtdatenexport_\d{8}.*\.zip$/.test(f)).sort().at(-1);
const cachedDate=readdirSync('scripts/.cache/bnetza').filter(f=>/^story-history-\d{4}-\d{2}-\d{2}$/.test(f)).sort().at(-1)?.slice(14);
const date=archive?archive.match(/_(\d{4})(\d{2})(\d{2})/).slice(1).join('-'):cachedDate;
if(!date)throw Error('Download the official archive first through the existing MaStR refresh');
const root='scripts/.cache/bnetza/story-history-'+date;
run(process.execPath,['scripts/story-source-inputs.mjs']);
run(process.execPath,['scripts/story-stock-input.mjs']);
if(!existsSync(root+'/full.json'))run('python3',['scripts/story-history-local.py']);
if(!existsSync(root+'/detail-coverage.json'))run('python3',['scripts/story-register-detail.py']);
if(!existsSync(root+'/sizes.json'))run('python3',['scripts/story-detail-summaries.py']);
node('scripts/story-discovery-run.ts',['--cities=all','--directory=scripts/.cache/story-discovery']);
const unitMarker='scripts/.cache/story-radial/units-complete-'+date+'.json';
if(!existsSync(unitMarker)){run('python3',['scripts/story-value-units.py','--all']);mkdirSync('scripts/.cache/story-radial',{recursive:true});writeFileSync(unitMarker,JSON.stringify({sourceDate:date,completedAt:new Date().toISOString()}));}
const stock=JSON.parse(readFileSync('scripts/.cache/story-inputs/valuation-stock.json','utf8'));
node('scripts/story-prepare.ts',['--cities=all','--stock=scripts/.cache/story-inputs/valuation-stock.json','--stock-date='+stock.sourceDate,...process.argv.includes('--fetch')?['--fetch']:[]]);
node('scripts/story-prepared-seeds.ts');
node('scripts/story-content-audit.ts');
node('scripts/story-prepared-verify.ts');
