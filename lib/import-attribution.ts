/** Same proportional attribution for nuclear imports and the complete import mix.
 * Pumped-storage discharge remains a separate output category in the supplier mix.
 * Never treat consumption, load or border flows as generation.
 */
export function generationContributions(data: Record<string, number | string | null>) {
 return Object.entries(data).filter((entry): entry is [string, number] =>
  typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] > 0 &&
  !['load','share','cross_border','consumption'].some(part => entry[0].includes(part)));
}
export function attributeImport(flowGw:number, data:Record<string,number|string|null>) {
 const entries=generationContributions(data);
 const total=entries.reduce((sum,[,value])=>sum+value,0);
 return total>0?Object.fromEntries(entries.map(([key,value])=>[key,flowGw*value/total])):null;
}
