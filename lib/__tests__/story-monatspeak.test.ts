import { describe, expect, it } from "vitest";
import { buildMonthPeakConcept, evaluateMonthPeak, type MonthCount } from "../story-monatspeak";
import { MONTH_PEAK_EXAMPLES } from "../story-monatspeak-examples";
const months=(values:number[]):MonthCount[]=>values.map((value,i)=>({label:`${2024+Math.floor(i/12)}-${String(i%12+1).padStart(2,"0")}`,value}));
const input=(values:number[])=>({name:"Testort",months:months(values),asOf:"2026-09-10",sourceDate:"2026-09-01"});
describe("Single-month editorial pattern",()=>{
  it("rejects former positive examples when older comparison months are restored",()=>{
    expect(MONTH_PEAK_EXAMPLES.map(e=>[e.preview.town,e.decision.accepted,e.decision.peak?.value])).toEqual([["Fürfeld",false,29],["Feilbingert",false,27],["Höchberg",false,15]]);
    expect(MONTH_PEAK_EXAMPLES[0].preview.highlightedMonths).toEqual([]);
    expect(MONTH_PEAK_EXAMPLES[0].decision.runnerUp?.value).toBe(15);
    expect(MONTH_PEAK_EXAMPLES[0].decision.months[0].label).toBe("2022-11");
    expect(MONTH_PEAK_EXAMPLES[2].decision.months[0].label).toBe("2020-05");
    expect(MONTH_PEAK_EXAMPLES.every(e=>!e.decision.publicationReady)).toBe(true);
  });
  it("does not manufacture an isolated peak from steady growth or recurring seasonal peaks",()=>{
    expect(evaluateMonthPeak(input(Array.from({length:24},(_,i)=>i+1))).accepted).toBe(false);
    expect(evaluateMonthPeak(input(Array.from({length:24},(_,i)=>i%12===4?30:2))).accepted).toBe(false);
  });
  it("rejects missing calendar months and duplicate months",()=>{
    const x=input([1,1,1,1,30,1,1,1,1,1,1,1]);x.months.splice(2,1);
    expect(evaluateMonthPeak(x).accepted).toBe(false);
    x.months.push(x.months[0]);expect(evaluateMonthPeak(x).accepted).toBe(false);
  });
  it("excludes immature data even when it is the largest value",()=>{
    const x=input(Array(24).fill(1));x.asOf="2026-01-10";x.months[23].value=100;
    expect(evaluateMonthPeak(x).accepted).toBe(false);
  });
  it("finds the largest peak rather than stopping at the first qualifying one",()=>{
    const d=evaluateMonthPeak(input([1,12,1,1,1,30,1,1,1,1,1,1]));
    expect(d.peak?.label).toBe("2024-06");expect(d.accepted).toBe(true);
  });
  it("does not divide a zero reference into an invented growth factor",()=>{
    const d=buildMonthPeakConcept(input([0,0,0,0,12,0,0,0,0,0,0,0]));
    expect(d.decision.accepted).toBe(true);expect(d.preview.social).toContain("kein Wachstumsfaktor");
  });
});
