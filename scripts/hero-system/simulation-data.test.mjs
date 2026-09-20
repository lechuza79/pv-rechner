import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../../public/homepage-study/simulation-data.js',import.meta.url),'utf8');
const load=()=>import('data:text/javascript;base64,'+Buffer.from(source+'\n// '+Math.random()).toString('base64'));
test('coalesces validation and submit, then reuses the successful result',async()=>{
 const original=globalThis.fetch;let calls=0;
 try{globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({pv:15924,combined:19138})};};
 const api=await load();const [a,b]=await Promise.all([api.retrospective('97204'),api.retrospective('97204')]);
 assert.deepEqual(a,b);assert.equal(calls,1);await api.retrospective('97204');assert.equal(calls,1);
 }finally{globalThis.fetch=original;}
});
test('automatically retries a transient failure once',async()=>{
 const original=globalThis.fetch;let calls=0;
 try{globalThis.fetch=async()=>++calls===1?{ok:false,status:503}:{ok:true,json:async()=>({pv:1,combined:2})};
 assert.deepEqual(await (await load()).retrospective('97204'),{pv:1,combined:2});assert.equal(calls,2);
 }finally{globalThis.fetch=original;}
});
test('missing and incomplete data are not cached or replaced with zero',async()=>{
 const original=globalThis.fetch;let calls=0;
 try{globalThis.fetch=async()=>{calls++;return calls===1?{ok:false,status:404}:{ok:true,json:async()=>({pv:null,combined:2})};};
 const api=await load();await assert.rejects(api.retrospective('97204'));assert.equal(calls,1);
 await assert.rejects(api.retrospective('97204'));assert.equal(calls,2);
 }finally{globalThis.fetch=original;}
});
