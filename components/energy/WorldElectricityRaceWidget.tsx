'use client';
import {useMemo} from 'react';
import {useWidgetReferenceData} from '../dashboard/WidgetReferenceData';
import RaceChart from '../charts/RaceChart';
import {WIDGETS} from '../../lib/widget-registry';
import {WORLD_ELECTRICITY_YEARS,WORLD_WIND_SOLAR,WORLD_NUCLEAR,WORLD_ELECTRICITY_MILESTONES,WORLD_ELECTRICITY_SOURCE} from '../../lib/world-electricity-race';

const format = (value:number) => `${Math.round(value).toLocaleString('de-DE')} TWh`;
const noDailyCalendar:number[] = [];

/** Annual observations use the same renderer, camera, timeline and actions as cost races. */
export default function WorldElectricityRaceWidget({onsite=true,autoplay=true}:{onsite?:boolean;autoplay?:boolean}) {
 const reference=useWidgetReferenceData();
 const dataset=reference?.worldElectricity;
 const years=useMemo(()=>dataset?.rows.map(row=>row.year)??WORLD_ELECTRICITY_YEARS,[dataset]);
 const renewableValues=useMemo(()=>dataset?Float64Array.from(dataset.rows,row=>row.wind+row.solar):WORLD_WIND_SOLAR,[dataset]);
 const nuclearValues=useMemo(()=>dataset?Float64Array.from(dataset.rows,row=>row.nuclear):WORLD_NUCLEAR,[dataset]);
 const dateAt=(index:number)=>({jahr:years[Math.min(years.length-1,Math.max(0,Math.floor(index)))],monat:0,tag:1});
 return <RaceChart titleSeries={[{text:"Wind + Solar",runner:"camera"},{text:"Atomkraft",runner:"other"}]} widget={WIDGETS.worldElectricityRace}
  kamera={{key:'wind-solar',label:'Wind + Solar',kurz:'Wind + Solar',farbe:'--color-accent',werte:renewableValues}}
  anderer={{key:'nuclear',label:'Kernenergie',kurz:'Kernenergie',farbe:'--color-text-primary',werte:nuclearValues}}
  startJahr={years[0]} jahre={years.length-1} ersterTag={noDailyCalendar} datumVon={dateAt} annualYears={years}
  ereignisse={WORLD_ELECTRICITY_MILESTONES.map(event=>({...event,tag:years.indexOf(event.jahr)})).filter(event=>event.tag>=0)} fmt={format} fmtKurz={format}
  titelHilfe={{title:'Jährliche Stromerzeugung weltweit',ariaLabel:'Was wird verglichen?',inhalt:<p>Stromerzeugung aus Wind und Solar gegenüber Kernenergie in TWh pro Jahr. Wasserkraft, Bioenergie und weitere erneuerbare Quellen sind in „Wind + Solar“ nicht enthalten. Die Werte werden nicht über die Jahre aufsummiert.</p>}}
  zeitraumHilfe={{title:'Veröffentlichte Jahreswerte',ariaLabel:'Wie entsteht die Animation?',inhalt:<p>Ember-Jahresdaten von {years[0]} bis {years.at(-1)}. Die Bewegung zwischen den Jahrespunkten dient nur der Darstellung. Zahlen, Zeitregler und Meilensteine beziehen sich auf die veröffentlichten Jahreswerte. Der bestehende Zubau-Vergleich zeigt dagegen neu installierte Leistung in GW.</p>}}
  ariaLabel={(year,renewables,nuclear)=>`Weltweite Stromerzeugung ${year}: Wind + Solar ${format(renewables)}, Kernenergie ${format(nuclear)}.`}
  exportNote="Weltweite Jahreserzeugung in TWh; Wind + Solar ohne weitere erneuerbare Quellen. Ember, CC BY 4.0. Animation zwischen Jahreswerten."
  dateiname="stromerzeugung-weltweit" stand={(dataset??WORLD_ELECTRICITY_SOURCE).retrieved} onsite={onsite} showEmbed autoplay={autoplay}
  tempo={{ruhigeTage:3,msJeTagStart:1400,msJeTagEnde:500}} skala={{minSpanne:250,minRand:20}}
 />;
}
