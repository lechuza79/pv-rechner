/** Validated, serializable settings shared by preview, data and video rendering. */
export type RaceSettings={metric:'count'|'kwp'|'per-capita';segment:'all'|'private-roofs'|'commercial-roofs'|'ground-mounted'|'balcony';cohort:'all'|'districts';highlight:string};
export const defaultRaceSettings:RaceSettings={metric:'count',segment:'all',cohort:'all',highlight:''};
export const kaiserslauternRaceSettings:RaceSettings={metric:'per-capita',segment:'private-roofs',cohort:'districts',highlight:'07335'};
export function parseRaceSettings(q:Record<string,string|undefined>):RaceSettings{
 return {metric:q.metric==='kwp'||q.metric==='per-capita'?q.metric:'count',segment:raceSegments.some(item=>item.value===q.segment)?q.segment as RaceSettings['segment']:'all',cohort:q.cohort==='districts'?'districts':'all',highlight:/^\d{2,8}$/.test(q.highlight??'')?q.highlight!:''};
}
export function racePeriod(s:RaceSettings){return `race_${s.metric}_${s.segment}_${s.cohort}_${s.highlight||'none'}`}
export function raceSettingsFromPeriod(period:string):RaceSettings{
 const [,metric,segment,cohort,highlight]=period.split('_');
 return parseRaceSettings({metric,segment,cohort,highlight});
}
export function raceQuery(s:RaceSettings){return new URLSearchParams(s).toString()}

export const raceSegments = [
 {value:'all',label:'Alle Solaranlagen',source:null,title:'Solaranlagen',context:'Berücksichtigt werden private und gewerbliche Anlagen einschließlich Freiflächen.'},
 {value:'private-roofs',label:'Private Dächer',source:'privat_dach',title:'Solaranlagen auf privaten Dächern',context:'Berücksichtigt werden private Dachanlagen, ohne Balkonkraftwerke.'},
 {value:'commercial-roofs',label:'Gewerbliche Dächer',source:'gewerbe_dach',title:'Solaranlagen auf gewerblichen Dächern',context:'Berücksichtigt werden gewerbliche Dachanlagen, ohne Freiflächen.'},
 {value:'ground-mounted',label:'Freiflächen',source:'freiflaeche',title:'Freiflächen-Solaranlagen',context:'Berücksichtigt werden ausschließlich Freiflächenanlagen.'},
 {value:'balcony',label:'Balkonkraftwerke',source:'steckersolar',title:'Balkonkraftwerke',context:'Berücksichtigt werden ausschließlich Steckersolaranlagen.'},
] as const;
