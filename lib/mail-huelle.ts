// ─── Die gemeinsame Hülle aller Mails an Nutzer ──────────────────────────────
//
// Kopf mit Wortmarke, Inhalt in einer Karte, Fuß mit Impressum und dem Satz,
// WARUM diese Mail kam.
//
// WARUM SIE IN EINER EIGENEN DATEI STEHT (02.09.2026): Sie lag im Abo-Modul,
// und die Anmeldemails (Konto bestätigen, Passwort setzen) wohnen woanders —
// als Vorlagen im Dashboard des Anmeldedienstes. Zwei davon trugen deshalb
// noch die Gestaltung des Schwesterprojekts, samt dessen Namen im Betreff.
// Von außen fällt das erst auf, wenn eine Mail im Postfach liegt.
//
// Wer die Hülle ändert, ändert BEIDE Familien — die Anmeldemails allerdings
// erst, wenn sie neu hochgeladen werden (`npm run auth:mailvorlagen`). Das ist
// der Preis dafür, dass der Anmeldedienst seine Vorlagen selbst hält; ein Test
// hält die hochgeladene Fassung gegen die erzeugte.

import { stageDefaults, tokens } from "./theme";
import { escapeHtml } from "./html-escape";

export const SITE = "https://solar-check.io";

export const C = {
  text: tokens["--color-text-primary"],
  fliess: tokens["--color-text-secondary"],
  leise: tokens["--color-text-muted"],
  linie: tokens["--color-border"],
  karte: tokens["--color-bg"],
  grund: tokens["--color-bg-muted"],
  akzent: tokens["--color-accent"],
  // The button carries the site's action colour (neon with dark ink), the same
  // pair as every primary button on the site.
  knopf: tokens["--color-cta"],
  aufKnopf: tokens["--color-cta-ink"],
  eckeKarte: tokens["--radius-lg"],
  eckeKnopf: tokens["--radius-pill"],
};

/**
 * The frame around the card is the house night stage: the lime logo only
 * reads on dark ground, the content keeps the light card. Taken from the
 * theme's own night stage, never typed.
 */
const NACHT = stageDefaults(0);
const RAHMEN = {
  grund: NACHT["--color-bg"],
  leise: NACHT["--color-text-muted"],
};

/**
 * Schriftgrößen — wie die Farben aus dem Theme, nicht getippt.
 *
 * Der Fließtext einer Mail liest sich auf denselben Geräten wie der Fließtext
 * der Seite; ihm eine eigene Größe zu geben hieße, dieselbe Entscheidung ein
 * zweites Mal zu treffen und beim nächsten Mal anders. Eine erste Fassung
 * hatte hier acht verschiedene Werte von Hand stehen, darunter zwei, die es in
 * der damaligen Skala gar nicht gab (14 und 20 px — beide gehören seit dem
 * 01.09.2026 dazu, der Punkt bleibt: getippt war es trotzdem).
 */
export const T = {
  klein: tokens["--font-size-caption"],
  fuss: tokens["--font-size-small"],
  text: tokens["--font-size-body"],
  marke: tokens["--font-size-lead"],
  titel: tokens["--font-size-h2"],
};

/**
 * Die Schriftfamilie.
 *
 * Unsere Hausschrift wird NICHT geladen: Ein Postfach lädt keine Webfonts, und
 * ein Verweis darauf kostet nur einen Abruf, der nichts bewirkt. Was bleibt,
 * ist die Systemschrift-Kette — dieselbe, die das Theme als Rückfall führt.
 */
export const SCHRIFT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// ─── Hülle ───────────────────────────────────────────────────────────────────

/**
 * Kopf, Inhaltskarte, Fuß — der Aufbau aus dem Schwesterprojekt, mit unseren
 * Farben.
 *
 * THE LOGO FILE NAME CARRIES A DATE: mail clients (Gmail's image proxy)
 * cache an image by its address, so a replaced logo.png kept showing the old
 * one in every inbox. A new look gets a new file name.
 *
 * DAS LOGO IST EIN BILD MIT TEXT DAHINTER. Viele Postfächer laden Bilder erst
 * auf Klick; steht dort nur ein Bild, ist der Kopf des Briefes bis dahin leer.
 * Der Alternativtext trägt deshalb den Markennamen, und die Größe steht als
 * Attribut UND im Stil — ohne Attribut reißt Outlook das Bild auf seine
 * Originalgröße auf, bevor es geladen ist.
 */
