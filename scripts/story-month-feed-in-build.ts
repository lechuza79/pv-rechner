import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {monthlyElectricityValue} from '../lib/story-month-value';
import values from '../lib/story-month-value-data.json';
const path='lib/story-month-feed-in-data.json';
const output:Record<string,Record<string,unknown>>=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{};
for(const id of process.argv.slice(2)){
 const input=JSON.parse(readFileSync(`scripts/.cache/story-radial/${id}-value-cells.json`,'utf8'));
 const snapshots=(values as Record<string,Record<string,{euro:number;totalMwh:number;valuationDate:string;month:string;sourceDate:string}>>)[id];
 if(!snapshots)throw Error('Missing paired valuation');
 for(const [month,snapshot] of Object.entries(snapshots)){
  if(snapshot.valuationDate!==input.retrievedAt.slice(0,10))throw Error('Mismatched stock snapshots');
  const result=monthlyElectricityValue(id,snapshot.totalMwh,input.rows);
  if(Math.abs(result.euro-snapshot.euro)>.01)throw Error('Valuation assumptions changed; a paired revision is required');
  output[id]??={};if(output[id][month])throw Error('Snapshot already exists');
  output[id][month]={...snapshot,euro:result.feedInEuro,breakdown:result.feedIn,model:'atlas-reference-feed-in-v1'};
  console.log(id,month,result.feedInEuro);
 }
}
writeFileSync(path,JSON.stringify(output,null,2)+'\n');
