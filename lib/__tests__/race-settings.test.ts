import {describe,it,expect} from 'vitest';
import {parseRaceSettings,racePeriod,raceSettingsFromPeriod} from '../race-settings';
import {checkVideoParams,VIDEO_WIDGETS} from '../video-export-config';
describe('configured racing video',()=>{
 it.each(['kwp','per-capita'])('preserves the %s selection through the persisted job and render URL',(metric)=>{
  const s=parseRaceSettings({metric,segment:'private-roofs',cohort:'districts',highlight:'07335'});
  const job={widget:'regional-race' as const,ags:'07',period:racePeriod(s)};
  expect(checkVideoParams(job).ok).toBe(true);
  expect(raceSettingsFromPeriod(job.period)).toEqual(s);
  const url=new URL(VIDEO_WIDGETS[job.widget].embedPath(job),'https://example.org');
  expect(Object.fromEntries(url.searchParams)).toEqual(s);
 });
 it('rejects unsupported configuration in a render job',()=>{
  expect(checkVideoParams({widget:'regional-race',ags:'07',period:'race_evil_private-roofs_districts_07335'}).ok).toBe(false);
 });
});
