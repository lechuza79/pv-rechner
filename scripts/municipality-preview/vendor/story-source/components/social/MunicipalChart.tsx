'use client';
import React from 'react';
import type {StoryConcept} from '../../lib/story-konzepte';
import {approvedStoryVisual} from '../../lib/story-approved-visual';
import {ApprovedStoryVisual} from './ApprovedStoryVisual';
import {YieldChart} from './YieldChart';
import {RankStoryChart} from './RankStoryChart';
import {MonthlySolarChart} from './MonthlySolarChart';
import {AnnualEnergyChart} from './AnnualEnergyChart';

/** Shared chart body for live municipal views and period-specific editorial snapshots. */
export function MunicipalChart({story,compact=false,autoPlay=false}:{story:StoryConcept;compact?:boolean;autoPlay?:boolean}){
 if(story.energyYear)return <AnnualEnergyChart data={story.energyYear} compact={compact}/>;
 if(story.solarMonth)return <MonthlySolarChart data={story.solarMonth} compact={compact} autoPlay={autoPlay}/>;
 if(story.kind==='rank'&&story.rankSummary?.length)return <RankStoryChart story={story} compact={compact}/>;
 const approved=approvedStoryVisual(story);
 if(approved)return <ApprovedStoryVisual bild={approved} compact={compact} date={story.sourceDate} provisional={story.label==='Vorjahreszeitraum'}/>;
 if(story.kind==='yield'&&story.yieldSeries?.length)return <YieldChart story={story} compact={compact}/>;
 return null;
}
