"use client";
import {useWidgetResource} from '../dashboard/WidgetData';
import {landscapeResourceUrl} from '../../lib/landscape-resource';
import {projectNiddaLandscape,niddaLandscapeTour} from "../../lib/landscape-tour";
import HeroLandscapeTour from "./HeroLandscapeTour";
import {IconArrowRight} from "../Icons";
import LocationMicroCard from "./LocationMicroCard";
import { useEffect, useMemo, useRef, useState } from 'react';
import type { BuildingPreview } from '../../lib/building-scene';
import {useWindConditions} from "../../lib/use-wind-conditions";
import RegionScene,{type SceneControls} from './RegionScene';
import GemeindeHeroStage from '../gemeinde/GemeindeHeroStage';
import styles from './wind-map.module.css';

export default function BuildingPreviewMap({ source,municipalHero=false,sceneOnly=false,onReady }: { source: string;municipalHero?:boolean;sceneOnly?:boolean;onReady?:(ready:boolean)=>void }) {
  const sceneResource=useWidgetResource<BuildingPreview|null>(landscapeResourceUrl(source),null,3600000);
  const overviewResource=useWidgetResource<Pick<BuildingPreview,'terrain'|'turbines'>|null>(landscapeResourceUrl('/geo/nidda-preview/wind-overview.json'),null,3600000);
  const solarResource=useWidgetResource<BuildingPreview|null>(landscapeResourceUrl('/geo/nidda-preview/solar.json'),null,3600000);
  const data=sceneResource.data,overview=overviewResource.data,solar=solarResource.data;
  const error=sceneResource.error||overviewResource.error||solarResource.error;
  useEffect(()=>{if(error&&(!data||!overview||!solar))onReady?.(false);},[error,!!data,!!overview,!!solar]);
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
    return projectNiddaLandscape(data,overview,solar,contours);
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
  if(municipalHero)return <HeroLandscapeTour sceneOnly={sceneOnly} onReady={onReady} data={niddaLandscapeTour(data,overview,solar)}/>;
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
