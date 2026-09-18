import { it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
it('runs the real history loader: restore even on bootstrap rerun, explicit first start, missing/corrupt history fails',()=>{
  const dir=mkdtempSync(join(tmpdir(),'health-storage-'));
  try {
    const artifact=join(dir,'archive'); mkdirSync(artifact);
    const prior={version:1,incidents:{a:{key:'a',text:'open',count:3,escalated:true,firstSeen:'2026-09-16T10:00:00Z',lastSeen:'2026-09-16T10:00:00Z'}}};
    const zip=join(dir,'state.zip');
    const pack=(value:unknown)=>{
      rmSync(zip,{force:true}); writeFileSync(join(artifact,'state.json'),JSON.stringify(value));
      execFileSync('zip',['-q',zip,'state.json'],{cwd:artifact});
    };
    pack(prior);
    writeFileSync(join(dir,'gh'),'#!/bin/sh\ncase "$2" in */zip) cat "$ARCHIVE";; *) printf "%s" "$ARTIFACTS";; esac\n',{mode:0o755});
    const run=(present:boolean,bootstrap:boolean)=>execFileSync(process.execPath,['--import',require.resolve('tsx'),resolve('scripts/health-history.ts'),...(bootstrap?['--bootstrap']:[])],{cwd:dir,env:{...process.env,PATH:`${dir}:${process.env.PATH}`,GITHUB_REPOSITORY:'example/test',ARCHIVE:zip,ARTIFACTS:JSON.stringify({artifacts:present?[{id:1,created_at:"2026-09-16T10:00:00Z",expired:false,workflow_run:{id:1,head_branch:'main',repository_id:1,head_repository_id:1}}]:[]})},stdio:'pipe'});
    run(true,true);
    expect(JSON.parse(readFileSync(join(dir,'.health/previous.json'),'utf8'))).toEqual(prior);
    expect(()=>run(false,false)).toThrow();
    run(false,true);
    expect(JSON.parse(readFileSync(join(dir,'.health/previous.json'),'utf8')).incidents).toEqual({});
    pack({version:2,incidents:{}});
    expect(()=>run(true,true)).toThrow();
  } finally {rmSync(dir,{recursive:true,force:true});}
},20000);

import { selectHistory } from '../../scripts/health-history';
it('uses upload time, not artifact IDs: GitHub can allocate a lower ID to a later report', () => {
  const artifact = (id: number, created_at: string) => ({ id, created_at, expired: false, workflow_run: { id, head_branch: 'main', repository_id: 1, head_repository_id: 1 } });
  expect(selectHistory([
    artifact(10457502180, '2026-09-16T16:28:14Z'),
    artifact(10457487500, '2026-09-16T16:30:48Z'),
  ])?.id).toBe(10457487500);
});
