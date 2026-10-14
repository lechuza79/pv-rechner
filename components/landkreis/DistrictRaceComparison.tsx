'use client';
import {useState} from 'react';
import {districtRaceParams,districtRaceViews,type DistrictRaceConfig,type DistrictRaceView} from '../../lib/district-race-config';
import {useWidgetPresentation} from '../dashboard/WidgetPresentationContext';
import {ChoiceButtons} from '../AccordionField';
import DistrictRaceWidget,{type DistrictRaceWidgetProps} from './DistrictRaceWidget';

/** One mounted chart: switching never leaves a second animation running. */
export default function DistrictRaceComparison({districtId,config,views}:{districtId:string;config:DistrictRaceConfig;views:Partial<Record<DistrictRaceView,DistrictRaceWidgetProps>>}) {
  const appearance=useWidgetPresentation();
  const [view,setView]=useState(config.view);
  const race=views[view];
  const controls=config.toggle?<div role="group" aria-label="Vergleichsebene"><ChoiceButtons segmented options={districtRaceViews} selected={districtRaceViews.findIndex(option=>option.value===view)} onSelect={index=>setView(districtRaceViews[index].value)} render={option=>option.value==='districts'?'Landkreise':'Gemeinden'}/></div>:null;
  if(!race)return <div>{controls}<p role="status">Dieser Vergleich ist gerade nicht verfügbar. Bitte wähle die andere Ebene oder lade die Seite erneut.</p></div>;
  return <DistrictRaceWidget key={view} {...race} controls={controls} sharePath={'/embed/regional-race/'+districtId} shareParams={{...districtRaceParams({...config,view}),...(appearance.theme?{theme:appearance.theme}:{}),...(appearance.autoplay===undefined?{}:{autoplay:appearance.autoplay?'on':'off'})}}/>;
}
