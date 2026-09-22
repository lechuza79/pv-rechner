import { notFound } from "next/navigation";
import { ladeGemeindePaket } from "../../../../../../lib/gemeinde-paket-server";
import { paketFuer } from "../../../../../../components/gemeinde/paket-teile";
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


export default async function GemeindeEinbettung(props: { params: Promise<{ ags: string; ansicht: string }> }) {
  const { ags, ansicht } = await props.params;
  if (!(ANSICHTEN as readonly string[]).includes(ansicht)) notFound();
  const paket = await ladeGemeindePaket(ags);
  if (!paket) notFound();
  const view = ansicht as (typeof ANSICHTEN)[number];
  return <GemeindeAnsicht ansicht={view} paket={paketFuer(view === "insights" ? "geschichten" : view, paket)} />;
}
