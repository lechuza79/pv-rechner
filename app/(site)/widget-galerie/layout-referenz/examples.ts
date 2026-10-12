import {widgetCompositionItem} from '../../../../lib/widget-appearance';
import type {CompositionItem} from '../../../../lib/widget-composition';
/** Compositions contain registry references and semantic grouping, not copied sizes. */
export type ExampleNode = {
 area:string;label:string;widgetId?:string;compact?:boolean;period?:string;params?:Record<string,string>;
 direction?:'row'|'column';children?:ExampleNode[];
};
type LayoutExample={id:string;title:string;description:string;nodes:ExampleNode[];direction?:'row'|'column';contentNodes?:ExampleNode[]};
export const layoutExamples:LayoutExample[]=[
 {id:'nested',title:'Eine Kombination als Baustein im größeren Raster',description:'Eine Kostenansicht und zwei kompakte Handelsansichten bilden eine Gruppe. Die Rangliste ergänzt sie; ihre Höhen folgen den Anforderungen der Charts.',nodes:[
  {area:'combination',label:'Kosten und Handel',children:[
   {area:'main',label:'Stromkosten',widgetId:'pv-kostenrennen'},
   {area:'trade',label:'Stromhandel',direction:'column',children:[
    {area:'first',label:'Stromhandel · Jahr',widgetId:'stromhandel',compact:true},
    {area:'second',label:'Stromhandel · sieben Tage',widgetId:'stromhandel',compact:true,period:'seven'},
   ]},
  ]},
  {area:'ranking',label:'Ranking',widgetId:'gemeinde-ranking'},
 ]},
 {id:'mixed',title:'Zeitverlauf, Kreis und kleine Ergänzung',description:'Ein weltweiter Vergleich über einer Gruppe aus Stromhandel und aktueller Solarleistung. Jede Gruppe ordnet sich nach dem verfügbaren Platz an.',direction:'column',nodes:[
  {area:'wide',label:'Zubau weltweit',widgetId:'welt-zubaurennen'},
  {area:'details',label:'Handel und Leistung',children:[
   {area:'radial',label:'Stromhandel',widgetId:'stromhandel'},
   {area:'small',label:'Solarleistung heute',widgetId:'regional-current-power'},
  ]},
 ]},
 {id:'regional',title:'Karte, Monatsverlauf und gemeinsame Kennzahlen',description:'Karte und Monatsverlauf teilen sich eine Zeile, solange genügend Platz vorhanden ist. Die vollständige Kennzahlengruppe darunter wächst mit ihrem Inhalt.',nodes:[
  {area:'map',label:'Regionalkarte',widgetId:'regional-map'},
  {area:'month',label:'Solarerzeugung im Monatsverlauf',widgetId:'gemeinde-solar-monat'},
 ],contentNodes:[{area:'stats',label:'Bestand und Entwicklung',widgetId:'regional-basic-stats'}]},
 {id:'landscape',title:'Energielandschaft und eigenständige Standortkarten',description:'Dieselben Standortkarten erscheinen in der Landschaft und als eigene Widgets. Der Ort wird im Dashboard konfiguriert, die Stationen lassen sich in der Landschaft ansteuern. Jede Karte behält ihre Quellen und Aktionen.',direction:'column',nodes:[{area:'landscape-stage',label:'Energielandschaft',widgetId:'kommunen-landschaft'},{area:'landscape-cards',label:'Standortkarten',direction:'row',children:[{area:'landscape-solar',label:'Solar in Hatten',widgetId:'landschaft-karte'},{area:'landscape-wind',label:'Windpark Hatten',widgetId:'landschaft-karte',params:{stop:'wind-1'}}]}]},
 {id:'energy',title:'Strommix und Ausbau im Vergleich',description:'Flächen- und Linienchart nutzen dieselbe flexible Zeichenfläche. Die Anteilsdarstellung daneben behält Platz für ihren Kreis und ihre Legende.',nodes:[
  {area:'generation',label:'Strommix Deutschland',widgetId:'strommix'},
  {area:'growth',label:'Erneuerbare und Atomkraft',widgetId:'zubau-erneuerbare-atom'},
  {area:'share',label:'Kernenergie-Anteil',widgetId:'strommix-anteil'},
 ]},
];
export function exampleWidgetIds(nodes:ExampleNode[]):string[]{return [...new Set(nodes.flatMap(node=>node.children?exampleWidgetIds(node.children):node.widgetId?[node.widgetId]:[]))];}

export function exampleCompositionItem(node:ExampleNode):CompositionItem {
 return node.children
  ? {id:node.area,kind:'group',direction:node.direction??'row',children:node.children.map(exampleCompositionItem)}
  : widgetCompositionItem(node.widgetId!,{id:node.area,presentation:node.compact?'compact':'full'});
}
