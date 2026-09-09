// Die Ortsgeschichten als quadratische Karten ansehen — ohne Anmeldung.
//
// Schwester von scripts/social-formen-werkbank.tsx und aus demselben Grund:
// Ein Bild wird am gerenderten Bild beurteilt, nie am Code. Vier Fehler der
// letzten Runde waren nur dort sichtbar.
//
// WAS SIE ZEIGT: die Geschichten EINES Orts, jede in ihrer Bildform, als 1:1-
// Karte in beiden Paletten — mit eigenem Farbschema (so endet sie als Bild) und
// mit den Tokens der Seite, hell wie dunkel (so steht sie auf der Ortsseite).
// Genau an diesen beiden Fällen sind die drei Anläufe vom 05.09.2026
// gescheitert: fester 1080er Rahmen und eine mitgebrachte Palette.
//
// DIE AUSGABE LANDET NICHT IN `public/` — dieselbe Grenze wie bei der
// Formen-Werkbank: Was dort liegt, ist ohne Zugang erreichbar.
//
//   npm run orts:visual                 # Referenzort, Vorschau in den Ablageordner
//   npm run orts:visual -- /pfad.html   # eigenes Ziel

import { writeFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SocialKarte } from "../components/social/SocialKarte";
import { OrtsTeaser } from "../components/social/OrtsStoryAnsicht";
import { ortsPosts } from "../lib/orts-posts";
import { ortsStories, type StoryDaten } from "../lib/orts-stories";
import { bildform, templateVon } from "../lib/social-bildformen";
import { KARTEN_STILE } from "../lib/social-karten-stil";
import { STAGE_COUNT, getCssVariables, globalStyles, stageDefaults } from "../lib/theme";

const ziel = process.argv[2] ?? "/tmp/orts-visual.html";
if (/(^|\/)public\//.test(ziel)) {
  console.error(`Ziel liegt in public/ und wäre ohne Zugang erreichbar: ${ziel}`);
  process.exit(1);
}

/**
 * Ein Ort, der jede Familie auslöst.
 *
 * ERFUNDENE ZAHLEN, und das ist hier richtig: Beurteilt wird die ANORDNUNG —
 * ob ein Ländername die Spur sprengt, ob eine Zahl über den Rand läuft, ob die
 * Quellenzeile umbricht. Für die Frage, ob eine Rundung zwei Werte gleich
 * aussehen lässt, gibt es die Formen-Werkbank an den echten Kennzahlen.
 *
 * Der Name ist absichtlich LANG: Kurze Ortsnamen verstecken genau den
 * Umbruch, an dem die Schlagzeile später reißt.
 */
const ORT: StoryDaten = {
  name: "Mühlhausen an der Sulz",
  regionId: "08415083",
  population: 6120,
  solar: {
    total_count: 412,
    total_kwp: 4180,
    by_segment: [
      { segment: "privat_dach", count: 318, kwp: 2460 },
      { segment: "gewerbe_dach", count: 62, kwp: 1080 },
      { segment: "freiflaeche", count: 2, kwp: 640 },
    ],
    by_year_segment: [
      { year: 2006, segment: "privat_dach", count: 41, kwp: 205 },
      { year: 2012, segment: "privat_dach", count: 124, kwp: 930 },
      { year: 2020, segment: "privat_dach", count: 153, kwp: 1325 },
      { year: 2021, segment: "gewerbe_dach", count: 62, kwp: 1080 },
    ],
  },
  speicher: { kwh_batterie: 918, by_segment: [{ segment: "batterie_privat", count: 92 }] },
  standIso: "2026-08-05",
  wohnungen: { gesamt: 2840, einZwei: 1930 },
  monate: Array.from({ length: 22 }, (_, i) => ({
    monat: `${2024 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`,
    segment: "privat_dach",
    // Ein Ausschlag im dreizehnten Monat, damit die Anomalie-Familie greift.
    count: i === 13 ? 19 : 3,
  })),
};

const stories = ortsStories({ daten: ORT, heuteJahr: 2026 });
const beitraege = ortsPosts({
  stories,
  ort: { regionId: ORT.regionId, name: ORT.name },
  standIso: ORT.standIso,
});
const posts = beitraege.map((b) => b.post);

const ZOOM = 0.42;

/** Eine Karte in Ausgabegröße, per Transformation verkleinert — nie kleiner gerechnet. */
function Buehne({
  post,
  stil,
  palette,
}: {
  post: (typeof posts)[number];
  stil: (typeof KARTEN_STILE)[number];
  palette: "eigene" | "seite";
}) {
  const bild = { ...post.bild!, stil };
  return (
    <div style={{ width: 1080 * ZOOM, height: 1080 * ZOOM, overflow: "hidden", borderRadius: 4, boxShadow: "0 1px 6px rgba(0,0,0,0.16)", flex: "0 0 auto" }}>
      <div style={{ transform: `scale(${ZOOM})`, transformOrigin: "top left" }}>
        <SocialKarte bild={bild} skala={1} stufe="quadrat" palette={palette} />
      </div>
    </div>
  );
}

