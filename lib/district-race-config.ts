import {defaultRaceSettings,kaiserslauternRaceSettings,parseRaceSettings,raceSegments,type RaceSettings} from './race-settings';

export const districtRaceViews = [
  {value:'districts',label:'Landkreise im Bundesland'},
  {value:'municipalities',label:'Gemeinden im Landkreis'},
] as const;
export type DistrictRaceView = typeof districtRaceViews[number]['value'];
type Measures = Pick<RaceSettings,'metric'|'segment'>;
export type DistrictRaceConfig = {
  toggle:boolean;
  view:DistrictRaceView;
  measures:Measures;
  overrides:Partial<Record<DistrictRaceView,Partial<Measures>>>;
};

/** Existing county presets remain the initial view; geography is never a free-form cohort. */
export function defaultDistrictRaceConfig(id:string):DistrictRaceConfig {
  const settings=id==='07335'?kaiserslauternRaceSettings:defaultRaceSettings;
  return {toggle:true,view:id==='07335'?'districts':'municipalities',measures:{metric:settings.metric,segment:settings.segment},overrides:{}};
}

export function parseDistrictRaceConfig(id:string,query:Record<string,string|undefined>):DistrictRaceConfig {
  const defaults=defaultDistrictRaceConfig(id);
  const common=parseRaceSettings({...defaults.measures,...query});
  const overrides:DistrictRaceConfig['overrides']={};
  for(const {value:view} of districtRaceViews){
    const metric=query[view+'Metric'],segment=query[view+'Segment'];
    const override:Partial<Measures>={};
    if(metric==='count'||metric==='kwp'||metric==='per-capita')override.metric=metric;
    if(raceSegments.some(item=>item.value===segment))override.segment=segment as Measures['segment'];
    if(Object.keys(override).length)overrides[view]=override;
  }
  return {toggle:query.toggle!=='off',view:query.view==='districts'||query.view==='municipalities'?query.view:defaults.view,measures:{metric:common.metric,segment:common.segment},overrides};
}

export function districtRaceParams(config:DistrictRaceConfig):Record<string,string> {
  const result:Record<string,string>={comparison:'district',toggle:config.toggle?'on':'off',view:config.view,...config.measures};
  for(const {value:view} of districtRaceViews)for(const [key,value] of Object.entries(config.overrides[view]??{}))result[view+key[0].toUpperCase()+key.slice(1)]=value;
  return result;
}

export function districtRaceSelection(id:string,config:DistrictRaceConfig,view=config.view) {
  return {regionId:view==='districts'?id.slice(0,2):id,settings:{...defaultRaceSettings,...config.measures,...config.overrides[view],cohort:view==='districts'?'districts' as const:'all' as const,highlight:view==='districts'?id:''}};
}

/** Titles follow the actual selection in every host and in exported images. */
export function regionalRaceWording(level:string,settings:RaceSettings) {
  const wording=level==='de'?{title:'Welches Bundesland hat die meisten Solaranlagen?',members:'Alle Bundesländer',leaders:'Die zehn führenden Bundesländer',unit:'Bundesländer'}:level==='bundesland'?{title:'Welcher Kreis hat die meisten Solaranlagen?',members:'Alle Landkreise und kreisfreien Städte',leaders:'Die zehn führenden Kreise',unit:'Kreise'}:{title:'Welche Gemeinde hat die meisten Solaranlagen?',members:'Alle Gemeinden im Landkreis',leaders:'Die zehn führenden Gemeinden',unit:'Orte'};
  if(settings.metric!=='count')wording.title='Installierte Solarleistung'+(settings.metric==='per-capita'?' je Einwohner':'');
  if(settings.segment!=='all'){
    const segment=raceSegments.find(item=>item.value===settings.segment)!;
    wording.title=(settings.metric==='count'?'Zahl der ':'Solarleistung: ')+segment.title+(settings.metric==='per-capita'?' je Einwohner':'');
    if(settings.segment==='private-roofs'&&settings.metric!=='count')wording.title='Solarleistung auf privaten Dächern'+(settings.metric==='per-capita'?' je Einwohner':'');
  }
  if(level==='bundesland'&&settings.cohort==='districts')Object.assign(wording,{unit:'Landkreise',members:'Alle Landkreise',leaders:'Die zehn führenden Landkreise'});
  return wording;
}
