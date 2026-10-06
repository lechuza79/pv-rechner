import RegionAnlagentypEmbed from "./client";
import { WIDGET_METADATA } from "./meta";

// Einbettbares Widget: installierte Solarleistung nach Anlagentyp (private
// Dächer / Gewerbe / Freifläche) eines Bundeslands — echte MaStR-Daten.
// Parametrisiert über den 2-stelligen Bundesland-AGS (?bl=13).
//
// This address only answers requests WITHOUT a valid `bl`: the middleware
// rewrites every valid `?bl=…` onto the cached twin `[bl]/page.tsx`
// (lib/embed-pfad-weiche.ts). Reading searchParams here would make the whole
// route dynamic again — never cached, a full rebuild per embed view.
export const metadata = WIDGET_METADATA;

export default function RegionAnlagentypEmbedPage() {
  return <RegionAnlagentypEmbed error="Kein gültiges Bundesland angegeben." />;
}
