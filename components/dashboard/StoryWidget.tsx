"use client";
import MunicipalStoryPreview from '../gemeinde/GemeindeInsights';
import {useWidgetPresentation} from './WidgetPresentationContext';
import type {StoryConcept} from '../../lib/story-konzepte';
export default function StoryWidget({stories,name}:{stories:StoryConcept[];name:string}){
 const appearance=useWidgetPresentation();
 return <MunicipalStoryPreview layout="contained" stories={stories} name={name} surfaceScheme={appearance.theme==='dark'?'dark':'light'} visualScheme={appearance.theme==='hero'?'highlight':appearance.theme??'dark'} showHeader={false} paused={appearance.autoplay===false}/>;
}
