import { notFound } from "next/navigation";
import { ladeGemeindeAnzeigePaket, ladeGemeindePaket } from "../../../../../../lib/gemeinde-paket-server";
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
// Built on every request, never stored (05.10.2026). These frames are loaded
// by whoever loads the municipality page, and over 11,000 addresses that is
// almost only crawlers that never ask twice: each stored copy was a paid
// cache write (up to three per page visit) for a read that never came. The
// same reasoning and the same switch as the deep rankings
// (app/(site)/solar-atlas/ranking-tief). A render reads only the town's
// package and the shared cached register series for its growth chart.
// Guarded by lib/__tests__/gemeinde-einbettung-ohne-ablage.test.ts.
export const dynamic = "force-dynamic";

const ANSICHTEN = ["insights", "monitor", "kopf"] as const;


export default async function GemeindeEinbettung(props: { params: Promise<{ ags: string; ansicht: string }> }) {
  const { ags, ansicht } = await props.params;
  if (!(ANSICHTEN as readonly string[]).includes(ansicht)) notFound();
  const paket = await (ansicht === "monitor" ? ladeGemeindeAnzeigePaket(ags) : ladeGemeindePaket(ags));
  if (!paket) notFound();
  const view = ansicht as (typeof ANSICHTEN)[number];
  return <GemeindeAnsicht ansicht={view} paket={paketFuer(view === "insights" ? "geschichten" : view, paket)} />;
}
