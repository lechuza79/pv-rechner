/** Physical border flows are GW, positive into Germany. Never count the sum twice. */
export const GERMAN_FLOW_BORDERS=['austria','belgium','czech_republic','denmark','france','luxembourg','netherlands','norway','poland','sweden','switzerland'];
export type PhysicalFlowSnapshot={ts:string;importGw:number;exportGw:number};
export function latestPhysicalFlows(rows:{ts:string;data:Record<string,string|number|null>}[]):PhysicalFlowSnapshot|null{
 for(const row of [...rows].sort((a,b)=>Date.parse(b.ts)-Date.parse(a.ts))){
  if(!GERMAN_FLOW_BORDERS.every(key=>typeof row.data[key]==='number'&&Number.isFinite(row.data[key])))continue;
  const values=GERMAN_FLOW_BORDERS.map(key=>row.data[key] as number);
  return {ts:row.ts,importGw:values.reduce((sum,n)=>sum+Math.max(0,n),0),exportGw:values.reduce((sum,n)=>sum+Math.max(0,-n),0)};
 }
 return null;
}
