import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { neonSeiteHtml } from "../neon-seite";

/**
 * The server-rendered twin of the script-built homepage sections is a SECOND
 * COPY of wording that lives in the design package's bundle. A second copy
 * that nothing holds together drifts — silently, because both sides look fine
 * on their own: with JavaScript the page shows the bundle's version, without
 * it a crawler reads ours, and nobody ever sees the two side by side.
 *
 * So this test reads the bundle, pulls out the headings, the descriptions and
 * the links of the sections we mirror, and demands each of them in the HTML
 * the server actually delivers. Whoever changes the wording in the package
 * makes it red.
 */

const BUNDLE = join(process.cwd(), "public/dynamic-hero/dist/test.js");

/** The section markup the bundle assigns to the built container, as source. */
function gebauteSektionen(): string {
  const quelle = readFileSync(BUNDLE, "utf8");
  const start = quelle.indexOf("v.innerHTML=`");
  if (start < 0) throw new Error("Abschnitts-Vorlage im Bündel nicht gefunden — Extraktion anpassen");
  const ende = quelle.indexOf("`", start + "v.innerHTML=`".length);
  if (ende < 0) throw new Error("Abschnitts-Vorlage im Bündel nicht abgeschlossen");
  // The bundle is minified JS: German umlauts sit there as \xNN escapes.
  return quelle
    .slice(start + "v.innerHTML=`".length, ende)
    .replace(/\\x([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/** Only the three sections this page mirrors; everything else is listed below. */
const GESPIEGELT = ["hs-tools", "hs-local-atlas", "hs-guides"];

/**
 * What the bundle builds and the server deliberately does NOT mirror, each
 * with the reason. Widening this list without a reason is how the guard
 * quietly stops guarding.
 */
const NICHT_GESPIEGELT: Record<string, string> = {
  "/#hs-rechner":
    "Der Knopf 'Weitere Rechner' öffnet ein Fenster mit dem Navigations-Katalog; ohne Skript gibt es kein Fenster, und jeder Rechner steht bereits in der Fußzeile.",
  "/kontakt": "Abschnitt für Organisationen — nicht Teil dieses Auftrags, steht in der Fußzeile.",
  "/energie-widgets": "Abschnitt für Organisationen — nicht Teil dieses Auftrags, steht in der Fußzeile.",
  "/presse": "Abschnitt für Organisationen — nicht Teil dieses Auftrags, steht in der Fußzeile.",
  "/strommix-deutschland": "Quelle am Hero-Chart, nicht in den gespiegelten Abschnitten.",
  "/ueber": "Personen-Abschnitt — nicht Teil dieses Auftrags, steht in der Fußzeile.",
};

const html = neonSeiteHtml("startseite");

/**
 * The static block is exactly the body of the draft section — the takeover
 * empties it, so there is nothing else in there. Slicing by class names would
 * run past the closing tag and quietly measure the rest of the page.
 */
function statischerBlock(): string {
  const auf = html.search(/<section class="next-section"[^>]*>/);
  if (auf < 0) throw new Error("Entwurfs-Sektion fehlt — Übernahme geändert?");
  const start = html.indexOf(">", auf) + 1;
  // Depth-counted, because the block nests its own <section> elements. A lazy
  // regex stops at the first closing tag and hands back a truncated block —
  // every assertion after that then measures less than it claims to.
  let tiefe = 1;
  const tags = /<(\/?)section\b/g;
  tags.lastIndex = start;
  for (let m = tags.exec(html); m; m = tags.exec(html)) {
    tiefe += m[1] ? -1 : 1;
    if (tiefe === 0) return html.slice(start, m.index);
  }
  throw new Error("Entwurfs-Sektion nicht geschlossen");
}

/**
 * Text as a crawler reads it — OF THE BLOCK, never of the whole page. Measured
 * while building this: against the whole page a deleted link stayed green,
 * because the footer carries the same address. A guard that can be satisfied
 * by a different part of the page proves nothing about this one.
 */
function blockText(): string {
  return statischerBlock()
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ");
}

describe("Startseite ohne JavaScript", () => {
  it("liefert die Überschriften der gespiegelten Abschnitte", () => {
    const quelle = gebauteSektionen();
    // Headings inside the three mirrored sections only.
    const abschnitte = quelle.split(/<section class="hs-section /).filter((t) => GESPIEGELT.some((k) => t.startsWith(k)));
    expect(abschnitte).toHaveLength(GESPIEGELT.length);
    const ueberschriften = abschnitte
      .flatMap((t) => [...t.matchAll(/<h([23])>([^<]+)</g)].map((m) => m[2].trim()))
      // The tools heading is split by a <br>; both halves must be there.
      .flatMap((h) => h.split(/\s*<br>\s*/))
      .filter(Boolean);
    expect(ueberschriften.length).toBeGreaterThanOrEqual(8);
    const text = blockText();
    for (const h of ueberschriften) expect(text, `Überschrift fehlt im Server-HTML: ${h}`).toContain(h);
  });

  it("liefert die Beschreibungen der fünf Werkzeug-Karten", () => {
    const quelle = gebauteSektionen();
    const text = blockText();
    const karten = [...quelle.matchAll(/<article class="hs-tool[^"]*">[\s\S]*?<\/article>/g)].map((m) => m[0]);
    expect(karten).toHaveLength(5);
    for (const karte of karten) {
      const kennung = karte.match(/<div class="hs-tool-top">([^<]+)/)?.[1].trim();
      const beschreibung = karte.match(/<\/h3><p>([^<]+)</)?.[1].trim();
      expect(kennung, "Karte ohne Kennung — Extraktion anpassen").toBeTruthy();
      expect(beschreibung, "Karte ohne Beschreibung — Extraktion anpassen").toBeTruthy();
      expect(text, `Kennung fehlt: ${kennung}`).toContain(kennung!);
      expect(text, `Beschreibung fehlt: ${beschreibung}`).toContain(beschreibung!);
    }
  });

  it("liefert jeden Link der gespiegelten Abschnitte", () => {
    const quelle = gebauteSektionen();
    const pfade = new Set<string>();
    for (const m of quelle.matchAll(/href="\$\{ie\}([^"]*)"|href="(\/[^"]*)"/g)) pfade.add(m[1] ?? m[2]);
    // The guides come from a tuple list, so their paths carry no href in the source.
    for (const m of quelle.matchAll(/,"(\/(?:ratgeber|balkonkraftwerk)\/[^"]+)"\]/g)) pfade.add(m[1]);
    expect(pfade.size).toBeGreaterThanOrEqual(11);
    const block = statischerBlock();
    for (const pfad of pfade) {
      if (pfad in NICHT_GESPIEGELT) continue;
      expect(block, `Link fehlt im statischen Block: ${pfad}`).toContain(`href="${pfad}"`);
    }
  });

  it("hält keine Links, die das Paket nicht mehr baut", () => {
    const quelle = gebauteSektionen();
    const statisch = statischerBlock();
    expect(statisch.length).toBeGreaterThan(500);
    for (const m of statisch.matchAll(/href="(\/[^"#]*)"/g)) {
      expect(quelle, `Link steht bei uns, das Paket baut ihn nicht mehr: ${m[1]}`).toContain(m[1]);
    }
  });

  it("legt die Abschnitte in die Entwurfs-Sektion, die das Skript ohnehin ausblendet", () => {
    // Only then is nothing duplicated once the script runs — no second
    // hiding mechanism, and the section's anchor (#entdecken) keeps working.
    const sektion = statischerBlock();
    expect(sektion).toContain('class="sc-statisch"');
    // The draft's own two placeholder cards must be gone; otherwise a crawler
    // reads the older wording next to ours.
    expect(sektion).not.toContain("feature-card");
    expect(html).not.toContain("Oder schon eine konkrete Idee?");
  });

  it("lädt für den Textblock keine zusätzlichen Dateien", () => {
    // The point of the addition is text. Anything that pulls a file would put
    // weight on a page that already ships well over a megabyte.
    const statisch = statischerBlock();
    expect(statisch).not.toMatch(/<img|<iframe|<video|<script|url\(|@font-face/);
  });

  it("rührt die Simulation nicht an", () => {
    const sim = neonSeiteHtml("simulation");
    expect(sim).not.toContain("sc-statisch");
    expect(sim).toContain("feature-card");
  });
});
