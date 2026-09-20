import { describe, it, expect } from "vitest";
import { neonSeiteHtml } from "../neon-seite";
// The extraction itself, not a subprocess running it: a spawned node process
// is slow and runs into the test timeout under load (measured red once at a
// load average of 48). Importing it runs exactly the same code.
import { lesen } from "../../scripts/startseite-sektionen.mjs";
import SEKTIONEN from "../startseite-sektionen.json";

/**
 * The homepage renders the script-built sections server-side so a crawler
 * without JavaScript sees them. Their wording is NOT written in our code — it
 * is read out of the design package's bundle when the package is taken over
 * (scripts/startseite-sektionen.mjs) and lies next to the page module as data.
 *
 * There is therefore no second copy to hold against a first. What this test
 * guards instead:
 *   1. the data still matches the bundle (a package taken over without
 *      re-running the extraction would otherwise serve stale wording),
 *   2. everything in the data reaches the delivered page,
 *   3. the block sits in the section the script already hides, so nothing is
 *      duplicated once the script runs,
 *   4. it stays text — the page already ships well over a megabyte.
 */

/** The static block is exactly the body of the draft section, which the
 * takeover empties. It nests its own <section> elements, so the closing tag is
 * found by counting depth — a lazy regex stops at the first one and hands back
 * a truncated block, and every assertion after that measures less than it
 * claims to. */
function statischerBlock(html: string): string {
  const auf = html.search(/<section class="next-section"[^>]*>/);
  if (auf < 0) throw new Error("Entwurfs-Sektion fehlt — Übernahme geändert?");
  const start = html.indexOf(">", auf) + 1;
  let tiefe = 1;
  const tags = /<(\/?)section\b/g;
  tags.lastIndex = start;
  for (let m = tags.exec(html); m; m = tags.exec(html)) {
    tiefe += m[1] ? -1 : 1;
    if (tiefe === 0) return html.slice(start, m.index);
  }
  throw new Error("Entwurfs-Sektion nicht geschlossen");
}

const html = neonSeiteHtml("startseite");
const block = statischerBlock(html);

/** Text as a crawler reads it — OF THE BLOCK, never of the whole page. Measured
 * while building this: against the whole page a deleted link stayed green,
 * because the footer carries the same address. A guard that can be satisfied by
 * a different part of the page proves nothing about this one. */
const text = block
  .replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/\s+/g, " ");

describe("Startseite ohne JavaScript", () => {
  it("hat die Abschnitte aus dem Paket gelesen, nicht abgeschrieben", () => {
    // Re-reads the bundle and compares it to the file on disk. Red means the
    // package was taken over without re-running the extraction — the page would
    // then serve wording the package no longer has.
    expect(lesen()).toEqual(SEKTIONEN);
  });

  it("liefert jede Überschrift und jeden Text der gelesenen Abschnitte", () => {
    const erwartet = [
      SEKTIONEN.einleitung.kicker,
      SEKTIONEN.einleitung.titel,
      SEKTIONEN.einleitung.text,
      ...SEKTIONEN.werkzeuge.flatMap((w) => [w.kennung, w.titel, w.text, ...(w.hinweis ? [w.hinweis] : [])]),
      SEKTIONEN.atlas.kicker,
      SEKTIONEN.atlas.titel,
      SEKTIONEN.atlas.text,
      ...SEKTIONEN.atlas.punkte,
      SEKTIONEN.ratgeber.titel,
      ...SEKTIONEN.ratgeber.eintraege.flatMap((r) => [r.bereich, r.titel]),
      SEKTIONEN.organisationen.kicker,
      SEKTIONEN.organisationen.titel,
      ...SEKTIONEN.organisationen.eintraege.flatMap((o) => [o.titel, o.text]),
    ];
    expect(erwartet.length).toBeGreaterThanOrEqual(35);
    for (const satz of erwartet) expect(text, `fehlt im Server-HTML: ${satz}`).toContain(satz);
  });

  it("liefert jeden Link der gelesenen Abschnitte", () => {
    const pfade = new Set<string>([
      ...SEKTIONEN.werkzeuge.flatMap((w) => w.links.map((l) => l.href)),
      SEKTIONEN.atlas.link.href,
      SEKTIONEN.ratgeber.alle.href,
      ...SEKTIONEN.ratgeber.eintraege.map((r) => r.href),
      ...SEKTIONEN.organisationen.eintraege.map((o) => o.href),
    ]);
    expect(pfade.size).toBeGreaterThanOrEqual(9);
    for (const pfad of pfade) expect(block, `Link fehlt: ${pfad}`).toContain(`href="${pfad}"`);
  });

  it("legt die Abschnitte in die Entwurfs-Sektion, die das Skript ohnehin ausblendet", () => {
    // Only then is nothing duplicated once the script runs — no second hiding
    // mechanism, and the section's anchor (#entdecken) keeps working.
    expect(block).toContain('class="sc-statisch"');
    // The draft's own two placeholder cards must be gone; otherwise a crawler
    // reads the older wording next to ours.
    expect(block).not.toContain("feature-card");
    expect(html).not.toContain("Oder schon eine konkrete Idee?");
  });

  it("lädt für den Textblock keine zusätzlichen Dateien", () => {
    expect(block).not.toMatch(/<img|<iframe|<video|<script|url\(|@font-face/);
  });

  it("rührt die Simulation nicht an", () => {
    const sim = neonSeiteHtml("simulation");
    expect(sim).not.toContain("sc-statisch");
    expect(sim).toContain("feature-card");
  });
});
