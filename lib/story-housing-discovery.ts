import type {DiscoveryReport} from './story-discovery';
export type HousingRow={region_id:string;stichtag:string;wohnungen:number;w_1:number;w_2:number;w_3_6:number;w_7_12:number;w_13plus:number};
export function addHousingStory(report:DiscoveryReport,housing?:HousingRow){
 if(!housing){report.checks.push({family:'Wohnstruktur',status:'missing',reason:'Keine Zensuszeile für diesen Gemeindeschlüssel vorhanden; keine Gleichsetzung mit null Wohnungen.'});return;}
 const small=housing.w_1+housing.w_2,large=housing.w_3_6+housing.w_7_12+housing.w_13plus;
 if(![housing.wohnungen,small,large].every(v=>Number.isFinite(v)&&v>=0)||small+large>housing.wohnungen||housing.wohnungen<200){report.checks.push({family:'Wohnstruktur',status:'none',reason:'Keine passende auswertbare Grundmenge ab 200 Wohnungen mit konsistenter Aufteilung.'});return;}
 report.candidates.push({id:`${report.regionId}-housing-${housing.stichtag}`,family:'Wohnstruktur',title:`${Math.round(small/housing.wohnungen*100)} % der Wohnungen in Häusern mit ein oder zwei Wohnungen`,status:'ready',priority:45,period:housing.stichtag,eventKey:'housing',evidence:[{label:'Ein- und Zweifamilienhäuser',value:small,unit:'Wohnungen'},{label:'Größere Wohngebäude',value:large,unit:'Wohnungen'},{label:'Grundgesamtheit',value:housing.wohnungen,unit:'Wohnungen'}],comparison:`Zensus, Stichtag ${housing.stichtag}, damaliger Gebietsstand.`,reason:'Vorhandene amtliche Zensusdaten; eigenständiger Strukturbefund.',limitations:['Gezählt werden Wohnungen, nicht Dächer. Daraus folgt weder geeignetes Solarpotenzial noch ein Anteil ungenutzter Dächer.'],related:[],visual:'Wohnungsanteile'});
 report.checks.push({family:'Wohnstruktur',status:'found',reason:`Zensus vom ${housing.stichtag} angeschlossen. Keine Potenzialbehauptung.`});
}
