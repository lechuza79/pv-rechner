import NichtGefundenInhalt from "../../components/NichtGefundenInhalt";

/**
 * The 404 page for a React page that exists but finds nothing behind it — an
 * invented place in the Energie-Atlas, a funding page for a town we do not carry.
 *
 * Header and footer come from the (site) layout, the content from the shared
 * component — the same one app/global-not-found.tsx renders, so both 404s say and
 * look the same. Why there are two files at all, and what was measured: see that
 * component.
 *
 * KNOWN LIMIT, measured 20.09.2026 and not worth a hack: the browser tab here
 * keeps the site layout's title ("Lohnt sich Photovoltaik? Ehrlich berechnet.")
 * instead of saying "Seite nicht gefunden". A not-found file cannot export
 * metadata, and a rendered <title> loses against the title Next writes itself.
 * It would take a per-route workaround in every page that can 404 — the opposite
 * of the one source this page is built on. The page is noindex either way.
 *
 * KEEPS ANSWERING WITH HTTP 404: Next sets the status when notFound() is thrown;
 * nothing here may redirect or render a normal page instead. A soft 404 would tell
 * Google the invented address is a real page (see
 * lib/__tests__/atlas-soft-404.test.ts).
 */
export default function NichtGefunden() {
  return <NichtGefundenInhalt />;
}
