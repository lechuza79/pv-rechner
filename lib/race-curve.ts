/** Shape-preserving cubic interpolation: exact observations, no invented extrema. */
export function raceCurveValue(values:Float64Array,position:number):number {
 const last=values.length-1;
 const x=Math.max(0,Math.min(last,position)),i=Math.min(last-1,Math.floor(x));
 if(last<1)return values[0]??0;
 const delta=(j:number)=>values[j+1]-values[j];
 const slope=(j:number)=>{
  if(j===0)return delta(0);
  if(j===last)return delta(last-1);
  const a=delta(j-1),b=delta(j);
  return a*b<=0?0:2*a*b/(a+b);
 };
 const t=x-i,t2=t*t,t3=t2*t;
 return (2*t3-3*t2+1)*values[i]+(t3-2*t2+t)*slope(i)+(-2*t3+3*t2)*values[i+1]+(t3-t2)*slope(i+1);
}
