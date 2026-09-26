import {expect,it} from 'vitest';
import {municipalCharts} from '../municipal-chart-catalog';
import type {StoryConcept} from '../story-konzepte';
const make=(town:string,sourceDate:string,period:string)=>({id:town+period,town,sourceDate,period,label:'Stromwert-Monatsrecap',kind:'facts',values:[{label:'Stromwert',value:100,unit:'€'}]} as StoryConcept);
it('keeps current chart per town without blending municipalities',()=>{
 const result=municipalCharts([make('A','2026-09-10','2026-08'),make('A','2026-08-10','2026-07'),make('B','2026-09-10','2026-08')]);
 expect(result).toHaveLength(2);expect(result[0].story.period).toBe('2026-08');
});
it('keeps the two monetary meanings separate and accepts genuine zero values',()=>{
 const a=make('A','2026-09-10','2026-08');
 const b={...a,label:'Einspeisevergütung-Monatsrecap',values:[{label:'Vergütung',value:0,unit:'€'}]};
 expect(municipalCharts([a,b]).map(x=>x.template)).toEqual(['electricity-value','feed-in-value']);
});
it('does not turn a record into a permanent chart or fabricate missing radial data',()=>{
 const a=make('A','2026-09-10','2026-08');
 expect(municipalCharts([{...a,label:'Rekord',kind:'yield',yieldSeries:[{period:'2025',value:120,highlight:true}]},{...a,label:'Solar-Monatsrecap',kind:'radial'}])).toEqual([]);
});
