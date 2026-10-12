/** Direction and color describe the net balance, never the gross trade volume. */
export type TradeDirection = 'import'|'export';
export const TRADE_DIRECTION_COLORS = {
 import:'var(--widget-accent)',
 export:'var(--trade-export-color,var(--widget-ink))',
} as const;
export function tradeBalanceDirection(value:number|null):TradeDirection {
 return value!==null&&value<0?'import':'export';
}

/** Split at zero crossings and missing days; never connect the end of a year
 * back to January, or draw a value across an unobserved period. */
export function signedTradeLine(values:readonly (number|null)[]) {
 const segments:{direction:TradeDirection;points:[number,number][]}[]=[];
 let current:typeof segments[number]|undefined;
 const append=(direction:TradeDirection,from:[number,number],to:[number,number])=>{
  if(!current||current.direction!==direction){current={direction,points:[from]};segments.push(current);}
  current.points.push(to);
 };
 for(let i=1;i<values.length;i++){
  const a=values[i-1],b=values[i];
  if(a===null||b===null||!Number.isFinite(a)||!Number.isFinite(b)){current=undefined;continue;}
  const start:[number,number]=[i-1,a],end:[number,number]=[i,b];
  if(a*b<0){
   const crossing:[number,number]=[i-1+Math.abs(a)/(Math.abs(a)+Math.abs(b)),0];
   append(tradeBalanceDirection(a),start,crossing);
   append(tradeBalanceDirection(b),crossing,end);
  }else append(tradeBalanceDirection(a===0?b:a),start,end);
 }
 return segments;
}
