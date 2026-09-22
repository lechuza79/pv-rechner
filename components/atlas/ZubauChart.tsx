import {CategoryBarChart} from '../charts/CategoryBarChart';

/** Municipality adapter: commissioning counts are not historical stock snapshots. */
export default function ZubauChart({years,from=2014,asOfYear=new Date().getFullYear()}:{
 years:{year:number;count:number}[];from?:number;asOfYear?:number;
}) {
 const rows=years.filter(row=>row.year>=from&&row.year<=asOfYear).sort((a,b)=>a.year-b.year);
 if(rows.length<3)return null;
 return <CategoryBarChart label="Jährlicher Zubau an Solaranlagen" unit="Anlagen" rows={rows.map(row=>({id:String(row.year),label:String(row.year),value:row.count,partial:row.year===asOfYear}))}/>;
}
