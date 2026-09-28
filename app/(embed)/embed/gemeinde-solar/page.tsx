import GemeindeSolarWidget from "./client";
import { WIDGET_METADATA } from "./meta";

// Embeddable Gemeinde solar figures — the Outreach hook. A municipality drops
// this on its own site; it shows the same numbers as the atlas page, cookie-free
// and monthly-current. Server-rendered with ISR (data changes monthly), wrapping
// a client shell for theme + share/embed per the widget convention.
//
// This address only answers requests WITHOUT a valid `ags`: the middleware
// rewrites every valid `?ags=…` onto the cached twin `[ags]/page.tsx`
// (lib/embed-pfad-weiche.ts). Reading searchParams here would make the whole
// route dynamic again — never cached, a full rebuild per embed view.
export const metadata = WIDGET_METADATA;

export default function GemeindeSolarEmbed() {
  return <GemeindeSolarWidget error="Keine gültige Gemeinde angegeben." />;
}
