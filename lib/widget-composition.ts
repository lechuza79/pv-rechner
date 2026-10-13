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
  strip: {label: 'Flach', columns: 12, rows: 3},
  small: {label: 'Klein', columns: 4, rows: 5},
  medium: {label: 'Mittel', columns: 6, rows: 7},
  portrait: {label: 'Hoch', columns: 4, rows: 9},
  tall: {label: 'Groß', columns: 6, rows: 9},
  list: {label: 'Liste', columns: 6, rows: 11},
  wide: {label: 'Breit', columns: 12, rows: 7},
  stage: {label: 'Bühne', columns: 12, rows: 9},
  full: {label: 'Großflächig', columns: 12, rows: 11},
} as const;
export type WidgetGridSize = keyof typeof WIDGET_GRID_SIZES;

/** Layout constraints reference renderer contracts; they are not another widget catalog. */
export type CompositionItem = {
  id: string;
  /** Share of spare space after all child minima have been satisfied. */
  grow?: number;
} & ({
  kind: 'chart';
  minWidth: number;
  minHeight: number;
  heightBreakpoints?: readonly {maxWidth: number; minHeight: number}[];
  sizing: 'allocated' | 'content';
  preferredHeight?: {fraction: number; max: number};
} | {
  kind: 'group';
  direction: 'row' | 'column' | 'grid';
  /** Maximum columns; narrower containers reduce this from the child constraints. */
  columns?: number;
  children: readonly CompositionItem[];
});

export type CompositionAllocation = {
  id: string;
  width: number;
  /** Undefined means intrinsic height, including any content-sized descendants. */
  height?: number;
  direction?: 'row' | 'column';
  children?: CompositionAllocation[];
};

/** Content minima propagate through nested groups without changing catalog defaults. */
export function withMeasuredMinimumHeights(item:CompositionItem,minimums:Readonly<Record<string,number>>):CompositionItem {
  return item.kind==='group'
    ? {...item,children:item.children.map(child=>withMeasuredMinimumHeights(child,minimums))}
    : {...item,minHeight:Math.max(item.minHeight,minimums[item.id]??0)};
}

/** Width needed to keep this group's intended arrangement, including nested groups. */
export function compositionRowWidth(item: CompositionItem): number {
  if (item.kind === 'chart') return item.minWidth;
  const widths = item.children.map(compositionRowWidth);
  return item.direction === 'row'
    ? widths.reduce((sum, value) => sum + value, 0) + COMPOSITION_GAP * (widths.length - 1)
    : Math.max(0, ...widths);
}

/** Minimum supported width after every responsive group has stacked. */
export function compositionMinWidth(item: CompositionItem): number {
  return item.kind === 'chart' ? item.minWidth : Math.max(0, ...item.children.map(compositionMinWidth));
}

/**
 * Resolve allocation before rendering. Heights never come from card aspect ratios.
 * The host supplies a stable height budget; do not feed iframe content reports back
 * into it. Natural-height children stay intrinsic and never stretch adjacent charts.
 */
export function resolveComposition(
  item: CompositionItem, width: number, heightBudget: number, allocatedHeight?: number,
): CompositionAllocation {
  if (!Number.isFinite(width) || width <= 0) throw new RangeError('Composition width must be positive');
  // Minimum widths decide when siblings stack. A narrower host still renders
  // one column at its real width; resizing must never crash the entire page.
  if (item.kind === 'chart') {
    const preferred = item.preferredHeight;
    return {id: item.id, width, height: item.sizing === 'content' ? undefined : Math.max(
      item.minHeight, ...(item.heightBreakpoints??[]).filter(rule=>width<=rule.maxWidth).map(rule=>rule.minHeight),
      allocatedHeight ?? (preferred ? Math.min(preferred.max, heightBudget * preferred.fraction) : item.minHeight),
    )};
  }
  if (item.direction === 'grid') {
    const cellWidth = Math.max(1, ...item.children.map(compositionRowWidth));
    const columns = Math.max(1, Math.min(item.columns ?? 3, Math.floor((width + COMPOSITION_GAP) / (cellWidth + COMPOSITION_GAP))));
    const rows = Array.from({length: Math.ceil(item.children.length / columns)}, (_, index): CompositionItem => ({
      id: `${item.id}:row:${index}`, kind: 'group', direction: 'row', children: item.children.slice(index * columns, (index + 1) * columns),
    }));
    return resolveComposition({...item, direction:'column', children:rows}, width, heightBudget, allocatedHeight);
  }
  const direction = item.direction === 'row' && width >= compositionRowWidth(item) ? 'row' : 'column';
  const gaps = COMPOSITION_GAP * Math.max(0, item.children.length - 1);
  const minimumWidths = item.children.map(compositionRowWidth);
  const spareWidth = Math.max(0, width - gaps - minimumWidths.reduce((sum, value) => sum + value, 0));
  const totalGrow = item.children.reduce((sum, child) => sum + (child.grow ?? 1), 0);
  const widths = item.children.map((child, index) => direction === 'row'
    ? minimumWidths[index] + spareWidth * (totalGrow ? (child.grow ?? 1) / totalGrow : 1 / item.children.length)
    : width);
  let children = item.children.map((child, index) => resolveComposition(child, widths[index], heightBudget));
  const intrinsic = children.some(child => child.height === undefined);
  if (intrinsic) return {id: item.id, width, direction, children};
  const preferredHeight = direction === 'row'
    ? Math.max(0, ...children.map(child => child.height!))
    : children.reduce((sum, child) => sum + child.height!, gaps);
  const height = Math.max(preferredHeight, allocatedHeight ?? 0);
  children = item.children.map((child, index) => resolveComposition(child, widths[index], heightBudget,
    direction === 'row' ? height : children[index].height! + (height - preferredHeight) *
      (totalGrow ? (child.grow ?? 1) / totalGrow : 1 / item.children.length)));
  return {id: item.id, width, height, direction, children};
}
