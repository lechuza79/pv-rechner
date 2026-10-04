/** Compact presentations of the original calculator components and calculation. */
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {IconChevronLeft,IconChevronRight} from '../../../components/Icons';
import PvConsumerSection from '../../../components/PvConsumerSection';
import PvResultOverview from '../../../app/(site)/photovoltaik-rechner/_components/PvResultOverview';
import {simulatePvYear} from '../../../lib/pv-sim';
import PvHouseholdQuestion from '../../../components/PvHouseholdQuestion';
import {useResultIntro} from '../../../components/calculator/useResultIntro';
import PvResultRace from '../../../app/(site)/photovoltaik-rechner/_components/PvResultRace';
import {requiredConsumerFields,type PvConsumerValues} from '../../../components/PvConsumerFields';
import {calculatePvConsumerResult,consumerEnergy,type PvConsumerBasis} from '../../../lib/pv-consumer-model';
import {estimateCost} from '../../../lib/calc';
import {PERSONEN,NUTZUNG,NATIONAL_AVG_YIELD,SCENARIOS} from '../../../lib/constants';
import {DEFAULT_WP_BUILDING} from '../../../lib/heatpump';
import {DEFAULT_AIRCON_CONFIG} from '../../../lib/aircon-config';
import {MARKTWERT_NIVEAU_CT} from '../../../lib/marktwert-config';
import {usePrices} from '../../../lib/prices';
import {useFeedInRates} from '../../../lib/feedin';
import {monthlyFromAnnual} from '../../../lib/balkon-sim';
import '../../../components/calculator/result-design.css';
import '../../../components/calculator/input-design.css';
import '../../../app/(site)/photovoltaik-rechner/pv-flow.css';

export const scenes=[
 {title:'Wenige Fragen. Einfach verständlich.',copy:'Ihre Bürgerinnen und Bürger beantworten klare Fragen zu Haus und Alltag. Fachwissen ist dafür nicht nötig.'},
 {title:'Ein klares Ergebnis.',copy:'Kosten, Amortisation und langfristige Ersparnis werden direkt sichtbar – ohne Anmeldung.'},
 {title:'Ausführliche Erläuterung.',copy:'Verständliche Erläuterungen machen Ergebnisse, Annahmen und Zusammenhänge nachvollziehbar. Grafiken und Vergleiche zeigen, wie Kosten, Ersparnis und Eigenverbrauch zusammenhängen.'},
 {title:'Mehr verstehen. Fundiert entscheiden.',copy:'Zusätzliche Verbraucher ausprobieren und die Auswirkungen auf die eigene Rechnung verstehen.'},
];
const initialConsumers:PvConsumerValues={nutzung:1,wp:'nein',ea:'nein',eaKm:15000,klima:'nein',klimaRooms:2,klimaKwh:null,wpHaustyp:0,wpWohnflaeche:DEFAULT_WP_BUILDING.wohnflaeche,wpInsulation:DEFAULT_WP_BUILDING.insulationIdx,wpHeizsystem:DEFAULT_WP_BUILDING.heizsystem};

