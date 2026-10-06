import type {SiblingSums} from './atlas';

/** One podium adapter for municipal and regional package readers. */
export function widgetRankingRows(peers:readonly {region_id:string;name:string;sums:Record<string,SiblingSums>}[],selected?:string) {
  const ordered=[...peers].sort((a,b)=>b.sums.alle.count-a.sums.alle.count||a.name.localeCompare(b.name,'de'));
  return ordered.slice(0,3).map(peer=>({
    id:peer.region_id,name:peer.name,value:peer.sums.alle.count,
    formatted:peer.sums.alle.count.toLocaleString('de-DE'),
    own:peer.region_id===selected,
    rank:ordered.findIndex(item=>item.sums.alle.count===peer.sums.alle.count)+1,
  }));
}
