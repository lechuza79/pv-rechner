/** Compact German dates shared by dashboard headings, controls and charts. */
export function dashboardDate(iso:string):string {
 const date=new Date(iso);
 if(!Number.isFinite(date.getTime()))return iso;
 const months=['Jan.','Feb.','März','Apr.','Mai','Juni','Juli','Aug.','Sept.','Okt.','Nov.','Dez.'];
 return `${String(date.getUTCDate()).padStart(2,'0')}. ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
