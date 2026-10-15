import type { KreisStats } from './kreis-ranking';
export const DISTRICT_RANKING_PATH = 'district-rankings/current.json';
export type DistrictRankingSnapshot = { version:1; stand:string; builtAt:string; kreise:KreisStats[] };
export function checkedDistrictRankingSnapshot(value:unknown):DistrictRankingSnapshot {
  const v=value as DistrictRankingSnapshot;
  if(v?.version!==1 || !/^\d{4}-\d{2}-\d{2}/.test(v.stand) || !Array.isArray(v.kreise) || !v.kreise.length || v.kreise.some(k=>!/^\d{5}$/.test(k.regionId) || !['landkreis','kreisfrei'].includes(k.art) || !(k.population>0))) throw new Error('Invalid prepared district rankings');
  return v;
}
