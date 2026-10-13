import {describe,it,expect} from 'vitest';
import {widgetRankingRows} from '../widget-ranking';
import type {SiblingRow} from '../atlas';
const peer=(id:string,name:string,count:number):SiblingRow=>({region_id:id,name,slug:null,population:null,sums:{alle:{count,kwp:0,speicher:0},privat:{count:0,kwp:0,speicher:0},gewerbe:{count:0,kwp:0,speicher:0}}});
describe('Shared ranking podium adapter',()=>{
 it('ranks tied values equally and deterministically without selecting a town for a district',()=>{
  const input=[peer('c','C',2),peer('b','B',10),peer('a','A',10),peer('d','D',1)];
  expect(widgetRankingRows(input).map(row=>[row.id,row.rank,row.own])).toEqual([['a',1,false],['b',1,false],['c',3,false]]);
  expect(input[0].region_id).toBe('c');
 });
 it('highlights only the explicitly selected municipality',()=>{
  expect(widgetRankingRows([peer('a','A',1494),peer('b','B',1200)],'b').map(row=>[row.formatted,row.own])).toEqual([['1.494',false],['1.200',true]]);
 });
});
