/** Validated, serializable settings shared by preview, data and video rendering. */
export type RaceSettings={metric:'count'|'kwp'|'per-capita';segment:'all'|'private-roofs';cohort:'all'|'districts';highlight:string};
export const defaultRaceSettings:RaceSettings={metric:'count',segment:'all',cohort:'all',highlight:''};
export const kaiserslauternRaceSettings:RaceSettings={metric:'per-capita',segment:'private-roofs',cohort:'districts',highlight:'07335'};
export function parseRaceSettings(q:Record<string,string|undefined>):RaceSettings{
 return {metric:q.metric==='kwp'||q.metric==='per-capita'?q.metric:'count',segment:q.segment==='private-roofs'?'private-roofs':'all',cohort:q.cohort==='districts'?'districts':'all',highlight:/^\d{2,8}$/.test(q.highlight??'')?q.highlight!:''};
}
export function racePeriod(s:RaceSettings){return `race_${s.metric}_${s.segment}_${s.cohort}_${s.highlight||'none'}`}
export function raceSettingsFromPeriod(period:string):RaceSettings{
 const [,metric,segment,cohort,highlight]=period.split('_');
 return parseRaceSettings({metric,segment,cohort,highlight});
}
export function raceQuery(s:RaceSettings){return new URLSearchParams(s).toString()}
