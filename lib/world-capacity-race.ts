import {YEARS_ZUBAU,ZUBAU_BY_COUNTRY,COUNTRY_COMPARE_META} from './country-comparison';
export const CAPACITY_YEARS=YEARS_ZUBAU;
const world=ZUBAU_BY_COUNTRY.find(country=>country.code==='WELT')!;
export const CAPACITY_RENEWABLES=Float64Array.from(world.windsolar);
export const CAPACITY_NUCLEAR=Float64Array.from(world.nuclear);
export const CAPACITY_SOURCE=COUNTRY_COMPARE_META;
/** Explanations are historical context, not a numerical attribution of each annual change. */
export const CAPACITY_MILESTONES=[
 {jahr:2010,label:'Zubau ist nicht Stromerzeugung',text:'Hier zählt neu installierte Leistung abzüglich Stilllegungen. Ein GW Wind, Solar oder Kernenergie liefert deshalb noch nicht dieselbe jährliche Strommenge.',source:{label:'Datengrundlage: Ember',url:COUNTRY_COMPARE_META.sourceUrl}},
 {jahr:2012,label:'Stilllegungen nach Fukushima',text:'Nach dem Unfall 2011 wurden Reaktoren dauerhaft stillgelegt, unter anderem in Deutschland. Der negative Nettozubau zeigt: Neue Anlagen gleichen Rückbau nicht immer aus. Stilllegungs- und Statistikjahr können abweichen.',source:{label:'Quelle: IAEA',url:'https://www.iaea.org/sites/default/files/gc/gc57-3_en.pdf'}},
 {jahr:2020,label:'Förderfristen ziehen Projekte vor',text:'In China mussten viele Windprojekte vor dem Auslaufen der Förderung fertig werden. Dieser Endspurt trug zum starken Zubau 2020 bei; solche Fristen verschieben Projekte zwischen Jahren.',source:{label:'Quelle: IEA',url:'https://www.iea.org/reports/renewables-2020/wind'}},
 {jahr:2021,label:'Auf den Endspurt folgt eine Delle',text:'Nach dem Förder-Endspurt 2020 erwartete die IEA weniger neue Anlagen in China. Das erklärt einen Teil des zeitlichen Musters: Eine schwächere Jahreszahl bedeutet nicht automatisch eine langfristige Trendwende.',source:{label:'Quelle: IEA',url:'https://www.iea.org/reports/renewable-energy-market-update-2021/renewable-electricity'}},
 {jahr:2023,label:'Chinas Solarboom verändert das Tempo',text:'China installierte 2023 so viel Solarleistung wie die gesamte Welt im Vorjahr. Gleichzeitig fielen die Spotpreise für Solarmodule fast um die Hälfte – ein wichtiger Hintergrund des kräftigen Ausbaus.',source:{label:'Quelle: IEA',url:'https://www.iea.org/reports/renewables-2023/executive-summary'}},
 {jahr:2024,label:'Günstige Technik trifft Ausbaupolitik',text:'Wettbewerbsfähige Kosten und unterstützende Politik treiben den Ausbau in China. Weltweit schaffen Klima- und Energiesicherheitsziele zusätzliche Nachfrage nach Wind und Solar.',source:{label:'Quelle: IEA',url:'https://www.iea.org/reports/renewables-2024/executive-summary'}},
].map(event=>({...event,tag:YEARS_ZUBAU.indexOf(event.jahr),linie:event.jahr!==2010}));
