type Point={time:string;powerPct:number};
/** A weighted percentage keeps the shared current-power renderer in MW. */
export function districtSolarCurve(rows:{kwp:number;points:Point[]|null}[]):Point[]|null {
 if(!rows.length||rows.some(row=>!Number.isFinite(row.kwp)||row.kwp<0||!row.points?.length))return null;
 const reference=rows[0].points!;
 const total=rows.reduce((sum,row)=>sum+row.kwp,0);
 if(rows.some(row=>row.points!.length!==reference.length||row.points!.some((p,i)=>p.time!==reference[i].time||!Number.isFinite(p.powerPct)||p.powerPct<0)))return null;
 return reference.map((p,i)=>({time:p.time,powerPct:total?rows.reduce((sum,row)=>sum+row.kwp*row.points![i].powerPct,0)/total:0}));
}
