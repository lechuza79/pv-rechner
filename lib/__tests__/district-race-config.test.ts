import {describe,it,expect} from 'vitest';
import {defaultDistrictRaceConfig,parseDistrictRaceConfig,districtRaceParams,districtRaceSelection,regionalRaceWording} from '../district-race-config';
import {racePeriod,raceSettingsFromPeriod} from '../race-settings';
import {widgetShareUrl} from '../widget-share-url';

describe('district comparison contract',()=>{
  it('preserves both existing presets while using the same measure across views',()=>{
    const ordinary=defaultDistrictRaceConfig('12063');
    expect(ordinary.view).toBe('municipalities');
    expect(districtRaceSelection('12063',ordinary)).toEqual({regionId:'12063',settings:{metric:'count',segment:'all',cohort:'all',highlight:''}});
    const special=defaultDistrictRaceConfig('07335');
    expect(special.view).toBe('districts');
    expect(districtRaceSelection('07335',special)).toEqual({regionId:'07',settings:{metric:'per-capita',segment:'private-roofs',cohort:'districts',highlight:'07335'}});
    expect(districtRaceSelection('07335',special,'municipalities').settings).toMatchObject({metric:'per-capita',segment:'private-roofs',highlight:'',cohort:'all'});
  });
  it('round trips overrides and a fixed view without leaking overrides to its neighbour',()=>{
    const config=parseDistrictRaceConfig('12063',{view:'districts',toggle:'off',metric:'kwp',municipalitiesMetric:'per-capita',municipalitiesSegment:'balcony'});
    expect(parseDistrictRaceConfig('12063',districtRaceParams(config))).toEqual(config);
    expect(config.toggle).toBe(false);
    expect(districtRaceSelection('12063',config).settings).toMatchObject({metric:'kwp',segment:'all'});
    const local=districtRaceSelection('12063',config,'municipalities');
    expect(local.settings).toMatchObject({metric:'per-capita',segment:'balcony'});
    expect(regionalRaceWording('landkreis',local.settings).title).toBe('Solarleistung: Balkonkraftwerke je Einwohner');
  });
  it('rejects invalid overrides and cannot move the district comparison to a foreign state',()=>{
    const config=parseDistrictRaceConfig('12063',{view:'foreign',metric:'invalid',districtsMetric:'banana',districtsSegment:'wind',highlight:'07335',cohort:'all'});
    expect(config.overrides).toEqual({});
    expect(districtRaceSelection('12063',config,'districts')).toEqual({regionId:'12',settings:{metric:'count',segment:'all',cohort:'districts',highlight:'12063'}});
  });
  it('reconstructs the selected comparison from the shared link and the video request',()=>{
    const config=parseDistrictRaceConfig('12063',{view:'districts',metric:'kwp',districtsSegment:'private-roofs'});
    const url=widgetShareUrl('https://solar-check.io/solar-atlas/brandenburg/landkreis-havelland','race',districtRaceParams(config),'/embed/regional-race/12063',{});
    const restored=parseDistrictRaceConfig('12063',Object.fromEntries(url.searchParams));
    const selected=districtRaceSelection('12063',restored);
    expect(url.pathname).toBe('/embed/regional-race/12063');
    expect(selected.regionId).toBe('12');
    expect(raceSettingsFromPeriod(racePeriod(selected.settings))).toEqual(selected.settings);
  });
});
