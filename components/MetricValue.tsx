import "./metric-value.css";
/** A shared numeric hierarchy: primary value, quiet sign and unit. */
export default function MetricValue({value,unit="€",signed=false,maximumFractionDigits=0,stacked=false}:{value:number|null;unit?:string;signed?:boolean;maximumFractionDigits?:number;stacked?:boolean}) {
 return <span className="sc-metric-value" data-stacked={stacked||undefined}>{(value!==null && (signed || value<0)) && <span className="sc-metric-affix">{value!==null&&value<0?"−":"+"}</span>}<strong>{value===null?"–":Math.abs(value).toLocaleString("de-DE",{maximumFractionDigits})}</strong><span className="sc-metric-affix">{unit}</span></span>;
}
