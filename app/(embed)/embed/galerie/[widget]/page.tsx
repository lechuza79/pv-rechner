import { Suspense } from "react";
import SolarTrendCard from "../../../../../components/SolarTrendCard";
import { getSolarMonthlySeries } from "../../../../../lib/solar-trend-data";
import { RankingPodiumWidget } from "../../../../../components/gemeinde/GemeindeRankingWidget";
import { notFound } from "next/navigation";
import { ladeGemeindePaket } from "../../../../../lib/gemeinde-paket-server";
import { paketFuer } from "../../../../../components/gemeinde/paket-teile";
import GemeindeAnsicht from "../../../../../components/gemeinde/GemeindeAnsicht";

const views = {
  "regional-current-power": "currentPower",
  "regional-annual-growth": "growth",
  "regional-composition": "anteilsdonut",
  "gemeinde-anlagenraster": "anlagenraster",
  "regional-electricity-value": "electricity-value",
  "regional-feed-in-value": "feed-in-value",
  "gemeinde-energie-jahr": "energy-year",
  "gemeinde-solar-monat": "radial",
} as const;
export default async function Page({params}: {params: Promise<{widget: string}>}) {
  const {widget} = await params;
  if (widget === "solar-trend-monat") {
    const series = await getSolarMonthlySeries();
    return series.length ? <Suspense fallback={<p>Wird geladen …</p>}><SolarTrendCard series={series}/></Suspense> : <p>Für den Monatsvergleich liegen noch keine Daten vor.</p>;
  }
  const single = views[widget as keyof typeof views];
  if (!single && widget !== "gemeinde-ranking") notFound();
  const paket = await ladeGemeindePaket("06440016");
  if (!paket) notFound();
  if (widget === "gemeinde-ranking") {
    const peers = [...paket.district.peers].sort((a, b) => b.sums.alle.count - a.sums.alle.count);
    const rows = peers.slice(0, 3).map(peer => ({id: peer.region_id, name: peer.name, value: peer.sums.alle.count, formatted: peer.sums.alle.count.toLocaleString("de-DE"), own: peer.region_id === paket.ags, rank: peers.findIndex(item => item.sums.alle.count === peer.sums.alle.count) + 1}));
    return <RankingPodiumWidget data={{place:paket.name,category:"count",title:"Zahl der Solaranlagen",unit:"Anlagen",scope:`${paket.kreis.name} · gleiche Größenklasse`,stand:paket.registerStand,rows,animate:true}}/>;
  }
  return <GemeindeAnsicht ansicht="monitor" paket={paketFuer("monitor", paket)} single={single}/>;
}
