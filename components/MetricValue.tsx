import "./metric-value.css";
/** A shared numeric hierarchy: primary value, quiet sign and unit. */
export default function MetricValue({value,unit="€",signed=false}:{value:number;unit?:string;signed?:boolean}) {
 return <span className="sc-metric-value">{(signed || value<0) && <span className="sc-metric-affix">{value<0?"−":"+"}</span>}<strong>{Math.round(Math.abs(value)).toLocaleString("de-DE")}</strong><span className="sc-metric-affix">{unit}</span></span>;
}
