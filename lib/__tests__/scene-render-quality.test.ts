import {describe,it,expect} from 'vitest';
import {createSceneQuality,scenePixelRatio} from '../scene-render-quality';

describe('adaptive scene raster budget',()=>{
 it('caps high-DPI raster allocation even on a 4K display',()=>{
  const ratio=scenePixelRatio(3,3840,2160);
  expect(3840*2160*ratio*ratio).toBeLessThanOrEqual(2_000_001);
  expect(scenePixelRatio(1,1280,720)).toBe(1);
 });
 it('reduces resolution before capping animation cadence',()=>{
  const q=createSceneQuality();q.sample(0);
  for(let at=40;at<=3200;at+=40)q.sample(at);
  expect(q.level).toBe(1);expect(q.fps).toBe(60);
  expect(scenePixelRatio(2,1280,720,q.level)).toBe(1.25);
  for(let at=3240;at<=9600;at+=40)q.sample(at);
  expect(q.level).toBe(3);expect(q.fps).toBe(30);
 });
 it('does not degrade for isolated stalls or normal 60Hz frames',()=>{
  const q=createSceneQuality();let at=0;q.sample(at);
  for(let i=1;i<700;i++){at+=i%80===0?100:1000/60;q.sample(at);}
  expect(q.level).toBe(0);
 });
 it('does not combine slow samples across suspension',()=>{
  const q=createSceneQuality();q.sample(0);
  for(let at=40;at<=1600;at+=40)q.sample(at);
  q.reset();q.sample(10000);
  for(let at=10040;at<=11600;at+=40)q.sample(at);
  expect(q.level).toBe(0);
 });
 it('treats a long background gap as a fresh measurement window',()=>{
  const q=createSceneQuality();q.sample(0);
  for(let at=40;at<=1600;at+=40)q.sample(at);
  q.sample(10000);
  for(let at=10040;at<=11600;at+=40)q.sample(at);
  expect(q.level).toBe(0);
 });
});
