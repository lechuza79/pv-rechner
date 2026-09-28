import RegionSolarleistungEmbed from "./client";
import { WIDGET_METADATA } from "./meta";

// Einbettbares Widget: simulierte Momentan-Solarleistung des Anlagenbestands
// eines Bundeslands (Open-Meteo-Wetter am Landes-Mittelpunkt × MaStR-Leistung,
// kein Messwert). Parametrisiert über den 2-stelligen Bundesland-AGS (?bl=13).
//
// This address only answers requests WITHOUT a valid `bl`: the middleware
// rewrites every valid `?bl=…` onto the cached twin `[bl]/page.tsx`
// (lib/embed-pfad-weiche.ts). Reading searchParams here would make the whole
// route dynamic again — never cached, a full rebuild per embed view.
export const metadata = WIDGET_METADATA;

export default function RegionSolarleistungEmbedPage() {
  return <RegionSolarleistungEmbed error="Kein gültiges Bundesland angegeben." />;
}
