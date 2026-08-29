// Prüflauf für die Bildformen — und ein Vorschau-HTML AUSSERHALB des Projekts.
//
// Die Ansicht, an der gearbeitet wird, ist die Seite unter
// /admin/redaktion/templates. Diese Fassung rendert dieselbe Komponente
// (`TemplateGalerie`, keine zweite Fassung — zwei würden driften) und ist mein
// Weg, ein Design anzusehen, ohne mich anmelden zu können.
//
// DIE AUSGABE LANDET NICHT IN `public/` — BLOCKER (Betreiber, 28.08.2026: „ohne
// Login brauchen wir nicht, was soll das? das ist eine Lücke"). Sie tat es
// zwischenzeitlich, damit der Dev-Server sie ausliefert, und war damit über eine
// Adresse erreichbar, die kein Zugang schützt. Dass eine `.gitignore`-Zeile sie
// vom Deploy fernhielt, ist ein Geländer und keine Grenze: Ein `git add public/`
// hätte sie live gestellt, und niemand hätte es bemerkt.
//
// Sie liegt deshalb im Ablageordner der Sitzung. Zum Ansehen im Browser braucht
// es einen eigenen Dateiserver auf einem eigenen Port — bewusst ein
// Extra-Schritt statt eines dauerhaft offenen Wegs.
//
//   npm run social:zahlen      # echte Kennzahlen einmal ablegen
//   npm run social:formen      # Prüflauf, Vorschau-HTML in den Ablageordner
//
// FORM=rangliste zeigt nur eine Form, größer, und schreibt in eine EIGENE Datei
// — sonst überschriebe die gefilterte Ansicht die Übersicht.

import { writeFileSync, readFileSync } from "node:fs";
// Außerhalb des Next-Bundlers gibt es keine automatische JSX-Auflösung — React
// muss im Geltungsbereich stehen.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TemplateGalerie, type GalerieZeile } from "../components/social/TemplateGalerie";
import { baueAllePosts, moeglicheFormen, type PostBild, type SocialKennzahlen, type SocialPost } from "../lib/social-posts";
import { BILDFORMEN, kollidiert, verschwindet } from "../lib/social-bildformen";
import { STAGE_COUNT, getCssVariables, globalStyles, stageDefaults } from "../lib/theme";

const quelle = process.argv[2] ?? "/tmp/social-kennzahlen.json";
const nurForm = process.env.FORM;
// Ohne Angabe in den Ablageordner, NIE nach `public/` — die Begründung steht
// oben. Ein übergebener Pfad wird zusätzlich zurückgewiesen, wenn er dorthin
// zeigt: Wer den Weg einmal nimmt, nimmt ihn wieder.
const basisZiel = process.argv[3] ?? "/tmp/social-formen.html";
if (/(^|\/)public\//.test(basisZiel)) {
  console.error(
    `Ziel liegt in public/ und wäre damit ohne Zugang erreichbar: ${basisZiel}\n` +
      `Die Vorschau gehört in den Ablageordner, nicht in ausgelieferte Dateien.`,
  );
  process.exit(1);
}
const ziel = nurForm ? basisZiel.replace(/\.html$/, `-${nurForm}.html`) : basisZiel;

const kennzahlen = JSON.parse(readFileSync(quelle, "utf8")) as SocialKennzahlen;
const posts = baueAllePosts(kennzahlen);

function fuellung(art: PostBild["art"]): SocialPost | undefined {
  return (
    posts.find((p) => p.bild?.art === art) ??
    posts.find((p) => p.bild && moeglicheFormen(p.bild).includes(art))
  );
}

const zeilen: GalerieZeile[] = [];
const ohneBeitrag: string[] = [];
for (const form of BILDFORMEN) {
  if (nurForm && form.art !== nurForm) continue;
  const post = fuellung(form.art);
  if (!post?.bild) {
    ohneBeitrag.push(form.name);
    continue;
  }
  zeilen.push({
    form,
    post,
    traeger: posts.filter((p) => p.bild && moeglicheFormen(p.bild).includes(form.art)).length,
    gesamt: posts.length,
  });
}

// Die Rundungsprüfung läuft über ALLE Beiträge an den ECHTEN Zahlen — das ist
// der Teil, den die Seite nicht leisten kann und ein Test auf festen Werten
// erst recht nicht: Ob zwei Werte bei diesem Datenstand auf dieselbe Zahl
// fallen, entscheidet der Datenstand. Gemeldet und nicht behoben, weil die
// nötige Rundung eine redaktionelle Entscheidung ist.
const befunde: string[] = [];
for (const post of posts) {
  const serien = post.bild?.serien ?? [];
  if (serien.length < 2) continue;
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

// Die Werkbank steht fest auf der HELLSTEN Tagesstufe.
//
// Sonst erbt sie die Stufe der Tageszeit — abends dunkler Text auf dunklem
// Grund, und die Ansicht ist unbrauchbar. Dieselbe Entscheidung wie beim
// Bild-Export: Ein Werkzeug, in dem Designs beurteilt werden, darf nicht je nach
// Uhrzeit anders aussehen. Die KARTEN sind davon unberührt — sie bringen ihr
// Farbschema selbst mit.
const hell = stageDefaults(STAGE_COUNT - 1);
const helleTokens = Object.entries(hell)
  .map(([k, w]) => `${k}: ${w};`)
  .join(" ");

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>Templates — Werkbank</title>
<style>
${globalStyles}
:root { ${getCssVariables()} ${helleTokens} }
body { margin: 0; padding: 32px; background: var(--color-bg); font-family: system-ui, sans-serif;
       color: var(--color-text-primary); }
h1 { font-size: 22px; margin: 0 0 4px; }
.hinweis { color: var(--color-text-secondary); margin: 0 0 32px; font-size: 14px; max-width: 720px; line-height: 1.5; }
</style></head><body>
<h1>Templates — Werkbank</h1>
<p class="hinweis">Dieselbe Ansicht wie unter <code>/admin/redaktion/templates</code>, ohne Anmeldung.
Datenstand ${kennzahlen.standIso.slice(0, 10)}. Die Beiträge kommen nur als Füllung vor: An
gleichmäßigen Testwerten nimmt sich jede Form gut aus, also stehen hier echte Zahlen.</p>
${renderToStaticMarkup(<TemplateGalerie zeilen={zeilen} zoom={nurForm ? 0.5 : 0.32} />)}
</body></html>`;

writeFileSync(ziel, html);
console.log(`${zeilen.length} Form(en) in ${ziel}`);

if (ohneBeitrag.length) {
  console.log(`\nOhne Beitrag im Bestand: ${ohneBeitrag.join(", ")} — eine Form ohne Beitrag ist Zierde.`);
}
if (befunde.length) {
  console.log(`\nRundung an den echten Zahlen — ${befunde.length} Befund(e):`);
  for (const b of befunde) console.log(`  - ${b}`);
  console.log("\nEine Rundung, die zwei verschiedene Werte gleich aussehen lässt, ist im Bild ein Fehler:");
  console.log("Der Balken zeigt den Unterschied, die Zahl daneben verneint ihn.");
} else {
  console.log("Rundung an den echten Zahlen: keine Kollision, keine verschwundene Zahl.");
}
