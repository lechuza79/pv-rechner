import test from 'node:test';
import assert from 'node:assert/strict';
import {seasonalFoliage, leafSeed} from '../../public/hero-system/source/seasonal-foliage.js';
import {sceneState} from '../../public/hero-system/source/scene-state.js';

test('autumn colours and thinning progress without a month boundary switch', () => {
  let previous = {color:0,loss:0};
  for(let time=Date.parse('2026-09-15T12:00:00+02:00');time<=Date.parse('2026-12-15T12:00:00+01:00');time+=3600000){
    const next=seasonalFoliage(new Date(time));
    for(const key of ['color','loss']){
      assert.ok(next[key]>=previous[key]);
      assert.ok(next[key]-previous[key]<.003,'no sudden calendar transition');
      assert.ok(next[key]>=0&&next[key]<=1);
    }
    previous=next;
  }
  assert.deepEqual(previous,{color:1,loss:1});
  const today=seasonalFoliage(new Date('2026-10-04T12:00:00+02:00'));
  assert.ok(today.color>.1&&today.color<.4,'early October retains green leaves');
  assert.ok(today.loss<.05,'early October retains almost the whole crown');
});

test('winter stays bare through New Year and the calendar repeats annually',()=>{
  for(const date of ['2026-12-01','2026-12-31','2027-01-01','2027-02-28']){
    assert.deepEqual(seasonalFoliage(new Date(date+'T12:00:00+01:00')),{color:1,loss:1});
  }
  assert.deepEqual(seasonalFoliage(new Date('2028-10-15T12:00:00+02:00')),seasonalFoliage(new Date('2027-10-15T12:00:00+02:00')));
  assert.deepEqual(seasonalFoliage(new Date('2026-07-15T12:00:00+02:00')),{color:0,loss:0});
});

test('the shared scene state carries independent colour and leaf loss',()=>{
  const state=sceneState(new Date('2026-11-01T12:00:00+01:00'),{lat:50,lon:9},{wind:12,direction:270,cloud:10,rain:0,code:0});
  assert.ok(state.foliage.color>state.foliage.loss);
  const seeds=Array.from({length:1000},(_,i)=>leafSeed(i));
  const visible=loss=>seeds.filter(seed=>loss<.025+seed*.95).length;
  assert.equal(visible(0),1000);assert.equal(visible(1),0);
  assert.ok(visible(.25)>visible(.5)&&visible(.5)>visible(.75));
});
