import KennzahlWidget from "./client";
import { WIDGET_METADATA } from "./meta";

// This address answers only requests without `metric`/`traeger` (the defaults).
// Any request carrying them is rewritten by the middleware onto the static twin
// `[metric]/[traeger]/page.tsx` (lib/embed-pfad-weiche.ts) — reading
// searchParams here would make the route dynamic, i.e. never cached.
export const metadata = WIDGET_METADATA;

export default function KennzahlEmbedPage() {
  return <KennzahlWidget metric="leistung" traeger="gesamt" />;
}
