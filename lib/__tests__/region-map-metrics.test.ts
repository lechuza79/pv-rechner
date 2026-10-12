import {describe,it,expect,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {regionMapMetrics} from '../region-map-metrics';
import type {AtlasChild,ChildYearRow} from '../atlas';

describe('regional map shared data',()=>{
  it('keeps capacity, plant count and storage separate and disables navigation in embeds',()=>{
    const towns=[{region_id:'06440016',name:'Nidda',slug:'nidda'},{region_id:'06440001',name:'Absent',slug:'absent'}] as AtlasChild[];
    const ranking={regions:[{region_id:'06440016',name:'Nidda',slug:'nidda',population:100}],cells:[
      {region_id:'06440016',year:2025,segment:'privat_dach',count:3,kwp:12,kwh:0},
      {region_id:'06440016',year:2025,segment:'batterie_privat',count:2,kwp:5,kwh:9},
    ] as ChildYearRow[]};
    const metrics=regionMapMetrics(towns,ranking);
    expect(metrics.map(metric=>metric.values.find(v=>v.id==='06440016')?.value)).toEqual([12,3,9]);
    expect(metrics.every(metric=>metric.values.find(v=>v.id==='06440001')?.value===null)).toBe(true);
    expect(metrics.flatMap(metric=>metric.values).every(v=>v.href===null)).toBe(true);
    expect(regionMapMetrics(towns,ranking,'/solar-atlas/hessen/wetteraukreis')[0].values.find(v=>v.id==='06440016')?.href).toBe('/solar-atlas/hessen/wetteraukreis/nidda');
  });
});
