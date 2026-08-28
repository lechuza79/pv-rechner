// Werkbank: jede Bildform an jedem Beitrag, der sie trägt — als HTML zum Ansehen.
//
// Wozu: Vier Fehler der letzten Runde waren AUSSCHLIESSLICH am gerenderten Bild
// sichtbar — eine abweichende Rundung zwischen Text und Bild, eine Legende, die
// eine Zuordnung behauptete, eine Kappe, die neben ihrem Bogen saß, und eine
// Zahl, die als Anteil beschriftet war und keiner ist. Kein Test hat einen davon
// gefunden. Wer eine Bildform ergänzt, muss sie ansehen können, bevor er sie
// abnimmt — und zwar an ECHTEN Zahlen, weil sich an gleichmäßigen Testwerten
// jede Form gut ausnimmt.
//
// Die Werkbank rendert dieselbe Komponente wie die Ansicht und dieselben Posts.
// Sie ist kein zweites Rendering: Was hier steht, steht später im Feed.
//
//   npm run social:zahlen      # echte Kennzahlen einmal ablegen
//   npm run social:formen      # HTML bauen und im Browser öffnen

import { writeFileSync, readFileSync } from "node:fs";
// Außerhalb des Next-Bundlers gibt es keine automatische JSX-Auflösung — React
// muss im Geltungsbereich stehen.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SocialKarte } from "../components/social/SocialKarte";
import { baueAllePosts, moeglicheFormen, templateVon, type SocialKennzahlen } from "../lib/social-posts";
import { BILDFORM_NAME, kollidiert, verschwindet } from "../lib/social-bildformen";
import { KARTEN_STILE, type KartenStil } from "../lib/social-karten-stil";
import { getCssVariables, globalStyles } from "../lib/theme";

const quelle = process.argv[2] ?? "/tmp/social-kennzahlen.json";
const ziel = process.argv[3] ?? "/tmp/social-formen.html";
// Nur ein Farbschema, sonst wird die Seite zur Tapete. Über das zweite Argument
// umschaltbar, weil ein Fehler wie der Klecks am Bogenende NUR im Highlight
// auftrat.
const stilWahl = (process.env.STIL ?? "hell") as KartenStil;
if (!KARTEN_STILE.includes(stilWahl)) {
  console.error(`Unbekanntes Farbschema: ${stilWahl}. Bekannt: ${KARTEN_STILE.join(", ")}`);
  process.exit(1);
}

const kennzahlen = JSON.parse(readFileSync(quelle, "utf8")) as SocialKennzahlen;
const posts = baueAllePosts(kennzahlen);

// Zwei Betriebsarten, und der Unterschied ist nicht die Bequemlichkeit:
//
// Ohne Filter alle Karten klein nebeneinander — dafür, ZU SEHEN, welche Formen
// ein Beitrag überhaupt trägt. Mit FORM oder POST gefiltert in voller Größe,
// weil sich die Fehler, um die es geht, nur dort zeigen: eine Beschriftung, die
// umbricht, eine Zahl, die neben ihrem Balken sitzt, eine Kappe, die übersteht.
// Auf ein Drittel verkleinert sieht all das gut aus.
const nurForm = process.env.FORM;
const nurPost = process.env.POST;
const gefiltert = !!(nurForm || nurPost);
// Ungefiltert genau der Maßstab, in dem die Redaktionsansicht ihre Vorschau
// zeigt (440 von 1080) — sonst beurteilt man hier eine Größe, die es nirgends
// gibt. Gefiltert die volle Karte, weil sich die Fehler dort zeigen.
const SKALA = gefiltert ? 1 : 440 / 1080;

const bloecke: string[] = [];
const befunde: string[] = [];
let gezeigt = 0;

