"use client";
import HeroLandscapeTour from "./HeroLandscapeTour";
import {IconArrowRight} from "../Icons";
import LocationMicroCard from "./LocationMicroCard";
import { useEffect, useMemo, useRef, useState } from 'react';
import { projectBuildingPreview, type BuildingPreview } from '../../lib/building-scene';
import {combineTerrain} from '../../lib/terrain-patches';
import {useWindConditions} from "../../lib/use-wind-conditions";
import RegionScene,{type SceneControls} from './RegionScene';
import GemeindeHeroStage from '../gemeinde/GemeindeHeroStage';
import styles from './wind-map.module.css';

export default function BuildingPreviewMap({ source,municipalHero=false,sceneOnly=false,onReady }: { source: string;municipalHero?:boolean;sceneOnly?:boolean;onReady?:(ready:boolean)=>void }) {
  const [data, setData] = useState<BuildingPreview | null>(null);
  const [overview, setOverview] = useState<Pick<BuildingPreview, 'terrain' | 'turbines'> | null>(null);
  const [solar,setSolar]=useState<BuildingPreview|null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/geo/nidda-preview/solar.json',{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('Solar geometry unavailable');return r.json();}).then(setSolar).catch(()=>{if(!controller.signal.aborted){setError(true);onReady?.(false);}});
    fetch('/geo/nidda-preview/wind-overview.json', {signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('Wind overview unavailable');return r.json();}).then(setOverview).catch(()=>{if(!controller.signal.aborted){setError(true);onReady?.(false);}});
    fetch(source, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error("Building scene unavailable");
      return response.json();
    }).then(setData).catch(() => { if (!controller.signal.aborted) {setError(true);onReady?.(false);} });
    return () => controller.abort();
  }, [source]);
  if (!data || !overview || !solar) return <p className={styles.weather} role="status">{error ? "Die Ortsdaten sind gerade nicht verfügbar. Bitte lade die Vorschau erneut." : "Nidda lädt …"}</p>;
  return <LoadedBuildingMap data={data} overview={overview} solar={solar} municipalHero={municipalHero} sceneOnly={sceneOnly} onReady={onReady} />;
}

