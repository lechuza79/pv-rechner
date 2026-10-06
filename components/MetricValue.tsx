import "./metric-value.css";
/** A shared numeric hierarchy: primary value, quiet sign and unit. */
export default function MetricValue({value,unit="€",signed=false,maximumFractionDigits=0}:{value:number;unit?:string;signed?:boolean;maximumFractionDigits?:number}) {
 return <span className="sc-metric-value">{(signed || value<0) && <span className="sc-metric-affix">{value<0?"−":"+"}</span>}<strong>{Math.abs(value).toLocaleString("de-DE",{maximumFractionDigits})}</strong><span className="sc-metric-affix">{unit}</span></span>;
}
