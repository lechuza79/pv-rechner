import { KREIS_KATEGORIEN, kreisRangliste, type KreisStats, type KreisScope } from './kreis-ranking';
import { RANKING_UNITS } from '../components/gemeinde/rangliste-daten';
import { stufeFuer } from './atlas-format';
import type { RankingCategory } from '../components/gemeinde/RankingWidgetCombination';

/** Adapt only district comparisons. Never interpret a district's member towns as its peers. */
export function districtRankingCategories(kreise: KreisStats[], ownId: string, stateName: string, stand: string): RankingCategory[] {
  const own = kreise.find(k => k.regionId === ownId);
  if (!own) return [];
  const group = own.art === 'landkreis' ? 'landkreise' : 'alle';
  const scopes: KreisScope[] = [{ebene:'bundesland',landId:own.landId},{ebene:'de'}];
  return scopes.flatMap(scope => KREIS_KATEGORIEN.flatMap(category => {
    const list = kreisRangliste(kreise, category.key, scope, group);
    const selected = list.zeilen.find(row => row.regionId === ownId);
    if (!selected || list.zeilen.length < 2) return [];
    const scale = stufeFuer(category.format, Math.max(...list.zeilen.map(row => row.value)));
    const scopeName = `${scope.ebene === 'de' ? 'Deutschland' : stateName} · ${group === 'landkreise' ? 'Landkreise' : 'Kreise und kreisfreie Städte'}`;
    const key = `${category.key}:${scope.ebene}`;
    return [{rank:selected.rank, data:{place:own.name,category:key,title:category.label,unit:scale.unit || RANKING_UNITS[category.format] || '',scope:scopeName,stand,animate:true,shareParams:{ags:ownId,comparison:"districts","ranking-category":key},
      rows:list.zeilen.map(row=>({id:row.regionId,name:row.name,rank:row.rank,value:row.value,formatted:(row.value/scale.teiler).toLocaleString('de-DE',{maximumFractionDigits:category.format==='countPer1000'?1:scale.stellen}),own:row.regionId===ownId}))}}];
  }));
}
