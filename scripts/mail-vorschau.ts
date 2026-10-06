// Renders every mail we send to users into one overview page, with example
// data, for review before anything goes out (the abo sending stays off until
// every mail type has been looked at — see CLAUDE.md, "Gemeinde-Abo").
//
// The mails come from the SAME builders the send runs use; nothing here is a
// copy of a template. The page around them uses the site's night stage and
// action colour from the theme, never typed values.
//
//   npx tsx scripts/mail-vorschau.ts [ausgabe.html]

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { stageDefaults, tokens } from "../lib/theme";
import { escapeHtml } from "../lib/html-escape";
import { aboBestaetigungsMail, aboMeldungsMail } from "../lib/abo-mail";
import { gemeindeMeldungen, type MeldungsDaten } from "../lib/gemeinde-meldungen";
import { AUTH_MAIL_VORLAGEN } from "../lib/auth-mail";
import { umstellungsMail } from "../lib/umstellungs-mail";
import { wartelisteBestaetigungsMail } from "../lib/warteliste-mail";
import { anfrageMailBetreff, anfrageMailHtml } from "../lib/fachbetrieb-anfrage-mail";
import { abmeldeLink, einstellungenLink } from "../lib/abo-token";

// Links in the preview are signed with a throwaway key, never the real one:
// a preview page must not carry a working unsubscribe or settings link.
process.env.ABO_HMAC_SECRET = "nur-fuer-die-vorschau-kein-echter-schluessel-0000";

const SITE = "https://solar-check.io";
const ausgabe = resolve(process.argv[2] ?? "mail-vorschau.html");

// ─── Example data ────────────────────────────────────────────────────────────
// Invented numbers for an invented case. The overview says so at the top.

const beispielOrt: MeldungsDaten = {
  name: "Musterstadt",
  regionId: "00000000",
  population: 24000,
  solar: {
    total_count: 1840,
    total_kwp: 21500,
    by_segment: [{ segment: "privat_dach", count: 1520, kwp: 13400 }] as MeldungsDaten["solar"]["by_segment"],
    by_year: [
      { year: 2025, count: 212, kwp: 2300 },
      { year: 2024, count: 188, kwp: 2050 },
    ] as MeldungsDaten["solar"]["by_year"],
    by_year_segment: [{ year: 2006, segment: "privat_dach", count: 34, kwp: 180 }] as MeldungsDaten["solar"]["by_year_segment"],
  },
  speicher: { kwh_batterie: 5200, by_segment: [{ segment: "batterie_privat", count: 610 }] },
  standIso: "2026-09-05",
};

const alleMeldungen = gemeindeMeldungen({
  daten: beispielOrt,
  heuteJahr: 2026,
  foerderung: [{ name: "Klimabonus Solar", zaehlt: true }],
  platzierung: { messgroesse: "Solarleistung je Einwohner", rang: 2, ausN: 41, gruppe: "im Landkreis Musterkreis" },
  wiederOffen: [{ name: "Klimabonus Solar", festgestelltAm: "2026-09-20T03:40:00+00:00", foerdert: ["pv", "balkon"] }],
});
const nurWiederOffen = alleMeldungen.filter((m) => m.schluessel.startsWith("wieder-offen"));
const nurZubau = alleMeldungen.filter((m) => m.schluessel.startsWith("zubau-"));
const nurAuslauf = alleMeldungen.filter((m) => m.schluessel.startsWith("auslauf-"));

const ortUrl = `${SITE}/solar-atlas/niedersachsen/musterkreis/musterstadt`;
const abmeldeUrl = abmeldeLink(SITE, "beispiel");
const einstellungenUrl = einstellungenLink(SITE, "beispiel");
const meldung = (meldungen: typeof alleMeldungen) =>
  aboMeldungsMail({ ortName: "Musterstadt", ortUrl, meldungen, abmeldeUrl, einstellungenUrl, standLabel: "5. September 2026" });

type Eintrag = { gruppe: string; name: string; wann: string; betreff: string; html: string; status: string };

const eintraege: Eintrag[] = [];

const bestaetigung = aboBestaetigungsMail({ ortName: "Musterstadt", bestaetigenUrl: `${SITE}/abo/bestaetigen?t=beispiel`, einstellungenUrl });
eintraege.push({ gruppe: "Abo-Meldungen", name: "Anmeldung bestätigen", wann: "direkt nach dem Eintragen auf einer Orts- oder Förderseite", betreff: bestaetigung.subject, html: bestaetigung.html, status: "aktiv" });

