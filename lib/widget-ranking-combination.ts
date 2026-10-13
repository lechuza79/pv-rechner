import type {GemeindePaket} from './gemeinde-paket';
import type {RankingCategory} from '../components/gemeinde/RankingWidgetCombination';
import {kopfPlatzierung, RANKING_UNITS, genitiv} from '../components/gemeinde/rangliste-daten';
import {klasseVon} from './gemeindegroesse';
import {istStadtstaat} from './atlas-orte';
import {widgetRankingRows} from './widget-ranking';

/** Preserve the municipality page's saved comparisons and opening selection. */
export function municipalRankingCombination(paket:GemeindePaket, land:{id:string;name:string}) {
  const common={place:paket.name,animate:true,shareParams:{ags:paket.ags,list:'on'}};
  const categories:RankingCategory[]=[];
  if(paket.district.peers.length>=3)categories.push({data:{...common,
    category:'count',title:'Zahl der Solaranlagen',unit:'Anlagen',scope:paket.kreis.name,
    stand:paket.rangStand,rows:widgetRankingRows(paket.district.peers,paket.ags),shareParams:{...common.shareParams,'ranking-category':'count'}}});
  // The existing municipal controller also offers these two local metrics.
  for(const metric of [{id:'storage',field:'speicher',title:'Speicherkapazität je Einwohner',unit:'Wh / Einwohner'},
    {id:'power',field:'kwp',title:'Solarleistung je Einwohner',unit:'Wp / Einwohner'}] as const) {
    const peers=paket.district.peers.filter(peer=>peer.population && peer.population>0)
      .map(peer=>({...peer,value:1000*peer.sums.alle[metric.field]/peer.population!}))
      .sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name,'de'));
    if(peers.length>=3)categories.push({data:{...common,category:metric.id,title:metric.title,unit:metric.unit,scope:paket.kreis.name,stand:paket.rangStand,
      shareParams:{...common.shareParams,'ranking-category':metric.id},rows:peers.map(peer=>({id:peer.region_id,name:peer.name,rank:1+peers.filter(other=>other.value>peer.value).length,value:peer.value,formatted:Math.round(peer.value).toLocaleString('de-DE'),own:peer.region_id===paket.ags}))}});
  }
  // The municipality page also offers per-resident solar power when its
  // comparison group is too small locally. Reuse its state/national source.
  if(paket.district.peers.length<3){
    const nationwide=istStadtstaat(paket.ags);
    const population=paket.register?.own.population;
    const klasse=(population?klasseVon(population):null)?.slug??'gemeinden-und-kleinstaedte';
    const params=new URLSearchParams({gebiet:nationwide?'':land.id,owner:'alle',klasse,region:paket.ags,voll:'1'});
    categories.push({format:'wattProKopf',selectedPlaceId:paket.ags,rowsUrl:`/api/atlas/nachbarn?${params}`,
      data:{...common,category:'power',title:'Solarleistung je Einwohner',unit:'Wp / Einwohner',scope:nationwide?'Deutschland':land.name,
        stand:paket.rangStand,rows:[],shareParams:{...common.shareParams,'ranking-category':'power'}}});
  }
  for(const rank of paket.rankings)categories.push({
    rank:rank.rank,distinction:rank.distinction,format:rank.format,selectedPlaceId:paket.ags,
    rowsUrl:`/api/gemeinde/rangliste?schluessel=${encodeURIComponent(rank.key)}`,
    data:{...common,category:rank.key,title:rank.label,unit:RANKING_UNITS[rank.format]??'',scope:rank.scope,
      stand:rank.asOf,rows:[],shareParams:{...common.shareParams,'ranking-category':rank.key}},
  });
  const opening=kopfPlatzierung(paket);
  const first=opening?.art==='auszeichnung'?paket.rankings[opening.index]?.key:'count';
  categories.sort((a,b)=>Number(b.data.category===first)-Number(a.data.category===first));
  return {categories,initialCategory:categories[0]?.data.category,label:`${genitiv(paket.name)} Platzierungen`};
}
