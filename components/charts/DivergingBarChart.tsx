import MetricValue from '../MetricValue';
import './diverging-bar-chart.css';
export type DivergingBarRow={id:string;label:string;left:number;right:number};
/** One symmetric magnitude scale for every category and direction. */
export function DivergingBarChart({rows,unit='GW',leftLabel='Import',rightLabel='Export',totals}:{rows:DivergingBarRow[];unit?:string;leftLabel?:string;rightLabel?:string;totals?:{left:number|null;right:number|null}}){
 const maximum=Math.max(.1,totals?.left??0,totals?.right??0,...rows.flatMap(row=>[row.left,row.right]));
 const max=Math.ceil(maximum*10)/10;
 const format=(value:number)=>value>0&&value<.001?'< 0,001':value.toLocaleString('de-DE',{maximumFractionDigits:3});
 return <div className="sc-diverging" role="group" aria-label={`${leftLabel} und ${rightLabel} nach Kategorie in ${unit}`}>
 <div className="sc-diverging-directions"><span>{leftLabel}</span><span>{rightLabel}</span></div>
 {rows.map((row)=><div className="sc-diverging-row" key={row.id} aria-label={`${row.label}: ${leftLabel} ${format(row.left)} ${unit}, ${rightLabel} ${format(row.right)} ${unit}`}>
 <div className="sc-diverging-label"><span className="sc-diverging-number">{format(row.left)}</span><span>{row.label}</span><span className="sc-diverging-number">{format(row.right)}</span></div>
 <div className="sc-diverging-track" aria-hidden="true" >
 <div className="sc-diverging-left"><i style={{width:`${row.left/max*100}%`}}/></div><div className="sc-diverging-right"><i style={{width:`${row.right/max*100}%`}}/></div>
 </div></div>)}
 {totals&&<div className="sc-diverging-total" role="group" aria-label={`Gesamt: ${leftLabel} ${totals.left===null?'nicht verfügbar':format(totals.left)+' '+unit}, ${rightLabel} ${totals.right===null?'nicht verfügbar':format(totals.right)+' '+unit}`}>
 <div className="sc-diverging-totals"><MetricValue value={totals.left} unit={unit} maximumFractionDigits={2}/><span className="sc-diverging-total-label">Gesamt</span><MetricValue value={totals.right} unit={unit} maximumFractionDigits={2}/></div>
 <div className="sc-diverging-track" aria-hidden="true"><div className="sc-diverging-left">{totals.left!==null&&<i style={{width:`${totals.left/max*100}%`}}/>}</div><div className="sc-diverging-right">{totals.right!==null&&<i style={{width:`${totals.right/max*100}%`}}/>}</div></div>
 </div>}

 </div>;
}
