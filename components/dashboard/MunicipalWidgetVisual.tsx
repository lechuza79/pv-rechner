'use client';
import React from 'react';
import type {StoryConcept} from '../../lib/story-konzepte';
import {approvedStoryVisual} from '../../lib/story-approved-visual';
import {ApprovedStoryVisual} from '../social/ApprovedStoryVisual';
import {YieldChart} from '../social/YieldChart';
import {RankStoryChart} from '../social/RankStoryChart';
import {MonthlySolarChart} from '../social/MonthlySolarChart';
import {AnnualEnergyChart} from '../social/AnnualEnergyChart';

/** Shared chart body for live municipal views and period-specific editorial snapshots. */
export type MunicipalWidgetView = {detail?:'full'|'reduced'; controls?:boolean; autoplay?:boolean};
/** Hosts choose detail and interaction independently; the data and renderer stay identical. */
export function MunicipalWidgetVisual({story,view={}}:{story:StoryConcept;view?:MunicipalWidgetView}){
 const compact=view.detail==='reduced', autoPlay=view.autoplay??false, ohneBedienung=view.controls===false;
 if(story.energyYear)return <AnnualEnergyChart data={story.energyYear} compact={compact} ohneBedienung={ohneBedienung}/>;
 if(story.solarMonth)return <MonthlySolarChart data={story.solarMonth} compact={compact} autoPlay={autoPlay} ohneBedienung={ohneBedienung}/>;
 if(story.kind==='rank'&&story.rankSummary?.length)return <RankStoryChart story={story} compact={compact} ohneBedienung={ohneBedienung}/>;
 const approved=approvedStoryVisual(story);
 if(approved)return <ApprovedStoryVisual bild={approved} compact={compact} date={story.sourceDate} controls={!ohneBedienung} provisional={story.label==='Vorjahreszeitraum'}/>;
 if(story.kind==='yield'&&story.yieldSeries?.length)return <YieldChart story={story} compact={compact}/>;
 return null;
}