export function ResultStation({basis,values,active}:{basis:PvConsumerBasis;values:PvConsumerValues;active:boolean}){
 const result=useMemo(()=>calculatePvConsumerResult(basis,values),[basis,values]);
 const intro=useResultIntro(active,result.total,false);
 const energy=useMemo(()=>consumerEnergy(basis,values),[basis,values]);
 const simulation=useMemo(()=>simulatePvYear({kwp:basis.kwp,speicherKwh:basis.storageKwh,monthlyYieldPerKwp:basis.monthly,ertragKwp:basis.yieldPerKwp,household:{baseKwh:basis.baseKwh,tagQuote:NUTZUNG[values.nutzung].tagQuote,wpActive:false,eaActive:false,klimaActive:false}}),[basis,values.nutzung]);
 return <PvResultOverview presentation showChart={false} id="municipal-calculator-result" result={result} scenarioLabel="realistischer Preisentwicklung" progress={intro.progress} anchor={intro.anchor} onScenario={()=>{}} onDetails={()=>{}} onSettings={()=>{}} consumption={energy.consumption} price={basis.electricityPrice} rate={SCENARIOS.find(s=>s.id===basis.scenario)!.strom} monthlyConsumption={simulation.monthly.map(m=>m.consumption)} autoplay={false} autarkie={simulation.autarky}/>;
}
export function RaceStation({basis,values,playing}:{basis:PvConsumerBasis;values:PvConsumerValues;playing:boolean}){
 const result=useMemo(()=>calculatePvConsumerResult(basis,values),[basis,values]);
 const energy=useMemo(()=>consumerEnergy(basis,values),[basis,values]);
 return <div className="wp-overview municipal-race-station"><PvResultRace result={result} consumption={energy.consumption} price={basis.electricityPrice} rate={SCENARIOS.find(s=>s.id===basis.scenario)!.strom} monthlyConsumption={monthlyFromAnnual(energy.consumption)} autoplay={playing} initialProgress={.24}/></div>;
}
export function ConsumerStation({basis,values}:{basis:PvConsumerBasis;values:PvConsumerValues}){
 const [configured,setConfigured]=useState<PvConsumerValues>(()=>({...values,wp:'geplant',ea:'geplant'}));
 return <PvConsumerSection id="municipal-consumers" values={configured} answered={new Set(requiredConsumerFields(configured))} basis={basis} presentation={{hideIntro:true,hideComparisons:true,consumers:['wp','ea']}} onApply={setConfigured}/>;
}
export function useShowcaseCalculation(persons:number|null,usage:number|null){
 const prices=usePrices(),feedInRates=useFeedInRates();
 const values=useMemo(()=>({...initialConsumers,nutzung:usage??1}),[usage]);
 const basis=useMemo<PvConsumerBasis>(()=>({personen:persons??2,baseKwh:PERSONEN[persons??2].verbrauch,kwp:7.5,storageKwh:0,yieldPerKwp:NATIONAL_AVG_YIELD,monthly:null,electricityPrice:prices.electricityPrice,cost:estimateCost(7.5,0,prices),replacementCost:0,scenario:'realistic',feedInMode:'teil',feedInRate:null,feedInRates,regime:'heute',marketRevenue:true,marketValue:MARKTWERT_NIVEAU_CT,coolingDegreeDays:DEFAULT_AIRCON_CONFIG.cdhNational}),[persons,prices,feedInRates]);
 return {values,basis};
}
export default function CalculatorShowcase(){
 const host=useRef<HTMLDivElement>(null);
 const [visible,setVisible]=useState(false),[scene,setScene]=useState(0),[auto,setAuto]=useState(true);
 const [question,setQuestion]=useState(0),[persons,setPersons]=useState<number|null>(null),[usage,setUsage]=useState<number|null>(null),[pointer,setPointer]=useState(false);
 const {values,basis}=useShowcaseCalculation(persons,usage);
 useEffect(()=>{const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{threshold:.4});if(host.current)observer.observe(host.current);return()=>observer.disconnect()},[]);
 useEffect(()=>{
  if(!visible||!auto)return;
  const timers:ReturnType<typeof setTimeout>[]=[];
  if(scene===0){
   if(question===0){timers.push(setTimeout(()=>setPointer(true),900),setTimeout(()=>setPersons(2),1350),setTimeout(()=>setPointer(false),1800),setTimeout(()=>setQuestion(1),2300))}
   else timers.push(setTimeout(()=>setPointer(true),900),setTimeout(()=>setUsage(1),1350),setTimeout(()=>setPointer(false),1800),setTimeout(()=>setScene(1),2300));
  }else if(scene<3)timers.push(setTimeout(()=>setScene(s=>s+1),scene===1?10000:22000));
  return()=>{timers.forEach(clearTimeout);setPointer(false)};
 },[visible,auto,scene,question]);
 const choose=(next:number)=>{setAuto(false);setScene(next);if(next===0){setQuestion(0);setPersons(null);setUsage(null)}};
 const copy=document.getElementById('municipal-calculator-explanation');
 return <><div ref={host} className="municipal-calculator-components wp-calculator-page pv-calculator-page">
  <div className="municipal-calculator-carousel"><div className="municipal-calculator-track">{scenes.map((station,index)=><section key={index} className="municipal-calculator-station" aria-label={station.title} aria-hidden={index!==scene} inert={index!==scene}>
   {index===0&&<div className="wp-input-page municipal-question-station"><div className="municipal-question-content" key={question}><div className="municipal-question-options">
    <PvHouseholdQuestion columns={2} field={question===0?'personen':'nutzung'} selected={question===0?persons:usage} onSelect={i=>{setAuto(false);if(question===0){setPersons(i);setQuestion(1)}else{setUsage(i);setScene(1)}}}/>

    {pointer&&<span className="wp-solar-pointer municipal-demo-pointer" style={{left:question===0?'25%':'75%',top:question===0?'75%':'40%'}} aria-hidden="true"/>}
   </div></div></div>}
   {index===1&&<ResultStation basis={basis} values={values} active={scene===1&&visible}/>}
   {index===2&&<RaceStation basis={basis} values={values} playing={visible&&scene===2}/>}
   {index===3&&<ConsumerStation basis={basis} values={values}/>}
  </section>)}</div></div>
 </div>{copy&&createPortal(<div className="calculator-scene-copy"><div className="calculator-copy-stack">{scenes.map((item,index)=><div key={index} className="calculator-scene-text" aria-hidden={index!==scene} data-active={index===scene}><p className="calculator-scene-count">{index+1} / {scenes.length}</p><h4>{item.title}</h4><p>{item.copy}</p></div>)}</div>
  <nav className="municipal-carousel-nav" aria-label="Rechner-Vorführung">
   <button type="button" className="municipal-carousel-arrow" aria-label="Vorherige Station" disabled={scene===0} onClick={()=>choose(scene-1)}><IconChevronLeft size={20}/></button>
   <div className="municipal-carousel-dots">{scenes.map((item,index)=><button key={index} type="button" aria-label={`Station ${index+1}: ${item.title}`} aria-current={scene===index?'step':undefined} onClick={()=>choose(index)}><span/></button>)}</div>
   <button type="button" className="municipal-carousel-arrow" aria-label="Nächste Station" disabled={scene===scenes.length-1} onClick={()=>choose(scene+1)}><IconChevronRight size={20}/></button>
  </nav></div>,copy)}</>;
}
