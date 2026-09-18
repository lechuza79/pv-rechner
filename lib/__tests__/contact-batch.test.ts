import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { runContactBatch, targetFilename, type BatchTarget } from "../../scripts/lib/contact-batch";
const targets: BatchTarget[] = ["a","b","c"].map(organization_id=>({dataset:"kommunen",organization_id,website:null}));
describe("full contact inventory",()=>{
  it("records failures and missing sites, resumes without repeating completed targets",async()=>{
    const directory=mkdtempSync(resolve(tmpdir(),"contact-batch-"));
    try {
      let calls=0;
      await runContactBatch({targets,directory,concurrency:2,run:async t=>{calls++; if(t.organization_id==='b') throw Error('blocked'); return {status:'missing-website'};}});
      expect(JSON.parse(readFileSync(resolve(directory,targetFilename(targets[1])),"utf8")).status).toBe('run-failed');
      await runContactBatch({targets,directory,concurrency:2,run:async()=>{calls++;return {status:'unexpected'};}});
      expect(calls).toBe(3);
    } finally {rmSync(directory,{recursive:true,force:true});}
  });
  it("rejects duplicate inventory and corrupt checkpoints",async()=>{
    const directory=mkdtempSync(resolve(tmpdir(),"contact-batch-"));
    try {
      const options={targets:[targets[0],targets[0]],directory,concurrency:1,run:async()=>({status:'found'})};
      await expect(runContactBatch(options)).rejects.toThrow('Duplicate');
      writeFileSync(resolve(directory,targetFilename(targets[0])),JSON.stringify({dataset:'presse',organization_id:'a',status:'found'}));
      await expect(runContactBatch({...options,targets:[targets[0]]})).rejects.toThrow('Invalid');
    } finally {rmSync(directory,{recursive:true,force:true});}
  });
  it("waits for active workers after a corrupt checkpoint before rejecting",async()=>{
    const directory=mkdtempSync(resolve(tmpdir(),"contact-batch-"));
    let finished=false; let calls=0;
    try {
      writeFileSync(resolve(directory,targetFilename(targets[1])),"broken json");
      await expect(runContactBatch({targets,directory,concurrency:2,run:async()=>{calls++; await new Promise(resolve=>setTimeout(resolve,20));finished=true;return {status:'found'};}})).rejects.toThrow();
      expect(finished).toBe(true); expect(calls).toBe(1);
    } finally {rmSync(directory,{recursive:true,force:true});}
  });
  it("serializes requests for shared hosts while keeping different hosts independent",async()=>{
    const directory=mkdtempSync(resolve(tmpdir(),"contact-batch-")); let active=0; let max=0;
    try {
      await runContactBatch({targets:targets.map(t=>({...t,website:'https://shared.de'})),directory,concurrency:3,run:async()=>{active++;max=Math.max(max,active);await new Promise(resolve=>setTimeout(resolve,5));active--;return {status:'found'};}});
      expect(max).toBe(1);
    } finally {rmSync(directory,{recursive:true,force:true});}
  });
});
