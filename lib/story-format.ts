/** Identical evidence values use identical rounding in every output channel. */
export const formatStoryValue=(value:number)=>value.toLocaleString('de-DE',{maximumFractionDigits:2});

const months=['Jan.','Feb.','März','Apr.','Mai','Juni','Juli','Aug.','Sept.','Okt.','Nov.','Dez.'];
/** Shared German display dates; underlying source keys stay unchanged. */
export function formatStoryDate(value:string):string{return value.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g,(_,y,m,d)=>`${Number(d)}. ${months[Number(m)-1]??m} ${y}`).replace(/\b(\d{4})-W(\d{2})\b/g,'KW $2/$1').replace(/\b(\d{4})-(\d{2})\b/g,(_,y,m)=>`${months[Number(m)-1]??m} ${y}`);}
