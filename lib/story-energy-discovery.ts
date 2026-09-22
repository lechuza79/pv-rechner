import {erzeugungKwh} from './atlas-impact';
import type {DiscoveryReport,SolarRow} from './story-discovery';
/** Reuse the Atlas annual model; this is neither measured output nor a weather event. */
export function addEnergyStory(report:DiscoveryReport,rows:SolarRow[]){
 const local=rows.filter(r=>r.region_id===report.regionId),count=local.reduce((s,r)=>s+r.count,0),kwp=local.reduce((s,r)=>s+r.kwp,0);
 if(count<5||kwp<=0)return;
 const kwh=erzeugungKwh(kwp,report.regionId);if(!Number.isFinite(kwh)||kwh<=0)return;
 report.candidates.push({id:`${report.regionId}-annual-energy-model-${report.sourceDate}`,family:'Jahresertrag als Modell',title:'Welche Jahreserzeugung der heutige Solarbestand rechnerisch ermöglicht',status:'ready',priority:40,period:report.sourceDate,eventKey:'energy-model',evidence:[{label:'Installierte Solarleistung',value:kwp,unit:'kWp'},{label:'Modellierter Jahresertrag',value:kwh/1000,unit:'MWh/Jahr'}],comparison:`Aktiver Anlagenbestand im Export ${report.sourceDate}, über ein vollständiges Modelljahr gerechnet.`,reason:'Bestehendes Atlas-Modell: Leistung × regionaler Referenzertrag × Flottenkorrektur. Keine neue Parallelrechnung.',limitations:['Modellwert, keine gemessene Erzeugung und keine Prognose für ein bestimmtes Kalenderjahr. Wetter, Betriebsunterbrechungen und einzelne Anlagen werden nicht individuell simuliert.'],related:[],visual:'Leistung und Jahresertrag'});
 report.checks.push({family:'Jahreserzeugung als Modell',status:'found',reason:'Vorhandenes Atlas-Jahresmodell angeschlossen. Wetterbezogene Tages-/Wochenstories sind damit nicht abgedeckt.'});
}
