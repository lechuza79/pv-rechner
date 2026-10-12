"use client";
import {useState} from 'react';
import {useWidgetPlace} from '../dashboard/WidgetHost';
import LandscapeHero,{LandscapeSources} from './LandscapeHero';
import {ExportableWidgetFrame} from '../dashboard/ExportableWidgetFrame';
import {WIDGETS} from '../../lib/widget-registry';
import {landscapePlaces,landscapeAttribution} from '../../lib/landscape-places';
export default function LandscapeWidget({placeId,hero=false,initialStop}:{placeId:string;hero?:boolean;initialStop?:string}){
 const selected=useWidgetPlace(placeId),[stop,setStop]=useState(initialStop);
 const [destinationTarget,setDestinationTarget]=useState<HTMLSpanElement|null>(null);
 const name=landscapePlaces[selected];
 const params={ags:selected,...(stop?{stop}:{}),...(hero?{presentation:'hero'}:{})};
 const widget={...WIDGETS.landscape,sources:[...WIDGETS.landscape.sources,{name:landscapeAttribution(selected),note:'Daten bearbeitet'},{name:'OpenStreetMap contributors',url:'https://www.openstreetmap.org/copyright',license:'ODbL'}]};
 return <ExportableWidgetFrame widget={widget} place={name} stand="" title="Energielandschaft" headingPlacement="overlay" subtitle={<span ref={setDestinationTarget} data-sc-export-ignore style={{display:"inline-block",maxWidth:"100%",pointerEvents:"auto",fontWeight:400}}/>} kind="map" filename={`energielandschaft-${selected}`} shareParams={params} einbetten={{params,height:760}} exportDescription="Orte, Solaranlagen und Windparks in der 3D-Landschaft. Leistung und Windbewegung sind aus Wetterdaten modelliert." help={<><p>Entdecke Orte, Solaranlagen und Windparks in der Landschaft. Wähle oben ein Ziel oder fliege mit den Pfeilen zur nächsten Station. Die Karten zeigen aus Wetterdaten modellierte Leistung.</p><LandscapeSources placeId={selected}/></>} helpExportNote={false}>
  <LandscapeHero placeId={selected} presentation="widget" initialStop={stop} onStopChange={setStop} destinationTarget={destinationTarget}/>
 </ExportableWidgetFrame>;
}
