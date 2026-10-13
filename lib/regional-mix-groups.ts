type Carrier = {label:string; value:number; color?:string; category:'renewable'|'fossil'|'other'|'nuclear'};
/** Preserve every known amount while providing the shared donut drilldown. */
export function regionalMixGroups(carriers:Carrier[]) {
 return ([['renewable','Erneuerbare'],['fossil','Fossile'],['other','Sonstige'],['nuclear','Kernenergie']] as const).flatMap(([category,label])=>{
  const children=carriers.filter(carrier=>carrier.category===category&&carrier.value>0).map(({label,value,color})=>({label,value,color}));
  const color=category==='renewable'?'var(--color-brand)':category==='fossil'?'var(--color-text-secondary)':category==='other'?'var(--color-text-faint)':'var(--color-text-muted)';
  return children.length?[{label,color,value:children.reduce((sum,child)=>sum+child.value,0),children}]:[];
 });
}
export function annualMixCategory(id:string):Carrier['category'] {
 return ['solar','wind','bio','water','offshore'].includes(id)?'renewable':['coal','gas'].includes(id)?'fossil':id==='nuclear'?'nuclear':'other';
}
export function hourlyMixCategory(carrier:{id:string;renewable:boolean}):Carrier['category'] {
 return carrier.renewable?'renewable':['Lignite','Hard coal','Gas','Other fossil'].includes(carrier.id)?'fossil':carrier.id==='Nuclear'?'nuclear':'other';
}
