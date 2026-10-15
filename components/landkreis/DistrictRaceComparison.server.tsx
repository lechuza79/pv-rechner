import {districtRaceSelection,regionalRaceWording,type DistrictRaceConfig,type DistrictRaceView} from '../../lib/district-race-config';
import {loadRegionalRace} from '../../lib/regional-race-server';
import type {DistrictRaceWidgetProps} from './DistrictRaceWidget';
import DistrictRaceComparison from './DistrictRaceComparison';

export default async function DistrictRaceComparisonServer({districtId,config,municipal}:{districtId:string;config:DistrictRaceConfig;municipal?:DistrictRaceWidgetProps}) {
  const enabled:DistrictRaceView[]=config.toggle?['districts','municipalities']:[config.view];
  const entries=await Promise.all(enabled.map(async view=>{
    const {regionId,settings}=districtRaceSelection(districtId,config,view);
    if(view==='municipalities'&&municipal)return [view,municipal] as const;
    const race=await loadRegionalRace(regionId,settings);
    return [view,race?{regionId,name:race.region.name,stand:race.stand,rows:race.rows,history:race.history,settings,wording:regionalRaceWording(race.region.level,settings)}:undefined] as const;
  }));
  return <DistrictRaceComparison districtId={districtId} config={config} views={Object.fromEntries(entries)}/>;
}
