import { NICHT_GEFUNDEN } from "../lib/nicht-gefunden";

/**
 * The visible part of the 404 page — ONE component for both places Next renders
 * a 404 from.
 *
 * Next decides which file answers, and the two cannot be merged: an address with
 * no route at all arrives before any layout exists (app/global-not-found.tsx has
 * to be a document of its own), while a page that exists and finds nothing behind
 * it is already inside the site layout (app/(site)/not-found.tsx). Measured on
 * 20.09.2026: drop the second one and an invented place in the Energie-Atlas falls
 * back to Next's bare default page.
 *
 * What CAN be one source is everything a visitor sees, and that is this file plus
 * lib/nicht-gefunden.ts (the words). Both mount points render it unchanged, so the
 * two pages cannot drift apart in wording or in looks — only the frame around them
 * differs, and that difference is the site-wide one between the document pages of
 * the new design and the React pages, not something this page invents.
 *
 * The stylesheet travels with the component, so a new mount point gets the look
 * without anyone remembering a <link>. It is LINKED, not imported: an import ends
 * up in the CSS bundle of every React page (measured — the rules landed on
 * /impressum and every calculator), and a 404 has no business costing bytes on
 * pages that are not one. React hoists the tag into the head.
 */
const PFEIL = (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M3.333 8h9.334m0 0L8 3.333M12.667 8 8 12.667"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function NichtGefundenInhalt() {
  return (
    <main className="sc-nf">
      <link rel="stylesheet" href="/shared-404/nicht-gefunden.css" precedence="default" />
      <div className="sc-nf-intro">
        <p className="sc-nf-eyebrow">{NICHT_GEFUNDEN.augenbraue}</p>
        <h1>{NICHT_GEFUNDEN.ueberschrift}</h1>
        <p>{NICHT_GEFUNDEN.text}</p>
      </div>
      <section className="sc-nf-wege" aria-label="Weiter auf Solar Check">
        <div>
          {NICHT_GEFUNDEN.wege.map((w) => (
            <a key={w.href} href={w.href}>
              <strong>{w.titel}</strong>
              <span>{w.text}</span>
              {PFEIL}
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
