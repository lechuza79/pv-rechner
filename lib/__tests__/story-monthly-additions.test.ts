import {describe,it,expect} from 'vitest';
import {appendMonthlyAdditions} from '../story-monthly-additions';
import type {DiscoveryReport,SolarRow} from '../story-discovery';
const report=()=>({regionId:'a',sourceDate:'2026-01-10',candidates:[]} as unknown as DiscoveryReport);
const row=(month:string,count=2):SolarRow=>({region_id:'a',month,count,kwp:count*10,segment:'gebaeude'});
describe('monthly additions recap',()=>{
 it('uses the last closed month across year boundaries and separates count and capacity',()=>{const r=report();appendMonthlyAdditions(r,[row('2025-12'),row('2026-01',99)],true);expect(r.candidates[0].additionsSeries).toMatchObject({months:expect.arrayContaining(['2025-01','2025-12']),counts:[0,0,0,0,0,0,0,0,0,0,0,2],kwp:[0,0,0,0,0,0,0,0,0,0,0,20]});});
 it('does not interpret an incomplete export or an empty history as zero news',()=>{for(const complete of [false,true]){const r=report();appendMonthlyAdditions(r,[],complete);expect(r.candidates).toHaveLength(0);}});
 it('allows a current zero recap only with activity in the preceding history',()=>{const r=report();appendMonthlyAdditions(r,[row('2025-11')],true);expect(r.candidates[0].title).toContain('noch kein');expect(r.candidates[0].additionsSeries?.counts[11]).toBe(0);});
 it('isolates municipalities and is idempotent',()=>{const r=report();const rows=[row('2025-12'),{...row('2025-12',99),region_id:'b'}];appendMonthlyAdditions(r,rows,true);appendMonthlyAdditions(r,rows,true);expect(r.candidates).toHaveLength(1);expect(r.candidates[0].evidence[0].value).toBe(2);});
 it('rejects invalid input',()=>{expect(()=>appendMonthlyAdditions(report(),[row('2025-12',-1)],true)).toThrow();});
});
