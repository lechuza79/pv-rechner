"use client";
import WidgetPreviewCard from './WidgetPreviewCard';
import {defaultDistrictRaceConfig,districtRaceParams} from '../../lib/district-race-config';
import type {GalleryEntry,GalleryPlace} from '../../lib/widget-gallery';

/** Presets only supply initial data; all editing uses the common dashboard editor. */
export default function RacingPreviewCard({entry,place,preset}:{entry:GalleryEntry;place:GalleryPlace;preset?:boolean}) {
  const region=preset?'07335':place.districtId??place.stateId;
  const query=region.length===5?'?'+new URLSearchParams(districtRaceParams(defaultDistrictRaceConfig(region))):'';
  return <WidgetPreviewCard settingsWide entry={{...entry,placeLabel:preset?'Landkreis Kaiserslautern':entry.placeLabel,variants:[{label:'Racing-Chart',src:'/embed/regional-race/'+region+query,height:930}]}}/>;
}
