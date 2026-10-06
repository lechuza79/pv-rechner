import GemeindeErneuerbareEmbed from "./client";
import { WIDGET_METADATA } from "./meta";

// Einbettbares Widget: installierte erneuerbare Leistung nach Technologie je
// Gemeinde (MaStR). Server-gerendert mit ISR (Daten ändern sich monatlich),
// Client-Hülle für Theme + Teilen/Einbetten nach der Widget-Konvention.
//
// This address only answers requests WITHOUT a valid `ags`: the middleware
// rewrites every valid `?ags=…` onto the cached twin `[ags]/page.tsx`
// (lib/embed-pfad-weiche.ts). Reading searchParams here would make the whole
// route dynamic again — never cached, a full rebuild per embed view.
export const metadata = WIDGET_METADATA;

export default function GemeindeErneuerbareEmbedPage() {
  return <GemeindeErneuerbareEmbed error="Keine gültige Gemeinde angegeben." />;
}
