import {it,expect} from 'vitest';
import {storyCopy} from '../story-copy';
import type {Candidate,DiscoveryReport} from '../story-discovery';
import type {StoryConcept} from '../story-konzepte';
const report={name:'Beispielstadt',sourceDate:'2026-09-10'} as DiscoveryReport;
const claim=(family:string)=>({family,title:'Balkonkraftwerke: Vergleich',period:'2026',comparison:'Identische Kalendermonate 1–8 in 2025 und 2026'} as Candidate);
const story=(unit:string)=>({values:[{label:'2025',value:200,unit},{label:'2026',value:150,unit}],unit} as StoryConcept);
it('explains capacity as capacity, a decline and the full named YTD window',()=>{
 const text=storyCopy(report,claim('Vorjahreszeitraum'),story('kWp'))!;
 expect(text).toContain('50 kWp weniger (25 %)');
 expect(text).toContain('Januar bis August 2026 im Vergleich zu Januar bis August 2025');
 expect(text).toContain('vorläufig');expect(text).toContain('nicht den erzeugten Strom');
 expect(text).not.toContain('150 Balkonkraftwerke');
});
it('rejects comparisons between incompatible units',()=>{
 const s=story('kWp');s.values[0].unit='Anlagen';
 expect(storyCopy(report,claim('Jahresveränderung'),s)).toBeNull();
});
it('uses absolute count evidence and explains a tiny raster share',()=>{
 const s={values:[{value:.2},{value:40}],countComparison:{total:4406,selected:10,label:'Freiflächenanlagen'}} as StoryConcept;
 const text=storyCopy(report,claim('Anzahl und Leistung'),s)!;
 expect(text).toContain('10 von 4.406');expect(text).toContain('40 %');expect(text).toContain('kleine Fläche');
});
it('compares only matching months and excludes the winning month from the mean',()=>{
 const c={...claim('Ertragsspitze als Modell'),period:'2023-06'};
 const s={...story('kWh/kWp'),kind:'yield',values:[],yieldSeries:[{period:'2021-06',value:100,highlight:false},{period:'2022-06',value:100,highlight:false},{period:'2023-06',value:120,highlight:true},{period:'2023-07',value:999,highlight:false}]} as StoryConcept;
 const text=storyCopy(report,c,s)!;
 expect(text).toContain('20 % mehr');expect(text).toContain('2 anderen Juni-Monate');
 expect(text).toContain('zusätzliche Anlagen verändern diesen Vergleich nicht');
});
