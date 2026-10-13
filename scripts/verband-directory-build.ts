import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseGv100} from '../lib/gemeindeverband';

// Usage: npx tsx scripts/verband-directory-build.ts <official GV100 text> <source URL>
const [file,source]=process.argv.slice(2);
if(!file||!source)throw new Error('Provide the official GV100 text and source URL');
const text=readFileSync(file,'utf8');
const dates=new Set(text.split(/\r?\n/).filter(line=>/^(50|60)/.test(line)).map(line=>line.slice(2,10)));
if(dates.size!==1)throw new Error('Expected one official publication date');
const date=[...dates][0];
const groups=new Map<string,{id:string;name:string;districtId:string;members:string[]}>();
for(const row of parseGv100(text).values()){
 if(row.verbandType!=='53')continue;
 if(!row.verbandName)throw new Error('Missing official association name');
 const group=groups.get(row.verbandKey)??{id:row.verbandKey,name:row.verbandName,districtId:row.verbandKey.slice(0,5),members:[]};
 if(!row.ags.startsWith(group.districtId))throw new Error('Cross-district association requires explicit review');
 group.members.push(row.ags);groups.set(group.id,group);
}
if(!groups.size)throw new Error('No associations found');
const output={asOf:`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`,source,sourceTextSha256:createHash('sha256').update(text).digest('hex'),groups:[...groups.values()].sort((a,b)=>a.id.localeCompare(b.id)).map(group=>({...group,members:group.members.sort()}))};
writeFileSync(new URL('../lib/verband-directory-data.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
console.log(`${groups.size} associations, ${output.groups.reduce((sum,g)=>sum+g.members.length,0)} municipalities`);
