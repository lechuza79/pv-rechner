import MetricValue from '../MetricValue';
import {activePowerSegments,powerBarScale} from '../../lib/segmented-power';
import './segmented-power-bars.css';
/** Segments encode power only. Both directions always share one labelled scale. */
export function SegmentedPowerBars({rows}:{rows:{id:string;label:string;value:number|null}[]}){
 const max=powerBarScale(rows.map(row=>row.value));
 return <div className="sc-power-bars" role="group" aria-label="Aktuelle Leistung, kein Füllstand">
 <div className="sc-power-bars-directions">{rows.map(row=>{const active=activePowerSegments(row.value,max,32);return <div key={row.id} data-direction={row.id==='charge'?'left':'right'}>
 <div className="sc-power-bars-value"><span>{row.label}</span><MetricValue value={row.value} unit="GW" maximumFractionDigits={2}/></div>
 <div className="sc-power-bars-track" aria-hidden="true">{Array.from({length:32},(_,i)=><span key={i} data-active={i<active} data-pulse={i===active-1&&active>0}/>)}</div>
 </div>;})}</div>
 <div className="sc-power-bars-scale" aria-hidden="true"><span>{max.toLocaleString('de-DE')} GW</span><span>0</span><span>{max.toLocaleString('de-DE')} GW</span></div>
 </div>;
}