const hell = stageDefaults(STAGE_COUNT - 1);
const dunkel = stageDefaults(0);
const alsCss = (t: Record<string, string>) =>
  Object.entries(t)
    .map(([k, w]) => `${k}: ${w};`)
    .join(" ");

// NUR=<Teil der Kennung> zeigt eine einzelne Geschichte — sonst ist die Seite
// zehn Bildschirmhöhen lang, und beurteilt wird, was oben steht.
const nur = process.env.NUR;
const gezeigt = nur ? posts.filter((p) => p.id.includes(nur)) : posts;

const zeilen = gezeigt.map((p) => {
  const f = bildform(p.bild!.art);
  const template = templateVon(p.bild!);
  return `
  <section class="zeile">
    <h2>${f.name}${template ? ` — Template „${template.name}"` : " — noch kein Template"}</h2>
    <p class="meta">${p.titel} · ${p.id}</p>
    <div class="reihe">
      ${KARTE_MIT_LABEL(p, "eigene")}
    </div>
    <div class="reihe seite-hell"><div class="hinweis">Seiten-Palette, hell</div>${renderToStaticMarkup(<Buehne post={p} stil="hell" palette="seite" />)}</div>
    <div class="reihe seite-dunkel"><div class="hinweis">Seiten-Palette, dunkel</div>${renderToStaticMarkup(<Buehne post={p} stil="hell" palette="seite" />)}</div>
    <div class="reihe seite-hell">
      <div class="hinweis">Teaser in der Spur — schmal (240) und breit (320)</div>
      ${TEASER(p, 240)}
      ${TEASER(p, 320)}
    </div>
    <div class="reihe seite-dunkel">
      <div class="hinweis">Teaser, dunkle Stufe</div>
      ${TEASER(p, 240)}
      ${TEASER(p, 320)}
    </div>
  </section>`;
});

/**
 * Der Teaser in beiden Breiten, die die Spur wirklich hergibt.
 *
 * Beide, weil das Bildchen links den Text schmaler macht: Am schmalen Ende
 * entscheidet sich, ob die Schlagzeile noch trägt — und genau das sieht man
 * nur am gerenderten Teaser, nicht an der Zahl im Code.
 */
function TEASER(p: (typeof posts)[number], breite: number): string {
  const beitrag = beitraege.find((b) => b.post.id === p.id)!;
  return `<div style="display:flex;width:${breite}px">${renderToStaticMarkup(
    <OrtsTeaser beitrag={beitrag} onOeffnen={() => {}} />,
  )}</div>`;
}

function KARTE_MIT_LABEL(p: (typeof posts)[number], palette: "eigene" | "seite"): string {
  return KARTEN_STILE.map(
    (stil) =>
      `<div class="karte"><div class="hinweis">${stil}</div>${renderToStaticMarkup(<Buehne post={p} stil={stil} palette={palette} />)}</div>`,
  ).join("");
}

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>Ortsgeschichten — quadratisch</title>
<style>
${globalStyles}
:root { ${getCssVariables()} ${alsCss(hell)} }
body { margin: 0; padding: 32px; background: var(--color-bg); font-family: system-ui, sans-serif; color: var(--color-text-primary); }
h1 { font-size: 22px; margin: 0 0 4px; }
h2 { font-size: 16px; margin: 0 0 2px; }
.hinweis { font-size: 12px; color: var(--color-text-muted); margin-bottom: 6px; }
.meta { font-size: 12px; color: var(--color-text-muted); margin: 0 0 12px; }
.zeile { margin-bottom: 40px; }
.reihe { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 12px; }
.karte { }
.seite-hell { ${alsCss(hell)} background: var(--color-bg); padding: 12px; border-radius: 6px; }
.seite-dunkel { ${alsCss(dunkel)} background: var(--color-bg); color: var(--color-text-primary); padding: 12px; border-radius: 6px; }
</style></head><body>
<h1>Ortsgeschichten als quadratische Karte</h1>
<p class="meta">${ORT.name} · ${gezeigt.length} Geschichte(n) · dieselbe Zeichnung wie im Feed-Bild, nur 1:1.</p>
${zeilen.join("\n")}
</body></html>`;

writeFileSync(ziel, html);
console.log(`${gezeigt.length} von ${posts.length} Geschichte(n) in ${ziel}`);
for (const p of gezeigt) {
  const t = templateVon(p.bild!);
  console.log(`  ${bildform(p.bild!.art).name.padEnd(18)} ${t ? `Template „${t.name}"` : "kein Template"}  ${p.id}`);
}
