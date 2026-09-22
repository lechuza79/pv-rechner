/** Keep a local preparation run alive across provider windows without more user input. */
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync,unlinkSync} from 'node:fs';
const root='scripts/.cache/story-prepared';mkdirSync(root,{recursive:true});
const lock=root+'/resume.lock';const fd=openSync(lock,'wx');closeSync(fd);
const args=process.argv.slice(2);
const run=file=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--import','tsx',file,...file.endsWith('story-prepare.ts')?args:[]],{stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(file+' exited '+code)));});
try{
 for(;;){
  await run('scripts/story-prepare.ts');
  await run('scripts/story-prepared-seeds.ts');
  await run('scripts/story-content-audit.ts');
  await run('scripts/story-prepared-verify.ts');
  const result=JSON.parse(readFileSync(root+'/latest-run.json','utf8'));
  if(!result.rateLimited){writeFileSync(root+'/resume-state.json',JSON.stringify({status:'finished',...result}));break;}
  const next=new Date();
  if(/daily|day limit/i.test(result.limitReason??'')){next.setUTCHours(24,1,0,0);}else{next.setUTCHours(next.getUTCHours()+1,1,0,0);}
  writeFileSync(root+'/resume-state.json',JSON.stringify({status:'waiting-for-provider',resumeAt:next.toISOString(),...result}));
  console.log('Provider window: continuing automatically at '+next.toISOString());
  while(Date.now()<next.getTime())await new Promise(resolve=>setTimeout(resolve,Math.min(60000,next.getTime()-Date.now())));
 }
}finally{unlinkSync(lock);}
