import {it,expect} from 'vitest';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {targetFilename,type BatchTarget} from '../../scripts/lib/contact-batch';
it('reassesses frozen evidence without changing sources or inventing contacts',()=>{
 const root=mkdtempSync(join(tmpdir(),'contact-reassess-'));
 try {
  const input=join(root,'input'), output=join(root,'output');mkdirSync(join(input,'results'),{recursive:true});
  const target:BatchTarget={dataset:'kommunen',organization_id:'test',website:'https://example.de'};
  writeFileSync(join(input,'inventory.json'),JSON.stringify({engine:'frozen',targets:[target]}));
  const raw={...target,engine:'frozen',status:'found',candidates:[{email:'anna@example.de',sourceUrl:'https://example.de/kontakt',context:'Amtsblatt anna@example.de',relation:'same-domain',purpose:'unknown',roleEvidence:{text:'Amtsblatt anna@example.de',scope:'local-block',exclusiveAddress:true}}],quality:{contacts:[{email:'anna@example.de',suitability:'needs-review'}],gaps:['target-role-not-established']}};
  const file=join(input,'results',targetFilename(target));writeFileSync(file,JSON.stringify(raw));const before=readFileSync(file,'utf8');
  execFileSync(process.execPath,['--import','tsx','scripts/contact-reassess.ts',`--directory=${input}`,`--output=${output}`,'--as-of=2026-09-15'],{timeout:20000,stdio:'pipe'});
  expect(readFileSync(file,'utf8')).toBe(before);
  const result=JSON.parse(readFileSync(join(output,'results',targetFilename(target)),'utf8'));
  expect(result.quality.contacts.map((c:{email:string})=>c.email)).toEqual(['anna@example.de']);
  expect(result.quality.contacts[0].suitability).toBe('role-indicated');
  expect(result.quality.gaps).not.toContain('target-role-not-established');
  expect(JSON.parse(readFileSync(join(output,'summary.json'),'utf8')).completed).toBe(1);
  const reviews=join(root,'reviews.json');
  writeFileSync(reviews,JSON.stringify({holds:[{dataset:'kommunen',organization_id:'test',email:'anna@example.de',sourceUrls:['https://example.de/kontakt'],reason:'Unresolved project period',quote:'Project ended in 2021'}]}));
  const heldOutput=join(root,'held-output');
  execFileSync(process.execPath,['--import','tsx','scripts/contact-reassess.ts',`--directory=${input}`,`--output=${heldOutput}`,`--reviews=${reviews}`,'--as-of=2026-09-15'],{timeout:20000,stdio:'pipe'});
  const held=JSON.parse(readFileSync(join(heldOutput,'results',targetFilename(target)),'utf8'));
  expect(held.quality.contacts[0].suitability).toBe('needs-review');
  expect(held.appliedHolds).toHaveLength(1);
  expect(held.quality.status).toBe('review-required');
  expect(readFileSync(file,'utf8')).toBe(before);

 } finally {rmSync(root,{recursive:true,force:true});}
},25000);
