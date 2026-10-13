import { readDistrictRankingSnapshot } from '../../lib/kreis-ranking-snapshot-server';
import { districtRankingCategories } from '../../lib/kreis-ranking-combination';
import RankingWidgetCombination from '../gemeinde/RankingWidgetCombination';
import foundation from '../social/atlas-foundations.module.css';
import styles from './landkreis.module.css';

export default async function LandkreisRanking({id,stateName,className}:{id:string;stateName:string;className?:string}) {
  const snapshot=await readDistrictRankingSnapshot();
  if(!snapshot)return null;
  const categories=districtRankingCategories(snapshot.kreise,id,stateName,snapshot.stand);
  if(!categories.length)return null;
  return <section className={className} aria-label="Platzierungen des Kreises"><div className={`${foundation.foundation} ${styles.rankingPanel}`} data-story-scheme="light" data-district-ranking={id}>
    <RankingWidgetCombination categories={categories} label="Platzierungen im Vergleich" initialCategory={categories[0].data.category}/>
  </div></section>;
}