for (const post of posts) {
  if (!post.bild) continue;

  // Die Rundungsprüfung läuft an den ECHTEN Zahlen, und das ist der Punkt: Ein
  // Test mit festen Testwerten kann eine datenabhängige Eigenschaft nicht
  // garantieren. Ob zwei Anteile bei diesem Datenstand auf dieselbe Zahl fallen,
  // entscheidet der Datenstand — nicht der Code. Gemeldet und nicht behoben:
  // Welche Rundung eine Aussage braucht, ist eine redaktionelle Entscheidung.
  const serien = post.bild.serien;
  if (serien.length >= 2) {
    const stellen = serien[0].stellen ?? 0;
    const werte = serien.map((s) => s.wert);
    if (kollidiert(werte, stellen)) {
      befunde.push(
        `${post.id}: zwei Serien zeigen dieselbe Zahl für verschiedene Werte — ` +
          werte.map((w, i) => `${serien[i].label} ${w.toFixed(stellen)}`).join(", "),
      );
    }
    if (verschwindet(werte, stellen)) {
      befunde.push(`${post.id}: ein Wert steht als Null da, obwohl er keine ist`);
    }
  }

  if (nurPost && post.id !== nurPost) continue;
  const formen = moeglicheFormen(post.bild).filter((f) => !nurForm || f === nurForm);
  if (formen.length === 0) continue;
  const karten = formen
    .map((art) => {
      const bild = { ...post.bild!, art, stil: stilWahl };
      const abgenommen = templateVon(bild);
      gezeigt++;
      return `<figure class="karte">
        <figcaption>
          <b>${BILDFORM_NAME[art]}</b>
          ${art === post.bild!.art ? '<span class="marke">eingebaut</span>' : ""}
          ${abgenommen ? `<span class="marke ok">${abgenommen.name}</span>` : ""}
        </figcaption>
        ${renderToStaticMarkup(<SocialKarte bild={bild} skala={SKALA} />)}
      </figure>`;
    })
    .join("");

  // Der Text steht dabei, weil Bild und Text ZUSAMMEN tragen. Ein Bild allein zu
  // beurteilen ist genau der Fehler, den die Redaktionsansicht schon einmal
  // gemacht hat — dort stand der Entwurf neben der Vorschau statt darin, und man
  // sah nie, was der Leser sieht. Hier fällt sonst nicht auf, wenn Bild und Text
  // verschieden runden oder dieselbe Zahl anders ausdrücken.
  const text = post.text
    .split("\n")
    .map((z) => (z.trim() ? `<p>${z.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>` : ""))
    .join("");

  bloecke.push(`<section>
    <h2>${post.titel}</h2>
    <p class="kennung">${post.id} · ${formen.length} Form(en) tragen</p>
    <div class="mit-text">
      <div class="reihe">${karten}</div>
      <div class="text">${text}</div>
    </div>
  </section>`);
}

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>Bildformen — Werkbank (${stilWahl})</title>
<style>
${globalStyles}
:root { ${getCssVariables()} }
body { margin: 0; padding: 32px; background: #f4f5f7; font-family: system-ui, sans-serif; color: #111; }
h1 { font-size: 22px; margin: 0 0 4px; }
.hinweis { color: #555; margin: 0 0 32px; font-size: 14px; }
section { margin-bottom: 48px; }
h2 { font-size: 17px; margin: 0 0 2px; }
.kennung { font-size: 12px; color: #777; margin: 0 0 12px; font-family: ui-monospace, monospace; }
.mit-text { display: flex; gap: 28px; align-items: flex-start; }
.reihe { display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-start; }
.text { flex: 0 0 340px; font-size: 13px; line-height: 1.5; color: #333; background: #fff; border-radius: 8px; padding: 14px 16px; }
.text p { margin: 0 0 8px; }
.karte { margin: 0; }
figcaption { font-size: 12px; margin-bottom: 6px; display: flex; gap: 6px; align-items: center; }
.marke { font-size: 10px; background: #ddd; padding: 1px 6px; border-radius: 8px; font-weight: 400; }
.marke.ok { background: #1365EA; color: #fff; }
[data-social-karte] { box-shadow: 0 1px 6px rgba(0,0,0,0.16); }
</style></head><body>
<h1>Bildformen — Werkbank</h1>
<p class="hinweis">Farbschema <b>${stilWahl}</b> · Datenstand ${kennzahlen.standIso.slice(0, 10)} · ${gezeigt} Karten.
Gezeigt wird je Beitrag nur, was das Formen-Register für seine Zahlen zulässt.</p>
${bloecke.join("\n")}
</body></html>`;

writeFileSync(ziel, html);
console.log(`${gezeigt} Karten in ${ziel} (Farbschema ${stilWahl})`);

if (befunde.length) {
  console.log(`\nRundung an den echten Zahlen — ${befunde.length} Befund(e):`);
  for (const b of befunde) console.log(`  - ${b}`);
  console.log(
    "\nEine Rundung, die zwei verschiedene Werte gleich aussehen lässt, ist im Bild ein Fehler:",
  );
  console.log("Der Balken zeigt den Unterschied, die Zahl daneben verneint ihn.");
} else {
  console.log("Rundung an den echten Zahlen: keine Kollision, keine verschwundene Zahl.");
}
