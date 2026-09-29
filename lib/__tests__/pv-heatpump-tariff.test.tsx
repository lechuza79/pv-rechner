import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import HeatPumpRunningComparison from '../../components/HeatPumpRunningComparison';
import {calcWpGridCost} from '../calc';
import {DEFAULT_HEATPUMP_CONFIG} from '../heatpump-config';
import {HEATING_YEARS} from '../fossil-reference';

describe('PV heat pump comparison follows the household meter',()=>{
  for(const price of [.31,.42]) it(`values remaining grid demand at ${price} without a second meter fee`,()=>{
    const html=renderToStaticMarkup(<HeatPumpRunningComparison strompreis={price} wpKwh={4000} jaz={3} wpAutarky={30} stromSteigerung={0} gasSteigerung={0}/>);
    const cost=calcWpGridCost(4000,.3,price,0,HEATING_YEARS)+DEFAULT_HEATPUMP_CONFIG.wpMaintenance*HEATING_YEARS;
    expect(html).toContain(Math.round(cost).toLocaleString('de-DE'));
    const wrongCost=calcWpGridCost(4000,.3,DEFAULT_HEATPUMP_CONFIG.wpTarif,0,HEATING_YEARS)+(DEFAULT_HEATPUMP_CONFIG.wpMaintenance+DEFAULT_HEATPUMP_CONFIG.wpFixCostPerYear)*HEATING_YEARS;
    expect(html).not.toContain(Math.round(wrongCost).toLocaleString('de-DE'));
  });
});
