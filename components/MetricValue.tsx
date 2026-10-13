import "./metric-value.css";
/** A shared numeric hierarchy: primary value, quiet sign and unit. */
export default function MetricValue({value,unit="€",signed=false,maximumFractionDigits=0,minimumFractionDigits=0,stacked=false,image}:{value:number|null;unit?:string;signed?:boolean;maximumFractionDigits?:number;minimumFractionDigits?:number;stacked?:boolean;image?:{size:number;color:string;unitColor:string;unitFont?:string}}) {
 // ImageResponse has no stylesheet; keep the same value/unit markup for OG rendering.
 const imageUnit = image ? {fontSize:image.size*(stacked ? .45 : .65),color:image.unitColor,fontFamily:image.unitFont,fontWeight:400 as const,lineHeight:1} : undefined;
 return <span className="sc-metric-value" data-stacked={stacked||undefined} style={image?{display:"flex",flexDirection:stacked?"column":"row",alignItems:stacked?"center":"baseline",justifyContent:"center",gap:stacked?2:image.size*.2,fontSize:image.size,color:image.color,lineHeight:1.15}:undefined}>{(value!==null && (signed || value<0)) && <span className="sc-metric-affix" style={imageUnit}>{value!==null&&value<0?"−":"+"}</span>}<strong style={image?{fontSize:image.size,fontWeight:700,lineHeight:1.15}:undefined}>{value===null?"–":Math.abs(value).toLocaleString("de-DE",{maximumFractionDigits,minimumFractionDigits})}</strong><span className="sc-metric-affix" style={imageUnit}>{unit}</span></span>;
}
