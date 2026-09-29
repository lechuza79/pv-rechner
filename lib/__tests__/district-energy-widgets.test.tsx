import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {districtEnergyWidgets,valueCoverageNote} from '../../components/landkreis/DistrictEnergyWidgets';
import type {DistrictEnergy} from '../district-energy';

const value={euro:1000,feedInEuro:400,totalMwh:10,unitCount:5,approximateTariffCount:1,unknownModeCount:0,commercialSelfUseUnknownCount:0};
const solar=(month:string)=>({month,town:'Deutschland',days:[{date:`${month}-01`,mwh:1,mw:Array(24).fill(0)}],totalMwh:1,peakDay:`${month}-01`,peakMw:0,sourceDate:'2026-09-10',retrievedAt:'2026-09-10',sourceUrl:''}) as unknown as DistrictEnergy['monthly'][number]['solar'];
const energy=(valued:boolean[]):DistrictEnergy=>({valuationAssumptionDate:'2026-09-19',privateSelfConsumption:null,annual:[],
  monthly:valued.map((v,i)=>{const month=`2026-${String(8-i).padStart(2,'0')}`;return {month,solar:solar(month),value:v?value:null};})});
const render=(data:DistrictEnergy)=>{
  const out=districtEnergyWidgets({data,name:'Deutschland',regionId:'de'});
  // React separates interpolations with comments; strip them so text assertions see the sentence.
  return {notice:renderToStaticMarkup(<>{out.energyNotice}</>).replaceAll('<!-- -->',''),widget:renderToStaticMarkup(<>{out.energy?.['electricity-value']}</>)};
};

it('explains partial month coverage at the value widget, not as a page-wide notice',()=>{
  // Germany, 29.09.2026: values for Apr–Aug 2026 only; the selected month (August) is complete.
  const {notice,widget}=render(energy([true,true,false,false]));
  expect(notice).toBe('');
  expect(widget).toContain('August 2026');
  expect(valueCoverageNote(energy([true,true,false,false]))).toContain('Auswählbar sind 2 von 4 Monaten');
});

it('says nothing about coverage when every month has a value',()=>{
  const {notice,widget}=render(energy([true,true]));
  expect(notice).toBe('');
  expect(widget).toContain('August 2026');
  expect(valueCoverageNote(energy([true,true]))).toBeNull();
});

it('keeps the notice when no month can be valued, because no value widget is shown',()=>{
  const {notice,widget}=render(energy([false,false]));
  expect(widget).toBe('');
  expect(notice).toContain('noch nicht für alle Teilgebiete');
  expect(valueCoverageNote(energy([false,false]))).toBeNull();
});