function LoadedBuildingMap({ data, overview, solar,municipalHero,sceneOnly,onReady }: { sceneOnly:boolean;onReady?:(ready:boolean)=>void;municipalHero:boolean;solar:BuildingPreview; data: BuildingPreview; overview: Pick<BuildingPreview, 'terrain' | 'turbines'> }) {
  const weather=useWindConditions("06440016");
  const [reference]=useState(()=>municipalHero&&typeof window!=='undefined'&&new URLSearchParams(window.location.search).has('flugtest'));
  const [guide,setGuide]=useState(false);
  const [flying,setFlying]=useState(false);
  const [park,setPark]=useState(false);
  const [contours,setContours]=useState(true);
  const [view,setView]=useState<'town'|'wind'|'solar'>(()=>!reference&&typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('ansicht')==='solar'?'solar':'town');
  const [currentStop,setCurrentStop]=useState<string>(()=>view==='solar'?'Kläranlage Nidda':'Nidda');
  const pendingStop=useRef(currentStop);
  const onFlight=(moving:boolean,arrived?:boolean)=>{setFlying(moving);if(arrived)setCurrentStop(pendingStop.current);};
  const projected = useMemo(() => {
    const [w,n,e,s]=overview.terrain.groundBounds;
    const scale=700/Math.max(e-w,s-n), centre:[number,number]=[(w+e)/2,(n+s)/2];
    const buildings=Array.from(new Map([...data.buildings,...solar.buildings].map(b=>[b.id,b])).values());
    const result=projectBuildingPreview({...data,...overview,buildings,solar:solar.solar,locations:solar.locations},scale,centre);
    // Keep the detailed local surfaces in the same world throughout every flight.
    const patches=[data,solar].map(d=>projectBuildingPreview(d,scale,centre).terrain);
    result.terrain=combineTerrain(result.terrain,patches);
    if(contours)result.terrain.display='contours';
    const destination=(d:BuildingPreview)=>{const [w,n,e,s]=d.terrain.groundBounds;return {x:((w+e)/2-centre[0])*scale,z:((n+s)/2-centre[1])*scale,zoom:12};};
    const park=result.turbines.filter(t=>t.hub!==null);
    const turbine={x:park.reduce((sum,t)=>sum+t.x,0)/park.length,z:park.reduce((sum,t)=>sum+t.z,0)/park.length};
    const town=destination(data);
    result.locations=[...(result.locations??[]),{id:'nidda-market',name:'Nidda',x:town.x,z:town.z},{id:'nidda-windpark',name:'Windpark Fauerbach',...turbine}];
    if(!result.locations.some(p=>p.id==='nidda-sewage'))result.locations.push({id:'nidda-sewage',name:'Kläranlage Nidda',...destination(solar)});
    return {...result,destinations:{town:destination(data),solar:destination(solar),park:{x:turbine.x,z:turbine.z,zoom:8,throughPark:true}}};
  }, [data,overview,solar,contours]);
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false);
  const values = useMemo(() => [], []);
  const envelope = useMemo(() => ({ 'nidda-marktplatz': 0 }), []);
  const controls = useRef<SceneControls|null>(null);
  const hasDeparted=useRef(false);
  const flyToStop=(next:'town'|'park'|'solar')=>{
    if(flying)return;
    const from=currentStop==='Windpark Fauerbach'?'park':currentStop==='Kläranlage Nidda'?'solar':'town';
    if(from===next)return;
    pendingStop.current=next==='park'?'Windpark Fauerbach':next==='solar'?'Kläranlage Nidda':'Nidda';
    if(!hasDeparted.current&&from==='town'&&next==='park')controls.current?.previewReference(projected.destinations.town,projected.destinations.park);
    else controls.current?.leaveReferencePark(projected.destinations[from],projected.destinations[next]);
    hasDeparted.current=true;
  };
  const replay=()=>flyToStop('park');
  const returnHome=()=>flyToStop('town');
  const onward=()=>flyToStop('solar');
  const travel=(next:'town'|'wind'|'solar')=>{pendingStop.current=next==='solar'?'Kläranlage Nidda':'Nidda';setPark(false);setView(next);if(next==='wind')controls.current?.reset();else controls.current?.flyTo(projected.destinations[next]);};
  const visitPark=()=>{pendingStop.current='Windpark Fauerbach';setPark(true);setView('wind');controls.current?.flyTo(projected.destinations.park);};
  const nextStop=park?'solar':view==='solar'?'town':'park';
  const stopName=park?'Windpark Fauerbach':view==='solar'?'Kläranlage Nidda':view==='town'?'Nidda':'Nidda';
  if(municipalHero)return <HeroLandscapeTour sceneOnly={sceneOnly} onReady={onReady} data={{...projected,municipality:'06440016',name:'Nidda',stops:[
    {id:'nidda-market',name:'Nidda',kind:'town',...projected.destinations.town},
    {id:'nidda-windpark',name:'Windpark Fauerbach',kind:'wind',capacityKw:projected.turbines.every(t=>t.ratedKw!=null)?projected.turbines.reduce((sum,t)=>sum+(t.ratedKw??0),0):null,...projected.destinations.park},
    {id:'nidda-sewage',name:'Kläranlage Nidda',kind:'solar',capacityKw:null,...projected.destinations.solar}
  ]}}/>;
  const sceneContent=<>
      <RegionScene cardBottomSpace={reference?180:90} locationCard={municipalHero?{visible:!flying,id:currentStop==='Windpark Fauerbach'?'nidda-windpark':currentStop==='Kläranlage Nidda'?'nidda-sewage':'nidda-market',content:<LocationMicroCard name={currentStop} weather={weather}/>} :undefined} windConditions={weather} onFlight={onFlight} {...projected} heightEnvelope={envelope} values={values} windScale={1}
        selected="" hovered={null} onHover={() => {}} onSelect={id => {
          if(reference){
            if(flying)return;
            if(id==='nidda-sewage')onward();
            else if(id==='nidda-windpark')replay();
            else if(id==='nidda-market')returnHome();
            return;
          }
          if(id==='nidda-sewage')travel('solar');else if(id==='nidda-market')travel('town');else if(id==='nidda-windpark')visitPark();else controls.current?.focus(id);
        }}
        onReady={ok => { setReady(ok); setFailed(!ok); if(ok&&reference)controls.current?.previewReference(projected.destinations.town,projected.destinations.park,false);else if(ok&&park)controls.current?.flyTo(projected.destinations.park,false);else if(ok&&view!=='wind')controls.current?.flyTo(projected.destinations[view],false); }} onControls={api => { controls.current = api; }} />
      {ready&&<div className={`${styles.tour} ${municipalHero?styles.heroTour:''}`} data-tour>
        <p aria-live="polite">{reference?(flying?`Unterwegs · ${pendingStop.current}`:currentStop):flying?`Unterwegs nach · ${stopName}`:stopName}</p>
        {reference?<div className={styles.referenceControls}>
          <label><input type="checkbox" checked={guide} onChange={e=>{setGuide(e.target.checked);controls.current?.showReferencePath(e.target.checked);}}/> Flugbahn zeigen</label>
          <button type="button" disabled={flying} onClick={currentStop==='Windpark Fauerbach'?onward:currentStop==='Kläranlage Nidda'?returnHome:replay}>{flying?'Referenzflug läuft':currentStop==='Windpark Fauerbach'?'Zur Kläranlage':currentStop==='Nidda'?'Zum Windpark':'Nach Nidda'} <span aria-hidden="true"><IconArrowRight size={20}/></span></button>
        </div>:<button type="button" onClick={()=>nextStop==='park'?visitPark():travel(nextStop)}>{nextStop==='park'?'Zum Windpark Fauerbach':nextStop==='town'?'Nach Nidda':'Zur Kläranlage'} <span aria-hidden="true"><IconArrowRight size={20}/></span></button>}
      </div>}
      {!ready && <p className={styles.loading}>{failed ? 'Die 3D-Ansicht ist in diesem Browser nicht verfügbar.' : 'Nidda lädt …'}</p>}
    </>;
  return <section data-map-hero-band className={`${styles.band} ${municipalHero?styles.municipalBand:''} ${reference?styles.referenceMode:''}`}>
    {municipalHero?<GemeindeHeroStage productPreview name="Nidda" parents={[{name:'Solar-Atlas',href:'/solar-atlas'},{name:'Hessen',href:'/solar-atlas/hessen'}]} description="Zeigen Sie, was sich in Ihrer Kommune bewegt." discoverHref="#landscape-notes" scene={<div data-map-hero-stage className={styles.municipalScene} data-flying={flying} data-building-map data-ready={ready}>{sceneContent}</div>}/>:<div data-map-hero-stage className={styles.stage} data-building-map data-ready={ready}>{sceneContent}</div>}
    {!failed && <div className={styles.tools}><span>{contours?'Höhenlinien: nah alle 2 Meter, in der Ferne nur 10 bzw. 50 Meter':'Ziehen zum Drehen · ein gemeinsamer Maßstab'}</span>
      <div>{<button type="button" aria-pressed={contours} onClick={()=>setContours(!contours)}>{contours?'Mit Grundplatte':'Nur Höhenlinien'}</button>}<button type="button" aria-label="Vergrößern" onClick={() => controls.current?.zoom(1.6)}>+</button>
        <button type="button" aria-label="Verkleinern" onClick={() => controls.current?.zoom(1 / 1.6)}>−</button>
        <button type="button" onClick={() => travel('wind')}>Gesamtansicht</button>
        <button type="button" aria-pressed={view==='town'} onClick={()=>travel('town')}>Nidda</button>
        <button type="button" aria-pressed={view==='solar'} onClick={()=>travel('solar')}>PV Kläranlage</button>
        <button type="button" onClick={visitPark}>Windpark Fauerbach</button></div>
    </div>}
    <p className={styles.weather} data-wind-weather>{weather?`Wind aktuell: ${weather.directionDeg.toFixed(0)}° · ${weather.speedMs.toFixed(1)} m/s · Stand ${new Date(weather.validAt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'})} Uhr. Berechnete Wetterdaten für Nidda. Gondeln folgen der Windrichtung, Drehzahl geschätzt aus Wind in 10 m Höhe.`:'Winddaten gerade nicht verfügbar – Rotoren pausiert.'} Nabenhöhen und Rotordurchmesser nach Register, im Geländemaßstab.</p>
    {view==='wind'&&<p className={styles.weather}>Gebäude sind bisher für Marktplatz und Kläranlage geladen. Die Übersicht verbindet diese Ausschnitte mit den Windstandorten. <a href="https://www.openstreetmap.org/copyright">Solarflächen und Kläranlage: © OpenStreetMap-Mitwirkende · ODbL</a></p>}
    {view==='solar'&&!municipalHero&&<p className={styles.weather} data-solar-note><strong>PV an der Kläranlage Nidda</strong><br/>Drei kartierte Reihenflächen, am amtlichen Luftbild gegengeprüft. Kartierte Reihenflächen, bestückt mit unserem Dach-Modell. Module schematisch nach Süden ausgerichtet, 25° geneigt; Anzahl, Aufständerung und Neigung sind keine Bestandsmessung. Keine vollständige Solarpark-Inventur und noch kein eindeutiger Registerabgleich.<br/><a href="https://www.openstreetmap.org/copyright">© OpenStreetMap-Mitwirkende · ODbL</a> · <a href="https://www.zov.de/news/starkes-zeichen-fuer-eine-zukunftsfaehige-abwasserbehandlung.html">Betreibernachweis</a> · <a href="/geo/nidda-preview/solar.json">Geometrien und Quellen</a></p>}
    {municipalHero&&view==='solar'&&<p className={styles.weather}><a href="https://www.openstreetmap.org/copyright">Solarflächen: © OpenStreetMap-Mitwirkende · ODbL</a></p>}
  </section>;
}
