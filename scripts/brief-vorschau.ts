/**
 * Brief-Vorschau: schreibt die HTML-Fassung als Datei, damit man sie ANSIEHT.
 *
 * Warum es das gibt: Der Brief wird an Tests gemessen, die einzelne Sätze und
 * Größen prüfen — wie er als Ganzes wirkt, sieht man daran nicht. Zwei der
 * Schriftgrößen-Fehlversuche im August 2026 waren im Test grün und im echten
 * Postfach sofort als falsch zu erkennen.
 *
 *   npx tsx scripts/brief-vorschau.ts [ziel.html]
 */
import { writeFileSync } from "node:fs";
import { renderOutreachDraft, type DraftContext } from "../lib/kommunen-outreach-draft";

const BEISPIEL: DraftContext = {
  name: "Höchberg",
  pageUrl: "https://solar-check.io/solar-atlas/bayern/landkreis-wuerzburg/hoechberg",
  betreff: "Höchberg hat die meiste private Speicherkapazität im Landkreis Würzburg",
  einstieg: "Höchberg hat die meiste private Speicherkapazität im Landkreis Würzburg — Platz 1 von 52 Gemeinden.",
  variante: "meldung_plus_widget",
  wo: "im Landkreis Würzburg",
  bestleistung: "die meiste private Speicherkapazität",
  themaDativ: "privater Speicherkapazität je Einwohner",
  phrase: "bei der privaten Speicherkapazität",
  gruppe: "Kleinen Gemeinden im Landkreis Würzburg",
  rangWert: "53,4 kWh/Kopf",
  rangBasis: "36 Hausspeicher",
  rang: { platz: 1, von: 52 },
  weitere: [
    { phrase: "bei Balkonkraftwerken", gruppe: "Kleinen Gemeinden im Landkreis Würzburg", platz: 2, von: 52 },
    { phrase: "beim Solar-Zubau seit Ende 2023", gruppe: "Kleinen Gemeinden in Bayern", platz: 3, von: 1840 },
  ],
  zahlen: { anlagen: 1234, leistungKwp: 12400, privatDachKwp: 9000, wpProKopf: 1240, stand: "2026-07-15" },
};

const ziel = process.argv[2] ?? "brief-vorschau.html";
const d = renderOutreachDraft(BEISPIEL);
// Hell UND dunkel: Mailprogramme setzen im Dunkelmodus eigene Hintergründe, und
// grauer Text auf dunklem Grund ist die Stelle, an der ein Fuß unlesbar wird.
writeFileSync(
  ziel,
  `<!doctype html><meta charset="utf-8"><title>Brief-Vorschau</title>
<body style="font-family:system-ui;margin:0;padding:24px;background:#f6f6f6">
<p style="font:600 13px system-ui;color:#666">Betreff: ${d.subject}</p>
<div style="background:#fff;padding:24px;border-radius:8px;margin-bottom:24px">${d.bodyHtml}</div>
<div style="background:#1c1c1e;color:#fff;padding:24px;border-radius:8px">${d.bodyHtml}</div>
</body>`,
  "utf-8",
);
// eslint-disable-next-line no-console
console.log(`geschrieben: ${ziel}`);
