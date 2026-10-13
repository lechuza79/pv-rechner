import {describe,it,expect} from 'vitest';
import {attributeImport} from '../import-attribution';
import {calculateImportMix,calculateTradeMix} from '../import-mix';
import {activePowerSegments,powerBarScale} from '../segmented-power';
describe('Import attribution',()=>{
 it('uses the nuclear model denominator and keeps storage separate',()=>{
  const mix=attributeImport(4,{nuclear:50,solar:25,hydro_pumped_storage:25,load:200,hydro_pumped_storage_consumption:-80,cross_border_electricity_trading:50,renewable_share:25});
  expect(mix).toEqual({nuclear:2,solar:1,hydro_pumped_storage:1});
 });
 it('conserves imported power, excludes exports and exposes missing supplier data',()=>{
  const result=calculateImportMix('2026-10-12T10:00:00Z',{france:3,netherlands:2,poland:-5,net:0},{france:{nuclear:2,solar:1}});
  expect(result.importGw).toBe(5);expect(result.unassignedGw).toBe(2);
  expect(result.segments.reduce((sum,row)=>sum+row.value,0)+result.unassignedGw).toBe(5);
 });
 it('does not invent a mix when generation is zero or missing',()=>{
  expect(attributeImport(2,{solar:0,nuclear:null})).toBeNull();
  expect(calculateImportMix('x',{france:0},{})).toMatchObject({importGw:0,unassignedGw:0,segments:[]});
 });
});
describe('Power segments',()=>{
 it('shares a scale and never pulses for zero or missing power',()=>{
  const max=powerBarScale([2.62,.03]);expect(max).toBe(3);
  expect(activePowerSegments(2.62,max)).toBe(18);
  expect(activePowerSegments(.03,max)).toBe(1);
  expect(activePowerSegments(0,max)).toBe(0);expect(activePowerSegments(null,max)).toBe(0);
 });
});

describe('Export attribution',()=>{
 it('conserves both totals using domestic MW and imported GW on one basis',()=>{
  const imports=calculateImportMix('x',{france:2},{france:{nuclear:100}});
  const trade=calculateTradeMix(imports,3,{solar:2000,hydro_pumped_storage:2000,load:100000});
  expect(trade.tradeRows.find(row=>row.id==='renewable')?.right).toBe(1);
  expect(trade.tradeRows.find(row=>row.id==='nuclear')).toMatchObject({left:2,right:1});
  expect(trade.tradeRows.find(row=>row.id==='storage')?.right).toBe(1);
  expect(trade.tradeRows.reduce((s,row)=>s+row.right,0)).toBe(3);
 });
 it('retains unknown imports in the export denominator and exposes missing domestic observations',()=>{
  const imports=calculateImportMix('x',{france:2},{});
  const trade=calculateTradeMix(imports,2,{solar:2000});
  expect(trade.tradeRows.find(row=>row.id==='unassigned')).toMatchObject({left:2,right:1});
  expect(calculateTradeMix(imports,2).tradeRows.find(row=>row.id==='unassigned')?.right).toBe(2);
 });
});
