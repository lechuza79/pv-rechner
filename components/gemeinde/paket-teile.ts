import type { GemeindePaket } from "../../lib/gemeinde-paket";

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
    return { ...schlank, stories: p.stories, charts: null, register: null, monitorHistory: null, monitorPeriods: null, district: ohneOrte } as unknown as GemeindePaket;
  if (teil === "kopf") {
    const charts = p.charts ? { ...p.charts, charts: p.charts.charts.filter((c) => c.template === "feed-in-value" || c.template === "radial") } : null;
    const register = p.register ? { ...p.register, series: [], coverage: [] } : null;
    return { ...schlank, charts, register, monitorHistory: null, monitorPeriods: null, district: ohneOrte } as unknown as GemeindePaket;
  }
  return schlank;
}
