'use client';
import type {StoryConcept} from '../../lib/story-konzepte';
import {MunicipalWidgetVisual} from '../dashboard/MunicipalWidgetVisual';
/** Compatibility adapter for existing callers; all hosts use the common widget body. */
export function MunicipalChart({story,compact=false,autoPlay=false,ohneBedienung=false}:{story:StoryConcept;compact?:boolean;autoPlay?:boolean;ohneBedienung?:boolean}){
 return <MunicipalWidgetVisual story={story} view={{detail:compact?'reduced':'full',controls:!ohneBedienung,autoplay:autoPlay}}/>;
}
