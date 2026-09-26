import React from 'react';
import {it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import type {StoryConcept} from '../story-konzepte';
vi.mock('../../components/social/YieldChart',()=>({YieldChart:()=> <span>yield-renderer</span>}));
vi.mock('../../components/social/RankStoryChart',()=>({RankStoryChart:()=> <span>rank-renderer</span>}));
vi.mock('../../components/social/MonthlySolarChart',()=>({MonthlySolarChart:()=> <span>month-renderer</span>}));
vi.mock('../../components/social/AnnualEnergyChart',()=>({AnnualEnergyChart:()=> <span>year-renderer</span>}));
import Preview from '../../components/social/MunicipalStoryPreview';
it('dispatches rank and radial stories without falling back to a yield chart',()=>{
 for(const [extra,expected] of [[{kind:'rank',rankSummary:[{}]},'rank-renderer'],[{kind:'radial',solarMonth:{}},'month-renderer'],[{kind:'radial',energyYear:{}},'year-renderer'],[{kind:'facts'},null]] as const){
  const story={id:'test',title:'Test',period:'2026-09',values:[],...extra} as unknown as StoryConcept;
  const html=renderToStaticMarkup(<Preview stories={[story]} name="Höchberg"/>);
  expect(html).not.toContain('yield-renderer');if(expected)expect(html).toContain(expected);
 }
});
