import snapshot from '../data/world-electricity-race.json';

export const WORLD_ELECTRICITY_SOURCE = snapshot;
export const WORLD_ELECTRICITY_YEARS = snapshot.rows.map(row => row.year);
export const WORLD_WIND_SOLAR = Float64Array.from(snapshot.rows, row => row.wind + row.solar);
export const WORLD_NUCLEAR = Float64Array.from(snapshot.rows, row => row.nuclear);
/** Historical context stays separate from the annual generation observations. */
export const WORLD_ELECTRICITY_MILESTONES=[
 {jahr:2000,label:'Erzeugung folgt dem vorhandenen Kraftwerkspark',text:'Diese Kurven zeigen tatsächlich erzeugten Strom. Neue Leistung wirkt erst nach Inbetriebnahme; Wetter und Auslastung beeinflussen den Jahreswert zusätzlich.',source:{label:'Datengrundlage: Ember',url:'https://ember-energy.org/data/yearly-electricity-data/'}},
 {jahr:2012,label:'Nach Fukushima fehlt Kernstrom aus Japan',text:'Nach dem Unfall 2011 standen in Japan zahlreiche Reaktoren still. Weniger Erzeugung heißt dabei nicht automatisch, dass dieselbe Leistung bereits dauerhaft zurückgebaut wurde.',source:{label:'Quelle: IAEA',url:'https://www-pub.iaea.org/MTCD/Publications/PDF/CNPP2012_CD/countryprofiles/Japan/Japan_tables.htm'}},
 {jahr:2016,label:'Sinkende Kosten erleichtern den Ausbau',text:'Zwischen 2010 und 2016 sanken die Stromgestehungskosten großer Solaranlagen laut IRENA um 69 %. Günstigere Projekte unterstützen den Ausbau, der später mehr Strom erzeugt.',source:{label:'Quelle: IRENA',url:'https://www.irena.org/publications/2018/Jan/Renewable-power-generation-costs-in-2017'}},
 {jahr:2021,label:'Wind + Solar überholen die Kernenergie',text:'Der über Jahre aufgebaute Anlagenbestand trägt nun mehr zur weltweiten Stromerzeugung bei. Das ist ein Vergleich der Jahreserzeugung, nicht der neu gebauten Leistung.',source:{label:'Datengrundlage: Ember',url:'https://ember-energy.org/data/yearly-electricity-data/'}},
 {jahr:2023,label:'Rekordzubau legt die Basis für mehr Strom',text:'Chinas Solarboom und stark gefallene Modulpreise beschleunigen den Ausbau. Die neuen Anlagen tragen nach ihrer Inbetriebnahme zur Stromerzeugung bei; der Effekt verteilt sich über mehrere Jahre.',source:{label:'Quelle: IEA',url:'https://www.iea.org/reports/renewables-2023/executive-summary'}},
].map(event=>({...event,tag:WORLD_ELECTRICITY_YEARS.indexOf(event.jahr),linie:event.jahr!==2000}));
