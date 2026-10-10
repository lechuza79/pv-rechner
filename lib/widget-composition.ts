/** Layout plans are data. The same nested composition can be used by any host. */
export type CompositionPlan = {minWidth:number;columns:number;areas:string[][];rows:string[]};
export const COMPOSITION_GAP=24;
export const COMPOSITION_ROW=48;
export function gridExtent(span:number,unit=COMPOSITION_ROW,gap=COMPOSITION_GAP){return span*unit+(span-1)*gap;}
export function gridSpan(height:number,unit=COMPOSITION_ROW,gap=COMPOSITION_GAP){return Math.max(1,Math.ceil((height+gap)/(unit+gap)));}
export function selectCompositionPlan(plans:readonly CompositionPlan[],width:number){
 return [...plans].sort((a,b)=>b.minWidth-a.minWidth).find(plan=>width>=plan.minWidth)??plans[plans.length-1];
}
export function validateCompositionPlan(plan:CompositionPlan,ids:readonly string[]){
 if(plan.rows.length!==plan.areas.length||plan.areas.some(row=>row.length!==plan.columns))return false;
 const present=new Set(plan.areas.flat().filter(id=>id!=='.'));
 if(ids.some(id=>!present.has(id))||[...present].some(id=>!ids.includes(id)))return false;
 return [...present].every(id=>{
  const points=plan.areas.flatMap((row,y)=>row.flatMap((value,x)=>value===id?[{x,y}]:[]));
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
  return points.length===(Math.max(...xs)-Math.min(...xs)+1)*(Math.max(...ys)-Math.min(...ys)+1);
 });
}

/** Initial shared slot formats; chart contracts explicitly opt into compatible sizes. */
export const WIDGET_GRID_SIZES = {
  strip: {label: 'Flach · 12 × 3', columns: 12, rows: 3},
  small: {label: 'Klein · 4 × 5', columns: 4, rows: 5},
  medium: {label: 'Mittel · 6 × 7', columns: 6, rows: 7},
  portrait: {label: 'Hoch · 4 × 9', columns: 4, rows: 9},
  tall: {label: 'Groß · 6 × 9', columns: 6, rows: 9},
  list: {label: 'Liste · 6 × 11', columns: 6, rows: 11},
  wide: {label: 'Breit · 12 × 7', columns: 12, rows: 7},
  stage: {label: 'Bühne · 12 × 9', columns: 12, rows: 9},
} as const;
export type WidgetGridSize = keyof typeof WIDGET_GRID_SIZES;
