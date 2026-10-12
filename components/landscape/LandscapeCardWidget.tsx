"use client";
import {useWidgetHost,useWidgetPlace} from '../dashboard/WidgetHost';
import {useWidgetResource} from '../dashboard/WidgetData';
import {useLandscapeWeather} from '../../lib/use-landscape-weather';
import type {LandscapeTourData} from '../landkreis/HeroLandscapeTour';
import LocationMicroCard from '../landkreis/LocationMicroCard';
import {ExportableWidgetFrame} from '../dashboard/ExportableWidgetFrame';
import {landscapePlaces} from '../../lib/landscape-places';
import {DataSourceNote} from '../PoweredBy';
import {WIDGETS} from '../../lib/widget-registry';
type LandscapeCardData=Pick<LandscapeTourData,'municipality'|'name'|'weatherMunicipality'|'stops'>;
export default function LandscapeCardWidget({placeId,initialStop}:{placeId:string;initialStop?:string}){
 const selectedPlace=useWidgetPlace(placeId);
 const host=useWidgetHost();
 const {data,error}=useWidgetResource<LandscapeCardData|null>(`/api/widgets/landscape-stops?ags=${selectedPlace}`,null,3600000);
 const selection=host?.query.stop??initialStop;
 const selectedKind=selection?.startsWith('wind-')?'wind':undefined;
 const stop=data?.stops.find(item=>item.id===selection)??(selectedKind?data?.stops.find(item=>item.kind===selectedKind):data?.stops[0]);
 const {data:microcharts,weather,loading,municipality}=useLandscapeWeather(data,stop);
 const params={ags:selectedPlace,...(stop?{stop:stop.id}:{})};
 const title=(stop?.kind??selectedKind)==='wind'?'Wind und Leistung vor Ort':'Solarleistung vor Ort';
 const placeName=landscapePlaces[selectedPlace]??data?.name??'';
 return <ExportableWidgetFrame exportDescription="Aus Wetterdaten modellierte Leistung, keine gemessenen Betriebsdaten." widget={WIDGETS.landscapeCard} place={stop?.name??placeName} stand={microcharts?.at??''} title={title} subtitle={stop?.name??placeName} kind="radial" filename={`standort-${selectedPlace}-${stop?.id??"ort"}`} shareParams={params} einbetten={{params,height:520}} help={<><p>Aus Wetterdaten modellierte Leistung des ausgewählten Standorts, keine gemessenen Betriebsdaten. Bei fehlender Anlagenzuordnung wird nur die relative Solarauslastung angezeigt.</p>{WIDGETS.landscapeCard.sources.map(source=><div key={source.url}><DataSourceNote source={source}/></div>)}</>} helpExportNote={false}>
  <div data-export-ready={!loading&&microcharts?'true':'false'} style={{padding:'0 var(--widget-padding) 20px'}}>{stop?<LocationMicroCard presentation="widget" name={stop.name} municipality={municipality} placeName={stop.kind==='town'?stop.name:placeName} kind={stop.kind} weather={weather} microcharts={microcharts} loading={loading} capacityKw={stop.capacityKw}/>:<p role={error?'alert':'status'}>{error?'Die Standortdaten sind gerade nicht verfügbar.':!data?'Standort wird geladen …':'Für diesen Ort ist kein passender Standort vorbereitet.'}</p>}</div>
 </ExportableWidgetFrame>;
}
