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

import { tokens } from "./theme";
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
  aufAkzent: tokens["--color-text-on-accent"],
  eckeKarte: tokens["--radius-lg"],
  eckeKnopf: tokens["--radius-md"],
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
    ? `<a href="${o.einstellungenUrl}" style="color:${C.leise}">Deine Meldungen einstellen</a>`
    : "";
  const fuss = o.abmeldeUrl
    ? `<p style="margin:0 0 6px;font-size:${T.klein};color:${C.leise}">${escapeHtml(o.grundzeile)}</p>
       <p style="margin:0 0 12px;font-size:${T.klein}">
         ${einstellungen}${einstellungen ? "&nbsp;·&nbsp;" : ""}<a href="${o.abmeldeUrl}" style="color:${C.leise}">Diese Meldungen abbestellen</a>
       </p>`
    : `<p style="margin:0 0 6px;font-size:${T.klein};color:${C.leise}">${escapeHtml(o.grundzeile)}</p>
       ${einstellungen ? `<p style="margin:0 0 12px;font-size:${T.klein}">${einstellungen}</p>` : ""}`;

  return `<div style="background:${C.grund};margin:0;padding:32px 16px;font-family:${SCHRIFT};color:${C.fliess}">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden">${escapeHtml(o.vorschau)}</span>
  <div style="max-width:560px;margin:0 auto">

    <div style="text-align:center;padding-bottom:22px">
      <a href="${SITE}" style="text-decoration:none;color:${C.text};font-size:${T.marke};font-weight:700">
        <img src="${SITE}/logo.png" alt="Solar Check" width="150" height="26" style="display:block;margin:0 auto;border:0;outline:none;max-width:150px;height:auto">
      </a>
    </div>

    <div style="background:${C.karte};border:1px solid ${C.linie};border-radius:${C.eckeKarte};padding:28px 24px;color:${C.fliess};font-size:${T.text};line-height:1.65">
      ${o.inhalt}
    </div>

    <div style="text-align:center;padding:20px 8px 0">
      ${fuss}
      <p style="margin:0;font-size:${T.klein};color:${C.leise}">
        <a href="${SITE}/impressum" style="color:${C.leise}">Impressum</a>
        &nbsp;·&nbsp;
        <a href="${SITE}/datenschutz" style="color:${C.leise}">Datenschutz</a>
      </p>
    </div>

  </div>
</div>`;
}

export function knopf(url: string, text: string): string {
  return `<p style="margin:24px 0">
    <a href="${url}" style="display:inline-block;background:${C.akzent};color:${C.aufAkzent};text-decoration:none;padding:13px 24px;border-radius:${C.eckeKnopf};font-weight:700;font-size:${T.text}">${escapeHtml(text)}</a>
  </p>`;
}

