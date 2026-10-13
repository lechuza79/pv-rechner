/** A shared display scale, not installed capacity or stored energy. */
export function powerBarScale(values:(number|null)[]){return Math.max(1,Math.ceil(Math.max(...values.filter((v):v is number=>v!==null&&Number.isFinite(v)),0)));}
export function activePowerSegments(value:number|null,max:number,count=20){return value===null||!Number.isFinite(value)||value<=0?0:Math.min(count,Math.ceil(value/max*count));}
