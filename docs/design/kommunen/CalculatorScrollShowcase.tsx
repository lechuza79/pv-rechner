import React,{useEffect,useRef,useState,type ReactNode} from 'react';
import {scenes,ResultStation,RaceStation,useShowcaseCalculation} from './CalculatorShowcase';
import PvHouseholdQuestion from '../../../components/PvHouseholdQuestion';
import PvConsumerSection from '../../../components/PvConsumerSection';
import {requiredConsumerFields,type PvConsumerValues} from '../../../components/PvConsumerFields';
import type {PvConsumerBasis} from '../../../lib/pv-consumer-model';

const scrollScenes=[...scenes.slice(0,3),
 {title:'Wärmepumpe: die Heizkosten verstehen.',copy:'Wie verändert eine Wärmepumpe die laufenden Heizkosten? Ihre Bürgerinnen und Bürger vergleichen die Kosten mit und ohne Solarstrom und erhalten zusätzliche Erläuterungen zur Berechnung.'},
 {title:'Das E-Auto mitdenken.',copy:'Auch das Laden zu Hause lässt sich einordnen: Der Vergleich zeigt die laufenden Fahrkosten und den zusätzlichen Nutzen des eigenen Solarstroms.'},
];

const benefits=[
 ['Wenige Fragen zu Haus und Alltag','Ohne technisches Vorwissen starten','Direkt zur persönlichen Beispielrechnung'],
 ['Investition und Amortisation einordnen','Ersparnis über die gesamte Laufzeit sehen','Ergebnis direkt und ohne Anmeldung'],
 ['Ergebnisse und Rechenannahmen nachvollziehen','Kosten und Ersparnis anschaulich vergleichen','Zusammenhänge und Fachbegriffe verstehen'],
 ['Heizkosten mit Gas oder Heizöl vergleichen','Zusätzlichen Nutzen des Solarstroms erkennen'],
 ['Laden zu Hause berücksichtigen','Fahrkosten und PV-Vorteil vergleichen'],
];
function Benefits({index}:{index:number}){return <ul className="municipal-step-benefits">{benefits[index].map(text=><li key={text}>{text}</li>)}</ul>}

function ConsumerSequence({basis,values}:{basis:PvConsumerBasis;values:PvConsumerValues}){
 const trigger=useRef<HTMLDivElement>(null);
 const [car,setCar]=useState(false);
 const [pointing,setPointing]=useState(false);
 const [configured,setConfigured]=useState<PvConsumerValues>(()=>({...values,wp:'geplant',ea:'nein'}));
 useEffect(()=>{
  const card=trigger.current?.querySelector('[data-consumer="ea"]');if(!card||car)return;
  let timers:ReturnType<typeof setTimeout>[]=[];
  const cancel=()=>{timers.forEach(clearTimeout);timers=[];setPointing(false)};
  const observer=new IntersectionObserver(([entry])=>{
   cancel();if(!entry.isIntersecting||entry.intersectionRatio<.65)return;
   timers=[setTimeout(()=>setPointing(true),700)];
  },{threshold:.65});
  observer.observe(card);return()=>{cancel();observer.disconnect()};
 },[car]);
 return <section className="municipal-consumer-sequence" aria-label="Zusätzliche Verbraucher verstehen">
  <div ref={trigger} className="municipal-scroll-visual wp-calculator-page pv-calculator-page">
   <PvConsumerSection id="municipal-scroll-consumers" values={configured} answered={new Set(requiredConsumerFields(configured))} basis={basis} presentation={{hideIntro:true,hideEdit:true,consumers:['wp','ea'],hintConsumer:pointing?'ea':null}} onApply={setConfigured} onSelectConsumer={kind=>{if(kind!=='ea'||car)return;setConfigured(previous=>({...previous,ea:'geplant'}));setCar(true);setPointing(false)}}/>
  </div>
  <div className="municipal-scroll-copy"><p className="eyebrow">04 / 04</p><h4>{scrollScenes[3].title}</h4><p>{scrollScenes[3].copy}</p><Benefits index={3}/>
   <div className="municipal-consumer-addition" data-revealed={car} aria-hidden={!car}><div><h4>{scrollScenes[4].title}</h4><p>{scrollScenes[4].copy}</p><Benefits index={4}/></div></div>
  </div>
 </section>;
}

function RevealStep({index,children}:{index:number;children:(visible:boolean)=>ReactNode}){
 const ref=useRef<HTMLElement>(null);
 const [visible,setVisible]=useState(false),[seen,setSeen]=useState(false);
 useEffect(()=>{const observer=new IntersectionObserver(([entry])=>{setVisible(entry.isIntersecting);if(entry.isIntersecting)setSeen(true)},{threshold:.15});if(ref.current)observer.observe(ref.current);return()=>observer.disconnect()},[]);
 return <section ref={ref} className="municipal-scroll-step" data-revealed={seen} aria-label={scrollScenes[index].title}>
  <div className="municipal-scroll-visual wp-calculator-page pv-calculator-page">{children(visible)}</div>
  <div className="municipal-scroll-copy"><p className="eyebrow">{index<4?`${String(index+1).padStart(2,'0')} / 04`:'Zusätzlich'}</p><h4>{scrollScenes[index].title}</h4><p>{scrollScenes[index].copy}</p><Benefits index={index}/></div>
 </section>;
}
function QuestionSequence({visible,onPerson,onUsage,persons,usage}:{visible:boolean;onPerson:(n:number)=>void;onUsage:(n:number)=>void;persons:number|null;usage:number|null}){
 const [question,setQuestion]=useState(0),[pointer,setPointer]=useState(false),[manual,setManual]=useState(false),[leaving,setLeaving]=useState(false);
 const advance=()=>setLeaving(true);
 useEffect(()=>{if(!leaving)return;const timer=setTimeout(()=>{setQuestion(1);setLeaving(false)},520);return()=>clearTimeout(timer)},[leaving]);
 useEffect(()=>{if(!visible||manual||usage!==null)return;const timers=[setTimeout(()=>setPointer(true),1100),setTimeout(()=>question===0?onPerson(2):onUsage(1),1600),setTimeout(()=>setPointer(false),2200)];if(question===0)timers.push(setTimeout(advance,2800));return()=>{timers.forEach(clearTimeout);setPointer(false)}},[visible,manual,question,usage]);
 return <div className="wp-input-page"><div className="municipal-question-options" key={question} data-leaving={leaving}>
  <PvHouseholdQuestion columns={2} field={question===0?'personen':'nutzung'} selected={question===0?persons:usage} onSelect={n=>{setManual(true);if(question===0){onPerson(n);advance()}else onUsage(n)}}/>
  {pointer&&<span className="wp-solar-pointer municipal-demo-pointer" style={{left:question===0?'25%':'75%',top:question===0?'75%':'40%'}} aria-hidden="true"/>}
 </div></div>;
}

export default function CalculatorScrollShowcase(){
 const [persons,setPersons]=useState<number|null>(null),[usage,setUsage]=useState<number|null>(null);
 const {basis,values}=useShowcaseCalculation(persons,usage);
 return <div className="municipal-scroll-steps">
  <RevealStep index={0}>{visible=><QuestionSequence visible={visible} persons={persons} usage={usage} onPerson={setPersons} onUsage={setUsage}/>}</RevealStep>
  <RevealStep index={1}>{visible=><ResultStation basis={basis} values={values} active={visible}/>}</RevealStep>
  <RevealStep index={2}>{visible=><RaceStation basis={basis} values={values} playing={visible}/>}</RevealStep>
  <ConsumerSequence basis={basis} values={values}/>
 </div>;
}