for (const [name, wann, liste] of [
  ["Meldung: Förderprogramm nimmt wieder Anträge an", "wenn der Förder-Wächter eine Wiederöffnung festgestellt hat, einmal je Abonnent", nurWiederOffen],
  ["Meldung: Zubau des letzten Jahres", "einmal im Jahr ab 1. Januar", nurZubau],
  ["Meldung: Einspeisevergütung läuft aus", "einmal im Jahr ab 1. Januar, nur in Orten mit mindestens 20 betroffenen Dächern", nurAuslauf],
  ["Meldung: alles zusammen", "wenn mehrere Anlässe auf einmal zusammenkommen — die stärkste Meldung wird zum Betreff", alleMeldungen],
] as const) {
  if (liste.length === 0) throw new Error(`Beispieldaten erzeugen keine Meldung für: ${name}`);
  const m = meldung([...liste]);
  eintraege.push({ gruppe: "Abo-Meldungen", name, wann, betreff: m.subject, html: m.html, status: "nicht eingeschaltet" });
}

for (const v of AUTH_MAIL_VORLAGEN) {
  const wann: Record<typeof v.art, string> = {
    confirmation: "nach dem Anlegen eines Kontos",
    recovery: "nach „Passwort vergessen“",
    email_change: "wenn jemand seine Adresse ändert",
    magic_link: "Anmeldung per Link (Rückfallweg)",
    invite: "wenn wir jemanden einladen",
    reauthentication: "Bestätigungscode vor einer heiklen Änderung",
  };
  const html = v.html
    .replaceAll("{{ .ConfirmationURL }}", `${SITE}/auth/callback?beispiel`)
    .replaceAll("{{ .Token }}", "482915")
    .replaceAll("{{ .Email }}", "name@beispiel.de")
    .replaceAll("{{ .NewEmail }}", "neu@beispiel.de");
  eintraege.push({ gruppe: "Konto", name: v.betreff.replace(/ – Solar Check$/, ""), wann: wann[v.art], betreff: v.betreff, html, status: "aktiv" });
}

const warte = wartelisteBestaetigungsMail({ liste: "angebotscheck", bestaetigenUrl: `${SITE}/warteliste/bestaetigen?t=beispiel`, abmeldeUrl: `${SITE}/warteliste/austragen?t=beispiel` });
eintraege.push({ gruppe: "Warteliste", name: "Warteliste bestätigen", wann: "nach dem Eintragen auf die Warteliste des Angebots-Checks", betreff: warte.subject, html: warte.html, status: "aktiv" });

const anfrage = {
  betriebKurz: "Beispiel Solartechnik",
  name: "Erika Mustermann",
  kontakt: "erika@beispiel.de",
  nachricht: "Wir überlegen, ob sich eine Anlage mit Speicher lohnt. Können Sie sich das Dach einmal ansehen?",
  strasse: "Musterweg 3",
  plz: "12345",
  ort: "Musterstadt",
  fotoAnzahl: 2,
  ergebnisUrl: `${SITE}/photovoltaik-rechner?beispiel`,
};
eintraege.push({ gruppe: "Fachbetriebe", name: "Anfrage an einen Fachbetrieb", wann: "wenn jemand auf der Rechner-Seite eines Betriebs eine Anfrage schickt", betreff: anfrageMailBetreff(anfrage), html: anfrageMailHtml(anfrage), status: "gebaut, nicht ausgerollt" });

for (const gruppe of ["bestaetigt", "unbestaetigt"] as const) {
  const u = umstellungsMail({ gruppe, jetzt: new Date("2026-09-05T08:00:00Z") });
  eintraege.push({
    gruppe: "Einmalig (schon verschickt)",
    name: gruppe === "bestaetigt" ? "Umstellung der Anmeldung" : "Löschankündigung",
    wann: "einmalig am 5. September 2026 verschickt",
    betreff: u.betreff,
    html: u.html,
    status: "erledigt",
  });
}

// ─── The overview page ───────────────────────────────────────────────────────

const nacht = stageDefaults(0);
const F = {
  grund: nacht["--color-bg"],
  text: nacht["--color-text-primary"],
  leise: nacht["--color-text-muted"],
  linie: nacht["--color-border"],
  flaeche: nacht["--color-bg-muted"],
  cta: tokens["--color-cta"],
  aufCta: tokens["--color-cta-ink"],
};

