import {expect,it} from 'vitest';
import {storyCountGrid} from '../story-count-grid';
it('preserves exact totals and selections including the partial cell',()=>{
 for(const [total,selected] of [[4406,10],[71,3],[150001,1777]]){
  const {cells,perCell}=storyCountGrid(total,selected);
  expect(cells.length).toBeLessThanOrEqual(500);
  expect(cells.reduce((n,c)=>n+c.occupied*perCell,0)).toBeCloseTo(total);
  expect(cells.reduce((n,c)=>n+c.selected*perCell,0)).toBeCloseTo(selected);
 }
 const trier=storyCountGrid(4406,10);
 expect(trier.perCell).toBe(10);
 expect(trier.cells).toHaveLength(441);
 expect(trier.cells.at(-1)?.occupied).toBe(.6);
 expect(trier.cells[0].selected).toBe(1);
});

it('bounds a compact host without losing large or tiny selections',()=>{
 for(const [total,selected] of [[4031,343],[4999,1],[920,817],[500,0],[500,500],[150001,1777]]){
  const {cells,perCell}=storyCountGrid(total,selected,100);
  expect(cells.length).toBeLessThanOrEqual(100);
  expect(cells.reduce((n,c)=>n+c.occupied*perCell,0)).toBeCloseTo(total);
  expect(cells.reduce((n,c)=>n+c.selected*perCell,0)).toBeCloseTo(selected);
 }
 expect(storyCountGrid(4031,343).cells).toHaveLength(404);
 expect(storyCountGrid(4031,343,100).cells).toHaveLength(41);
});
