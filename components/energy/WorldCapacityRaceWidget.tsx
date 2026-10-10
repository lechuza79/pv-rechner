"use client";
import RaceChart from '../charts/RaceChart';
import {WIDGETS} from '../../lib/widget-registry';
import {CAPACITY_YEARS as years,CAPACITY_RENEWABLES,CAPACITY_NUCLEAR,CAPACITY_MILESTONES,CAPACITY_SOURCE} from '../../lib/world-capacity-race';
const format=(value:number)=>`${(Math.abs(value)<.05?0:value).toLocaleString('de-DE',{maximumFractionDigits:1})} GW`;
const dateAt=(index:number)=>({jahr:years[Math.min(years.length-1,Math.max(0,Math.floor(index)))],monat:0,tag:1});
const calendar:number[]=[];
/** Same annual capacity observations as the static growth comparison. */
export default function WorldCapacityRaceWidget({onsite=true}:{onsite?:boolean}) {
 return <RaceChart titleSeries={[{text:"Wind + Solar",runner:"camera"},{text:"Atomkraft",runner:"other"}]} widget={WIDGETS.worldCapacityRace}
 kamera={{key:'wind-solar',label:'Wind + Solar',kurz:'Wind + Solar',farbe:'--color-accent',werte:CAPACITY_RENEWABLES}}
 anderer={{key:'nuclear',label:'Kernenergie',kurz:'Kernenergie',farbe:'--color-text-primary',werte:CAPACITY_NUCLEAR}}
 startJahr={years[0]} jahre={years.length-1} ersterTag={calendar} datumVon={dateAt} annualYears={years} milestoneTiming
 ereignisse={CAPACITY_MILESTONES} fmt={format} fmtKurz={format}
 titelHilfe={{title:'Jährlicher Nettozubau weltweit',ariaLabel:'Was wird verglichen?',inhalt:<p>Neu installierte Leistung aus Wind und Solar gegenüber Kernenergie in GW pro Jahr, abzüglich Rückbau. Negative Werte bedeuten mehr Rückbau als Zubau.</p>}}
 zeitraumHilfe={{title:'Jahreswerte mit Meilensteinen',ariaLabel:'Wie läuft die Animation?',inhalt:<p>Dieselben Jahresdaten wie im statischen Zubau-Chart. Meilensteine und die letzten Jahre erhalten mehr Zeit. Die Bewegung verbindet Jahreswerte; die Werte werden nicht aufsummiert.</p>}}
 ariaLabel={(year,renewables,nuclear)=>`Weltweiter Nettozubau ${year}: Wind + Solar ${format(renewables)}, Kernenergie ${format(nuclear)}.`}
 exportNote="Jährlicher Nettozubau in GW, inklusive Rückbau. Wind + Solar, keine weiteren erneuerbaren Energien. Ember, CC BY 4.0."
 dateiname="zubau-weltweit-racing" stand={CAPACITY_SOURCE.dataAsOf} onsite={onsite} showEmbed skala={{minSpanne:30,minRand:5}}/>;
}