const schrift = (datei: string) =>
  readFileSync(resolve("public/fonts", datei)).toString("base64");

const gruppen = [...new Set(eintraege.map((e) => e.gruppe))];

const karte = (e: Eintrag, i: number) => `
  <article class="mail" id="m${i}">
    <header>
      <div class="kopf">
        <h3>${escapeHtml(e.name)}</h3>
        <span class="status ${e.status === "aktiv" ? "an" : e.status === "erledigt" ? "fertig" : "aus"}">${escapeHtml(e.status)}</span>
      </div>
      <p class="wann">${escapeHtml(e.wann)}</p>
      <p class="betreff"><span>Betreff</span> ${escapeHtml(e.betreff)}</p>
    </header>
    <iframe title="${escapeHtml(e.name)}" onload="this.style.height='40px';this.style.height=this.contentDocument.documentElement.scrollHeight+'px'" srcdoc="${escapeHtml(e.html)}"></iframe>
  </article>`;

let n = 0;
const html = `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mail-Vorschau</title>
<style>
@font-face{font-family:"DM Sans";src:url(data:font/woff2;base64,${schrift("dm-sans-variable.woff2")}) format("woff2");font-weight:100 1000}
@font-face{font-family:"Montserrat";src:url(data:font/woff2;base64,${schrift("atlas-montserrat-bold.woff2")}) format("woff2");font-weight:700}
*{box-sizing:border-box}
body{margin:0;background:${F.grund};color:${F.text};font:16px/1.55 "DM Sans",system-ui,sans-serif}
main{max-width:1180px;margin:0 auto;padding:48px 16px 80px}
h1,h2,h3{font-family:"Montserrat","DM Sans",sans-serif;font-weight:700;letter-spacing:-0.02em;margin:0}
h1{font-size:clamp(28px,5vw,42px);line-height:1.1}
.lede{color:${F.leise};max-width:720px;margin:14px 0 0}
.hinweis{display:inline-block;margin-top:18px;background:${F.cta};color:${F.aufCta};border-radius:999px;padding:6px 14px;font-weight:700;font-size:14px}
nav{display:flex;flex-wrap:wrap;gap:8px;margin:28px 0 8px}
nav a{color:${F.text};text-decoration:none;border:1px solid ${F.linie};border-radius:999px;padding:6px 14px;font-size:14px}
nav a:hover{border-color:${F.cta};color:${F.cta}}
section{margin-top:48px}
section>h2{font-size:24px;margin-bottom:16px}
.raster{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,520px),1fr));gap:20px}
.raster{align-items:start}
.mail{background:${F.flaeche};border:1px solid ${F.linie};border-radius:16px;overflow:hidden;display:flex;flex-direction:column}
.mail header{padding:16px 18px}
.kopf{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.mail h3{font-size:18px;line-height:1.3}
.status{flex-shrink:0;font-size:12px;font-weight:700;border-radius:999px;padding:3px 10px;border:1px solid ${F.linie};color:${F.leise}}
.status.an{background:${F.cta};color:${F.aufCta};border-color:${F.cta}}
.status.aus{color:${F.text}}
.wann{margin:6px 0 0;color:${F.leise};font-size:14px}
.betreff{margin:10px 0 0;font-size:14px}
.betreff span{color:${F.leise};margin-right:6px}
iframe{width:100%;height:760px;display:block;border:0;border-top:1px solid ${F.linie};background:white}
</style></head>
<body><main>
  <h1>Alle Mails an Nutzer</h1>
  <p class="lede">So sehen die Mails aus, die Solar Check verschickt — gebaut von denselben Funktionen, die auch versenden. Die Zahlen und Namen sind Beispieldaten für einen erfundenen Ort.</p>
  <span class="hinweis">Abo-Meldungen: Versand ist aus, bis du sie abgenommen hast</span>
  <nav>${gruppen.map((g) => `<a href="#${encodeURIComponent(g)}">${escapeHtml(g)}</a>`).join("")}</nav>
  ${gruppen
    .map(
      (g) => `<section id="${encodeURIComponent(g)}"><h2>${escapeHtml(g)}</h2><div class="raster">${eintraege
        .filter((e) => e.gruppe === g)
        .map((e) => karte(e, n++))
        .join("")}</div></section>`,
    )
    .join("")}
</main></body></html>`;

writeFileSync(ausgabe, html);
console.log(`${eintraege.length} Mails → ${ausgabe}`);
