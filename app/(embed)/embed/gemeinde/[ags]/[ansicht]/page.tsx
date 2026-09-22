import { notFound } from "next/navigation";
import { ladeGemeindePaket } from "../../../../../../lib/gemeinde-paket-server";
import type { GemeindePaket } from "../../../../../../lib/gemeinde-paket";
import GemeindeAnsicht from "../../../../../../components/gemeinde/GemeindeAnsicht";

/**
 * The municipality page's embedded views (new design, 09/2026).
 *
 * The approved design runs its story strip and energy monitor in frames: they
 * bring the widget base styles of this (embed) layout, which would collide
 * with the page's own. The page renders their text for crawlers itself; these
 * frames are the interactive layer. Never indexed (embed layout metadata).
 */
// One day: the package changes with the monthly run, and invalidating by
// route pattern does not reach pages built on demand (lib/atlas-revalidate-routen.ts).
export const revalidate = 86400;
export function generateStaticParams() {
  return [];
}

const ANSICHTEN = ["insights", "monitor", "kopf"] as const;

/**
 * Each frame gets only its part of the package. The whole package goes into
 * the frame as data (≈450 KB per frame, three frames per page); the stories
 * need the stories, the hero card two charts, the monitor the rest.
 */
function nurFuer(view: (typeof ANSICHTEN)[number], p: GemeindePaket): GemeindePaket {
  const leer = { ...p, stories: [], rankings: [], district: { ...p.district, peers: [] } } as GemeindePaket;
  if (view === "insights") return { ...leer, stories: p.stories, charts: null, register: null, monitorHistory: null, monitorPeriods: null, district: { ...p.district, peers: [], districtPeers: [] } } as unknown as GemeindePaket;
  if (view === "kopf") {
    const charts = p.charts ? { ...p.charts, charts: p.charts.charts.filter((c) => c.template === "feed-in-value" || c.template === "radial") } : null;
    const register = p.register ? { ...p.register, series: [], coverage: [] } : null;
    return { ...leer, charts, register, monitorHistory: null, monitorPeriods: null, district: { ...p.district, peers: [], districtPeers: [] } } as unknown as GemeindePaket;
  }
  return leer;
}

export default async function GemeindeEinbettung(props: { params: Promise<{ ags: string; ansicht: string }> }) {
  const { ags, ansicht } = await props.params;
  if (!(ANSICHTEN as readonly string[]).includes(ansicht)) notFound();
  const paket = await ladeGemeindePaket(ags);
  if (!paket) notFound();
  const view = ansicht as (typeof ANSICHTEN)[number];
  return <GemeindeAnsicht ansicht={view} paket={nurFuer(view, paket)} />;
}
