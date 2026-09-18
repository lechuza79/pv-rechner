import snapshots from "./story-monatspeak-beispiele.json";
import { buildMonthPeakConcept } from "./story-monatspeak";

/** Verified sparse aggregate snapshots: absent rows within declared coverage mean zero. */
export const MONTH_PEAK_EXAMPLES = snapshots.map(snapshot => {
  const months = [];
  let cursor = snapshot.coverageFrom;
  while(cursor<=snapshot.coverageThrough){
    months.push({label:cursor,value:snapshot.rows.find(row=>row.monat.slice(0,7)===cursor)?.count??0});
    const date=new Date(`${cursor}-01T12:00:00Z`);date.setUTCMonth(date.getUTCMonth()+1);cursor=date.toISOString().slice(0,7);
  }
  return buildMonthPeakConcept({name:snapshot.name,months,asOf:snapshot.readAt,sourceDate:snapshot.sourceDate});
});
