import {describe,it,expect} from 'vitest';
import fixture from './fixtures/kreis-ranking-rp-2026-10.json';
import {districtRankingCategories} from '../kreis-ranking-combination';
import type {KreisStats} from '../kreis-ranking';
import {checkedDistrictRankingSnapshot} from '../kreis-ranking-snapshot';
const districts=fixture.kreise as unknown as KreisStats[];
describe('district ranking composition',()=>{
 it('preserves the measured district rank and full comparison group',()=>{
  const categories=districtRankingCategories(districts,'07335','Rheinland-Pfalz','2026-10-01');
  const roofs=categories.find(c=>c.data.category==='dach-privat-pk:bundesland')!;
  expect(roofs.rank).toBe(3);
  expect(roofs.data.rows).toHaveLength(24);
  expect(roofs.data.rows.find(r=>r.own)?.id).toBe('07335');
  expect(roofs.data.rows.every(r=>r.id.length===5)).toBe(true);
  expect(roofs.data.scope).toBe('Rheinland-Pfalz · Landkreise');
  expect(categories.some(c=>c.data.category==='kreis-solar-gesamt-pk:de')).toBe(true);
 });
 it('never substitutes member municipality data or a self-comparison',()=>{
  expect(districtRankingCategories(districts,'07335001','Rheinland-Pfalz','2026-10-01')).toEqual([]);
  expect(districtRankingCategories(districts.filter(k=>k.regionId==='07335'),'07335','Rheinland-Pfalz','2026-10-01')).toEqual([]);
 });
 it('rejects a prepared file carrying municipality keys',()=>{
  expect(()=>checkedDistrictRankingSnapshot({version:1,stand:'2026-10-01',kreise:[{...districts[0],regionId:'07335001'}]})).toThrow();
 });
});
