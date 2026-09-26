import type { GemeindePaket } from "../../lib/gemeinde-paket";
import { kurztitel, type KurztitelStory } from "../../lib/story-kurztitel";

/**
 * The part of a town's package one interactive view needs. Whatever goes to
 * the browser as data is sent with the page; the whole package is about
 * 450 KB, the story strip needs the stories, the monitor the rest.
 */
export type PaketTeil = "geschichten" | "monitor" | "kopf";

export function paketFuer(teil: PaketTeil, p: GemeindePaket): GemeindePaket {
  const ohneOrte = { ...p.district, peers: [], districtPeers: [] };
  const schlank = { ...p, stories: [], rankings: [], district: { ...p.district, peers: [] } } as GemeindePaket;
  if (teil === "geschichten")
    return { ...schlank, stories: mitKurztitel(p), charts: null, register: null, monitorHistory: null, monitorPeriods: null, district: ohneOrte } as unknown as GemeindePaket;
  if (teil === "kopf") {
    const charts = p.charts ? { ...p.charts, charts: p.charts.charts.filter((c) => c.template === "feed-in-value" || c.template === "radial") } : null;
    const register = p.register ? { ...p.register, series: [], coverage: [] } : null;
    return { ...schlank, charts, register, monitorHistory: null, monitorPeriods: null, district: ohneOrte } as unknown as GemeindePaket;
  }
  return schlank;
}

/** The story cards show a short label (approved design); rules in lib/story-kurztitel.ts. */
function mitKurztitel(p: GemeindePaket) {
  return (p.stories as (KurztitelStory & Record<string, unknown>)[]).map((s) => {
    const kurz = kurztitel(s, p.name);
    return kurz ? { ...s, thumbLabel: kurz } : s;
  }) as GemeindePaket["stories"];
}