export function huelle(o: {
  vorschau: string;
  inhalt: string;
  /** Fehlt er, ist es eine transaktionale Mail (Bestätigung) — dann kein
   *  Abmeldelink: Es gibt noch nichts, wovon man sich abmelden könnte. */
  abmeldeUrl?: string;
  /**
   * Die eigene Einstellungsseite.
   *
   * STEHT IN BEIDEN MAILARTEN, auch in der Bestätigung — und das ist der
   * Punkt: Bis zur ersten Meldung können Monate vergehen, und bis dahin hätte
   * niemand einen Weg zu seinen Einstellungen. Als leiser Fußlink, nicht als
   * zweiter Knopf: Die Bestätigungsmail hat genau eine Handlung, und eine
   * zweite daneben kostet Bestätigungen.
   */
  einstellungenUrl?: string;
  /** Warum kam diese Mail? Steht im Fuß, nie im Kleingedruckten. */
  grundzeile: string;
}): string {
  const einstellungen = o.einstellungenUrl
    ? `<a href="${o.einstellungenUrl}" style="color:${RAHMEN.leise}">Deine Meldungen einstellen</a>`
    : "";
  const fuss = o.abmeldeUrl
    ? `<p style="margin:0 0 6px;font-size:${T.klein};color:${RAHMEN.leise}">${grundzeileHtml(o.grundzeile)}</p>
       <p style="margin:0 0 12px;font-size:${T.klein}">
         ${einstellungen}${einstellungen ? "&nbsp;·&nbsp;" : ""}<a href="${o.abmeldeUrl}" style="color:${RAHMEN.leise}">Diese Meldungen abbestellen</a>
       </p>`
    : `<p style="margin:0 0 6px;font-size:${T.klein};color:${RAHMEN.leise}">${grundzeileHtml(o.grundzeile)}</p>
       ${einstellungen ? `<p style="margin:0 0 12px;font-size:${T.klein}">${einstellungen}</p>` : ""}`;

  // A full document, not a fragment: mail apps give a bare fragment the
  // default body margin in white, which framed the dark ground with a white
  // border (Apple Mail, 22.09.2026). body margin 0 plus bgcolor lets the dark
  // reach the edge.
  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:${RAHMEN.grund}" bgcolor="${RAHMEN.grund}">
<div style="background:${RAHMEN.grund};margin:0;padding:32px 16px;font-family:${SCHRIFT};color:${C.fliess}">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden">${escapeHtml(o.vorschau)}</span>
  <div style="max-width:560px;margin:0 auto">

    <div style="text-align:center;padding-bottom:22px">
      <a href="${SITE}" style="text-decoration:none;color:${NACHT["--color-text-primary"]};font-size:${T.marke};font-weight:700">
        <img src="${SITE}/logo-mail-weiss-2026-09.png" alt="Solar Check" width="132" height="31" style="display:block;margin:0 auto;border:0;outline:none;max-width:132px;height:auto">
      </a>
    </div>

    <div style="background:${C.karte};border-radius:${C.eckeKarte};padding:28px 24px;color:${C.fliess};font-size:${T.text};line-height:1.65">
      ${o.inhalt}
    </div>

    <div style="text-align:center;padding:20px 8px 0">
      ${fuss}
      <p style="margin:0;font-size:${T.klein};color:${RAHMEN.leise}">
        <a href="${SITE}/impressum" style="color:${RAHMEN.leise}">Impressum</a>
        &nbsp;·&nbsp;
        <a href="${SITE}/datenschutz" style="color:${RAHMEN.leise}">Datenschutz</a>
      </p>
    </div>

  </div>
</div>
</body></html>`;
}

/** The reason line, with our domain as an explicit link: mail apps otherwise
 *  turn it into a default blue link that ignores the frame's colours. */
function grundzeileHtml(text: string): string {
  return escapeHtml(text).replace(/solar-check\.io/g, `<a href="${SITE}" style="color:${RAHMEN.leise}">solar-check.io</a>`);
}

export function knopf(url: string, text: string): string {
  return `<p style="margin:24px 0">
    <a href="${url}" style="display:inline-block;background:${C.knopf};color:${C.aufKnopf};text-decoration:none;padding:13px 24px;border-radius:${C.eckeKnopf};font-weight:700;font-size:${T.text}">${escapeHtml(text)}</a>
  </p>`;
}

