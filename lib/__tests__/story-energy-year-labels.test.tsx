import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {AnnualEnergyChart} from '../../components/social/AnnualEnergyChart';
import type {EnergyYear} from '../story-energy-year';

const solar:EnergyYear={town:'Testort',year:2025,solarKwp:100,windKw:0,sourceDate:'2026-09-10',retrievedAt:'2026-09-10',sourceUrl:'https://archive-api.open-meteo.com/v1/archive',days:[{date:'2025-01-01',solarMwh:30,windMwh:0}]};

describe('annual story without wind',()=>{
 it('renders a solar-only heading, accessible label and legend',()=>{
  const html=renderToStaticMarkup(<AnnualEnergyChart data={solar}/>);
  expect(html).toContain('Testort im Solarjahr 2025');
  expect(html).not.toContain('Wind');
  expect(html).not.toContain('aria-label="Energieart"');
 });
 it('keeps wind visible even when its nonzero yield rounds to zero',()=>{
  const html=renderToStaticMarkup(<AnnualEnergyChart data={{...solar,windKw:1,days:[{...solar.days[0],windMwh:.001}]}}/>);
  expect(html).toContain('Solar und Wind: Testort im Energiejahr 2025');
  expect(html).toContain('aria-label="Energieart"');
 });
});
