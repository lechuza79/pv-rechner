import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const hash=(data:string|Buffer)=>createHash('sha256').update(data).digest('hex');
export function contactFindingsIndex(directory:string){
 const index=new Map<string,string[]>(),root=resolve(directory,'contextual/municipality-findings');
 if(existsSync(root))for(const f of readdirSync(root).filter(f=>f.endsWith('.json')).sort()){const p=resolve(root,f),d=JSON.parse(readFileSync(p,'utf8'));index.set(d.organization_id,[...(index.get(d.organization_id)??[]),p]);}
 return index;
}
export function contactStateDigest(directory:string,workflow:string,target:{dataset:string;organization_id:string;audit:{inputPath:string}},findings:string[]=[]){
 const filename=hash(target.dataset+':'+target.organization_id)+'.json',obs=resolve(directory,'supplemental',target.organization_id,'observations');
 const paths=[target.audit.inputPath,resolve(directory,'results',filename),resolve(workflow,'decisions',filename),resolve(workflow,'cases',filename),resolve(directory,'reviews',filename),...findings,resolve(workflow,'refresh-holds',filename),...(existsSync(obs)?readdirSync(obs).filter(f=>f.endsWith('.json')).sort().map(f=>resolve(obs,f)):[])];
 return hash(JSON.stringify(paths.map(p=>[p,existsSync(p)?hash(readFileSync(p)):null])));
}
