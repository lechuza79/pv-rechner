// Werkbank: die TEMPLATES, jedes in seinen drei Farbvarianten.
//
// Was hier NICHT steht, und das ist der Punkt (Betreiber, 28.08.2026): Eine
// Übersicht über die Beiträge gibt es schon — die Redaktionsansicht. Sie noch
// einmal zu bauen bringt nichts. Was fehlte, war die Ansicht auf die DESIGNS:
//
//   Eine Story ist der Inhalt. Sie verwendet ein Template. Ein Template gibt es
//   in drei Varianten (hell, dunkel, highlight).
//
// Hier steht deshalb je Bildform eine Zeile mit ihren drei Varianten
// nebeneinander — das ist die Einheit, die abgenommen wird, und das ist die
// Ansicht, in der man sieht, ob ein Design in allen drei Schemata trägt. Genau
// dort saßen die Fehler der letzten Runden: der helle Klecks am Bogenende nur im
// Highlight, die ununterscheidbaren Segmente nur im Highlight.
//
// Die Beiträge kommen darin nur als FÜLLUNG vor: Jede Form braucht Zahlen, die
// sie trägt, und die echten sind die einzigen, an denen sich ein Design
// beurteilen lässt — an gleichmäßigen Testwerten nimmt sich jede Form gut aus.
// Welcher Beitrag eine Form füllt, steht klein dabei.
//
//   npm run social:zahlen      # echte Kennzahlen einmal ablegen
//   npm run social:formen      # HTML bauen und im Browser öffnen
//
// FORM=rangliste beschränkt auf eine Form und zeigt sie in voller Kartengröße.

import { writeFileSync, readFileSync } from "node:fs";
// Außerhalb des Next-Bundlers gibt es keine automatische JSX-Auflösung — React
// muss im Geltungsbereich stehen.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SocialKarte } from "../components/social/SocialKarte";
import { baueAllePosts, moeglicheFormen, type PostBild, type SocialKennzahlen, type SocialPost } from "../lib/social-posts";
import { BILDFORMEN, TEMPLATES, kollidiert, variantenKennung, verschwindet } from "../lib/social-bildformen";
import { KARTEN_STILE, KARTEN_STIL_NAME } from "../lib/social-karten-stil";
import { getCssVariables, globalStyles } from "../lib/theme";

const quelle = process.argv[2] ?? "/tmp/social-kennzahlen.json";
const ziel = process.argv[3] ?? "/tmp/social-formen.html";
const nurForm = process.env.FORM;

const kennzahlen = JSON.parse(readFileSync(quelle, "utf8")) as SocialKennzahlen;
const posts = baueAllePosts(kennzahlen);

/**
 * Die Karte wird IMMER in Ausgabegröße gerendert (1080 breit) und erst für die
 * Anzeige verkleinert — per Transform, nicht über einen kleineren Maßstab.
 *
 * Der Unterschied ist nicht kosmetisch: Mit kleinerem Maßstab gerendert bricht
 * der Text an anderen Stellen um als im ausgelieferten Bild. Genau das ist mir
 * hier passiert — der Lizenzvermerk brach in der verkleinerten Fassung mitten im
 * Kürzel („dl-/by-2-0"), im echten Bild dagegen sauber dahinter. Wer eine
 * verkleinert gerechnete Karte beurteilt, beurteilt eine, die es nicht gibt.
 *
 * Die Anzeigebreite hat deshalb ein Maximum und skaliert mit dem Fenster
 * (Betreiber, 28.08.2026); die Karte selbst bleibt bei der Größe, die LinkedIn
 * bekommt.
 */
const SKALA = 1;

/**
 * Welcher Beitrag füllt diese Form?
 *
 * Erste Wahl: einer, dessen EINGEBAUTE Form es ist — dort ist die Form für diese
 * Zahlen gedacht und nicht bloß zulässig. Sonst der erste, für den sie trägt.
 * Gibt es keinen, hat die Form im Bestand nichts zu zeigen, und das ist ein
 * Befund: eine Form ohne Beitrag ist Zierde.
 */
function fuellung(art: PostBild["art"]): SocialPost | undefined {
  const eigen = posts.find((p) => p.bild?.art === art);
  if (eigen) return eigen;
  return posts.find((p) => p.bild && moeglicheFormen(p.bild).includes(art));
}

const befunde: string[] = [];
const ohneBeitrag: string[] = [];
const bloecke: string[] = [];
let gezeigt = 0;

// Die Rundungsprüfung läuft über ALLE Beiträge, nicht nur die gezeigten: Sie
// gehört nicht zur Template-Ansicht, aber sie braucht die echten Zahlen, und die
// liegen hier. Ob zwei Werte bei diesem Datenstand auf dieselbe Zahl fallen,
// entscheidet der Datenstand — ein Test auf festen Werten kann das nicht.
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

