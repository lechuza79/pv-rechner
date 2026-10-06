import GemeindeSolarleistungEmbed from "./client";
import { WIDGET_METADATA } from "./meta";

// Einbettbares Widget: standortgenaue 24-Stunden-Simulation der Solarleistung des
// Gemeinde-Bestands (Open-Meteo-Wetter × MaStR-Leistung, kein Messwert). Server-
// gerendert mit ISR; die Simulation selbst rechnet die Client-Hülle live.
//
// This address only answers requests WITHOUT a valid `ags`: the middleware
// rewrites every valid `?ags=…` onto the cached twin `[ags]/page.tsx`
// (lib/embed-pfad-weiche.ts). Reading searchParams here would make the whole
// route dynamic again — never cached, a full rebuild per embed view.
export const metadata = WIDGET_METADATA;

export default function GemeindeSolarleistungEmbedPage() {
  return <GemeindeSolarleistungEmbed error="Keine gültige Gemeinde angegeben." />;
}
