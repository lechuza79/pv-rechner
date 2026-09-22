import React from 'react';
import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {RankStoryChart} from '../../components/social/RankStoryChart';
import type {StoryConcept} from '../story-konzepte';
import type {RankMonthRow} from '../story-ranking-month';
const row:RankMonthRow={key:'balcony',label:'Balkonkraftwerke je 1.000 Einwohner',scope:'Wetteraukreis',rank:1,size:15,value:20,cohort:'same',rules:'same',state:'initial',href:'/solar-atlas/ranking/balkonkraftwerke-je-einwohner'};
const story=(r:RankMonthRow)=>({title:'Nidda: Platz 1',period:'2026-09',sourceDate:'2026-09-09',rankSummary:[r]} as StoryConcept);
it('uses the balcony badge with scope, denominator and honest initial status',()=>{
 const html=renderToStaticMarkup(<RankStoryChart story={story(row)}/>);
 expect(html).toContain('balcony-1-small.png');expect(html).toContain('von 15 Kommunen');expect(html).not.toContain('Erstmals erfasst');expect(html).not.toContain('<details');expect(html).toContain('Alle Platzierungen');expect(html).not.toContain('Platz gehalten');expect(html).toContain(row.href);
});
it('keeps retained rank explicit in compact previews',()=>{
 const html=renderToStaticMarkup(<RankStoryChart compact story={story({...row,state:'held',delta:0,previousRank:1})}/>);
 expect(html).toContain('Platz gehalten');expect(html).not.toContain('<a ');
});
it('does not reuse a podium badge for a top-100 position',()=>{
 const html=renderToStaticMarkup(<RankStoryChart story={story({...row,rank:94,size:10000})}/>);
 expect(html).toContain('top-100.svg');expect(html).toContain('Platz 94');expect(html).not.toContain('small.png');
});

it('accepts the already formatted month supplied by discovery',()=>{const html=renderToStaticMarkup(<RankStoryChart story={{...story(row),period:'Sept. 2026'}}/>);expect(html).toContain('Top-Platzierung im September 2026');});
