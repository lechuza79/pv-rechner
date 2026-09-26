/** Display roles belong to widgets; the dashboard owns placement and comparison. */
export type WidgetKind = 'number' | 'donut' | 'radial' | 'bar-comparison' | 'composition' | 'time-series' | 'map';
export const WIDGET_COLUMNS: Record<WidgetKind, 1 | 2 | 3> = {
  number: 1, donut: 1, radial: 1, 'bar-comparison': 1,
  composition: 2, 'time-series': 2, map: 3,
};
export type ComparisonPeriod = 'year' | 'month';
export type Observation = {
  start?: string;
  end: string;
  value: number;
  /** Dataset, inclusion rules and denominator must match across observations. */
  basis: string;
};
export type KpiDefinition = {
  id: string;
  label: string;
  unit?: string;
  digits?: number;
  kind: 'stock' | 'period-total';
  cadence?: 'day' | 'month-end';
  current: Observation;
  history: Observation[];
};
export type Comparison =
  | { status: 'available'; delta: number; percent: number | null; reference: Observation }
  | { status: 'missing' | 'incompatible' | 'not-applicable' };

/** Shift a calendar date, clamping leap days and short months. */
export function referenceDate(iso: string, period: ComparisonPeriod, steps = 1): string {
  const [year, month, day] = iso.split('-').map(Number);
  const first = new Date(Date.UTC(year - (period === 'year' ? steps : 0), month - 1 - (period === 'month' ? steps : 0), 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day, lastDay));
  return first.toISOString().slice(0, 10);
}
function referenceEnd(kpi: KpiDefinition, period: ComparisonPeriod, steps = 1): string {
  const shifted = referenceDate(kpi.current.end, period, steps);
  if (kpi.cadence !== 'month-end') return shifted;
  const [year, month] = shifted.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0,10);
}
export function compareKpi(kpi: KpiDefinition, period: ComparisonPeriod): Comparison {
  // Year-to-date totals cannot be compared to a moving previous-month total.
  if (kpi.kind === 'period-total' && period === 'month') return { status: 'not-applicable' };
  const end = referenceEnd(kpi, period);
  const start = kpi.current.start ? referenceDate(kpi.current.start, period) : undefined;
  const reference = kpi.history.find(row => row.end === end && row.start === start);
  if (!reference) return { status: 'missing' };
  if (reference.basis !== kpi.current.basis || !Number.isFinite(reference.value) || !Number.isFinite(kpi.current.value)) return { status: 'incompatible' };
  const delta = kpi.current.value - reference.value;
  return { status: 'available', delta, percent: reference.value === 0 ? null : delta / reference.value * 100, reference };
}

/** A twelve-month sparkline requires every matching observation; gaps are not interpolated. */
export function kpiTrend(kpi: KpiDefinition): Observation[] {
  if (kpi.kind !== 'stock') return [];
  const result = [kpi.current];
  let end = kpi.current.end;
  for (let index = 0; index < 11; index++) {
    end = referenceEnd(kpi, 'month', index + 1);
    const observation = kpi.history.find(row => row.end === end && row.basis === kpi.current.basis && !row.start && Number.isFinite(row.value));
    if (!observation) return [];
    result.unshift(observation);
  }
  return result;
}

/** Derive individual completed months from matching year-to-date observations. */
export function kpiMonthlyAdditions(kpi: KpiDefinition): Observation[] {
  if (kpi.kind !== 'period-total' || !kpi.current.start || kpi.cadence !== 'month-end') return [];
  const rows = [kpi.current, ...kpi.history].filter(row => row.start === kpi.current.start && row.basis === kpi.current.basis && row.end <= kpi.current.end).sort((a,b)=>a.end.localeCompare(b.end));
  const count = Number(kpi.current.end.slice(5,7));
  if (rows.length !== count) return [];
  return rows.map((row,index)=>({...row,value:row.value-(rows[index-1]?.value??0)})).filter((row,index)=>Number(row.end.slice(5,7))===index+1 && Number.isFinite(row.value)).length===count
    ? rows.map((row,index)=>({...row,value:row.value-(rows[index-1]?.value??0)})) : [];
}

function yearToDateRows(kpi: KpiDefinition, year: number): Observation[] {
 const start = `${year}-01-01`;
 const rows = [...new Map([kpi.current, ...kpi.history].filter(row => row.start === start && row.basis === kpi.current.basis && row.end.slice(0, 4) === String(year) && row.end <= kpi.current.end).map(row => [row.end, row] as const)).values()].sort((a,b)=>a.end.localeCompare(b.end));
 const lastMonth = year === Number(kpi.current.end.slice(0, 4)) ? Number(kpi.current.end.slice(5, 7)) : rows.length;
 if (rows.length !== lastMonth || rows.some((row, index) => Number(row.end.slice(5, 7)) !== index + 1 || !Number.isFinite(row.value))) return [];
 return rows.map((row,index) => ({...row, value: row.value - (rows[index - 1]?.value ?? 0)}));
}

/** One window drives both plotted months and delta reference. */
export function kpiWindow(kpi:KpiDefinition,months:number):{bars:Observation[];value:number;comparison:Comparison}{
 if (kpi.kind === 'period-total') {
  const year = Number(kpi.current.end.slice(0, 4));
  const current = yearToDateRows(kpi, year);
  const previousEnd=kpi.history.find(row=>row.end===referenceEnd(kpi,'year')&&row.basis===kpi.current.basis);
  if(!previousEnd)return {bars:current,value:kpi.current.value,comparison:{status:'missing'}};
  const previous = yearToDateRows({...kpi,current:previousEnd}, year-1);
  if (!current.length || !previous.length) return {bars:[], value:kpi.current.value, comparison:{status:'missing'}};
  const currentValue = current.reduce((sum,row)=>sum + row.value, 0);
  const referenceValue = previous.reduce((sum,row)=>sum + row.value, 0);
  const reference = {...previous[previous.length - 1], value: referenceValue};
  const delta = currentValue - referenceValue;
  return {bars:current, value:currentValue, comparison:{status:'available',delta,percent:referenceValue === 0 ? null : delta / referenceValue * 100,reference}};
 }
 const rows=[kpi.current,...kpi.history];
 const at=(steps:number)=>rows.find(row=>row.end===referenceEnd(kpi,'month',steps)&&row.basis===kpi.current.basis);
 const monthly=(steps:number)=>{
  const row=at(steps);if(!row)return undefined;
  if(kpi.kind==='stock'){
   const previous=at(steps+1)?.value;
   return previous===undefined?undefined:{...row,value:row.value-previous};
  }
  const previous=row.end.slice(5,7)==='01'?0:at(steps+1)?.value;
  return previous===undefined?undefined:{...row,value:row.value-previous};
 };
 const current=Array.from({length:months},(_,i)=>monthly(i)).reverse();
 if(current.some(row=>!row||!Number.isFinite(row.value)))return{bars:[],value:kpi.current.value,comparison:{status:'missing'}};
 const bars=current as Observation[];
 const value=kpi.current.value;
 let reference=at(months);
 if(!reference)return{bars,value,comparison:{status:'missing'}};
 const delta=value-reference.value;
 return{bars,value,comparison:{status:'available',delta,percent:reference.value===0?null:delta/reference.value*100,reference}};
}