for (const form of BILDFORMEN) {
  if (nurForm && form.art !== nurForm) continue;
  const post = fuellung(form.art);
  if (!post?.bild) {
    ohneBeitrag.push(form.name);
    continue;
  }

  const varianten = KARTEN_STILE.map((stil) => {
    const bild = { ...post.bild!, art: form.art, stil };
    const abgenommen = TEMPLATES.some((t) => t.art === form.art && t.stil === stil);
    gezeigt++;
    // Die Kennung steht an JEDER Variante, nicht nur an den abgenommenen: Man
    // muss über eine Variante reden können, bevor sie einen Template-Namen hat —
    // sonst hat gerade das, woran gearbeitet wird, keinen Namen.
    const kennung = variantenKennung(form.art, stil);
    return `<figure class="karte">
      <figcaption>
        <b>${KARTEN_STIL_NAME[stil]}</b>
        <code class="id" title="Klicken zum Kopieren">${kennung}</code>
        ${abgenommen ? '<span class="marke ok">abgenommen</span>' : '<span class="marke">noch nicht abgenommen</span>'}
      </figcaption>
      <div class="buehne">${renderToStaticMarkup(<SocialKarte bild={bild} skala={SKALA} />)}</div>
    </figure>`;
  }).join("");

  // Wie viele Beiträge diese Form überhaupt tragen — die Antwort auf „lohnt sich
  // dieses Design". Eine Form, die nur ein Beitrag trägt, ist nicht falsch, aber
  // sie muss sich das leisten können.
  const traeger = posts.filter((p) => p.bild && moeglicheFormen(p.bild).includes(form.art));

  bloecke.push(`<section>
    <h2>${form.name}</h2>
    <p class="wofuer">${form.wofuer}</p>
    <p class="kennung">${traeger.length} von ${posts.length} Beiträgen tragen diese Form · gefüllt mit „${post.titel}"</p>
    <div class="reihe">${varianten}</div>
  </section>`);
}

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>Templates — Werkbank</title>
<style>
${globalStyles}
:root { ${getCssVariables()} }
body { margin: 0; padding: 32px; background: #f4f5f7; font-family: system-ui, sans-serif; color: #111; }
h1 { font-size: 22px; margin: 0 0 4px; }
.hinweis { color: #555; margin: 0 0 32px; font-size: 14px; max-width: 720px; line-height: 1.5; }
section { margin-bottom: 56px; padding-bottom: 8px; border-top: 1px solid #dcdee2; padding-top: 20px; }
h2 { font-size: 19px; margin: 0 0 4px; }
.wofuer { font-size: 13px; color: #444; margin: 0 0 6px; max-width: 720px; line-height: 1.45; }
.kennung { font-size: 12px; color: #777; margin: 0 0 16px; }
.reihe { display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-start; }
.karte { margin: 0; }
figcaption { font-size: 12px; margin-bottom: 6px; display: flex; gap: 6px; align-items: center; }
.marke { font-size: 10px; background: #ddd; padding: 1px 6px; border-radius: 8px; font-weight: 400; }
.marke.ok { background: #1365EA; color: #fff; }
.id { font-family: ui-monospace, monospace; font-size: 11px; background: #e6e9ee; padding: 1px 6px;
      border-radius: 4px; cursor: pointer; user-select: all; }
.id.kopiert { background: #1365EA; color: #fff; }
[data-social-karte] { box-shadow: 0 1px 6px rgba(0,0,0,0.16); }

/* Die Bühne: Sie zeigt die 1080er Karte verkleinert, ohne sie kleiner zu
   rechnen. Die Breite folgt dem Fenster und hat ein Maximum — drei Varianten
   sollen nebeneinander passen, ohne dass eine davon größer wird als nötig. */
:root { --zoom: 0.30; }
.buehne {
  width: calc(1080px * var(--zoom));
  height: calc(1350px * var(--zoom));
  overflow: hidden;
}
.buehne > [data-social-karte] {
  transform: scale(var(--zoom));
  transform-origin: top left;
  /* Der Schatten wird mitskaliert und verschwände fast — deshalb hier neu. */
  box-shadow: none;
}
.buehne { box-shadow: 0 1px 6px rgba(0,0,0,0.16); border-radius: 4px; }
@media (min-width: 1240px) { :root { --zoom: 0.34; } }
@media (min-width: 1500px) { :root { --zoom: 0.40; } }
/* Auf eine Form gefiltert steht nur eine Zeile auf der Seite — dann darf sie
   den Platz nehmen, den drei Karten sonst teilen. */
body.eine-form { --zoom: 0.42; }
@media (min-width: 1500px) { body.eine-form { --zoom: 0.52; } }
</style></head><body class="${nurForm ? "eine-form" : ""}">
<h1>Templates — Werkbank</h1>
<p class="hinweis">Je Bildform eine Zeile, darin die drei Farbvarianten — das ist die Einheit, die
abgenommen wird. Datenstand ${kennzahlen.standIso.slice(0, 10)}, ${gezeigt} Karten.
Die Beiträge kommen nur als Füllung vor: An gleichmäßigen Testwerten nimmt sich jede Form gut aus,
also stehen hier echte Zahlen.</p>
${bloecke.join("\n")}
<script>
// Klick auf eine Kennung kopiert sie. Ein Name, den man abtippen muss, wird
// abgetippt — und dann steht ein Tippfehler in der Anweisung.
document.addEventListener("click", (e) => {
  const el = e.target.closest(".id");
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(() => {
    el.classList.add("kopiert");
    setTimeout(() => el.classList.remove("kopiert"), 900);
  });
});
</script>
</body></html>`;

writeFileSync(ziel, html);
console.log(`${gezeigt} Karten in ${ziel}`);

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
