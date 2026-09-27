import type {Candidate,DiscoveryReport} from './story-discovery';
export type StorageRow={region_id:string;segment:string;month:string;count:number;kwh:number;capacityCount:number};
/** Capacity is measured in kWh, never passed through the solar power detector. */
export function addStorageStories(report:DiscoveryReport,rows:StorageRow[]){
 const local=rows.filter(r=>r.region_id===report.regionId&&r.segment==='batterie');
 if(!local.length){report.checks.push({family:'Batteriespeicher',status:'none',reason:'Vollständiger Speicherexport ausgewertet; keine aktiven Batterieeinheiten mit gültigem Ort und Datum.'});return;}
 const invalid=local.some(r=>r.count<0||r.capacityCount<0||r.capacityCount>r.count||!Number.isFinite(r.kwh)||r.kwh<0);
 if(invalid)throw new Error('Invalid storage aggregation');
 const before=report.candidates.length;
 function add(family:string,period:string,title:string,evidence:Candidate['evidence'],comparison:string){
  report.candidates.push({id:`${report.regionId}-storage-${family}-${period}-${evidence[0].unit}`,family,period,title,evidence,comparison,eventKey:`batterie-${period}`,status:'ready',priority:55,reason:'Aktive Batterieeinheiten nach Inbetriebnahme im vollständigen Registerexport.',limitations:['Registereinheiten sind nicht zwingend einzelne Speicherprojekte.'],related:[],visual:family==='Speicherbestand'?'Kennzahlen':'Jahresvergleich'});
 }
 const total=local.reduce((a,r)=>({count:a.count+r.count,kwh:a.kwh+r.kwh,capacityCount:a.capacityCount+r.capacityCount}),{count:0,kwh:0,capacityCount:0});
 add('Speicherbestand',report.sourceDate,`${total.count.toLocaleString('de-DE')} Batterieeinheiten im Ort`,[{label:'Aktive Batterieeinheiten',value:total.count,unit:'Einheiten'},...(total.capacityCount===total.count?[{label:'Nutzbare Speicherkapazität',value:total.kwh,unit:'kWh'}]:[])],`Aktiver Bestand zum Export ${report.sourceDate}; ausschließlich Batterietechnologie, keine Pumpspeicher.`);
 const sourceYear=Number(report.sourceDate.slice(0,4)),sourceMonth=Number(report.sourceDate.slice(5,7));
 const lastYear=sourceMonth>=4?sourceYear-1:sourceYear-2;
 const years=new Map<number,typeof total>();
 for(const r of local){const year=Number(r.month.slice(0,4));if(year<2000||year>lastYear)continue;const a=years.get(year)??{count:0,kwh:0,capacityCount:0};a.count+=r.count;a.kwh+=r.kwh;a.capacityCount+=r.capacityCount;years.set(year,a);}
 for(const [year,b] of years){const a=years.get(year-1);if(!a)continue;
  for(const metric of ['count','kwh'] as const){
   if(metric==='kwh'&&(a.capacityCount!==a.count||b.capacityCount!==b.count))continue;
   if(a[metric]<=0||Math.abs(b[metric]-a[metric])<(metric==='count'?10:100)||Math.abs(b[metric]/a[metric]-1)<.25)continue;
   add('Speicherzubau',String(year),`Batteriespeicher: ${year} ${b[metric]>a[metric]?'mehr':'weniger'} ${metric==='count'?'Inbetriebnahmen':'neue Kapazität'}`,[{label:String(year-1),value:a[metric],unit:metric==='count'?'Einheiten':'kWh'},{label:String(year),value:b[metric],unit:metric==='count'?'Einheiten':'kWh'}],`Vollständiger Jahrgang ${year} gegenüber ${year-1}; mindestens 25 % und ${metric==='count'?'10 Einheiten':'100 kWh'} Differenz.`);
  }
 }
 report.checks.push({family:'Batteriespeicher',status:'found',reason:`${report.candidates.length-before} Beobachtungen. Kapazität für ${total.capacityCount} von ${total.count} aktiven Einheiten zugeordnet; unvollständige Kapazitätssummen werden nicht als Gesamtwert ausgegeben.`});
}
