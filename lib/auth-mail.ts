import { huelle, knopf, C, T, SITE } from "./mail-huelle";

// ─── Die Mails des Anmeldedienstes ───────────────────────────────────────────
//
// Konto bestätigen, Passwort setzen, Adresse ändern und so weiter. Sie liegen
// NICHT bei uns, sondern als Vorlagen beim Anmeldedienst — er verschickt sie
// selbst, wir sehen sie nie im Code. Genau daran ist es aufgefallen: Zwei
// davon trugen bis zum 02.09.2026 die Gestaltung UND den Namen des
// Schwesterprojekts im Betreff, weil sie damals von dort kopiert wurden. Kein
// Test konnte das sehen, keine Seite sah kaputt aus; sichtbar wird es erst,
// wenn eine Mail im Postfach liegt.
//
// DESHALB WERDEN SIE HIER ERZEUGT und mit `npm run auth:mailvorlagen`
// hochgeladen: Dieselbe Hülle wie die Abo-Mails, dieselben Farben aus dem
// Theme, ein Ort für den Wortlaut. Wer die Hülle ändert, lädt danach neu hoch.
//
// ─── Die Platzhalter gehören dem Dienst, nicht uns ───────────────────────────
//
// `{{ .ConfirmationURL }}` und Verwandte setzt der Anmeldedienst beim Versand
// ein. Sie dürfen NICHT durch die HTML-Maskierung laufen — aus dem Punkt würde
// sonst eine Entität, und der Link im Postfach wäre tot. Deshalb steht in den
// Texten unten kein maskierter Nutzerwert: Es gibt schlicht keinen, alles ist
// feststehender Text plus Platzhalter.

/** Eine Vorlage, wie der Anmeldedienst sie kennt. */
export type AuthMailVorlage = {
  /** Schlüssel des Dienstes — bestimmt, welche Vorlage überschrieben wird. */
  art: "confirmation" | "recovery" | "invite" | "magic_link" | "email_change" | "reauthentication";
  betreff: string;
  html: string;
};

/** Kleiner Absatz im Fließtext der Karte. */
function p(text: string, oben = 16): string {
  return `<p style="margin:${oben}px 0 0;font-size:${T.text};line-height:1.65;color:${C.fliess}">${text}</p>`;
}

function titel(text: string): string {
  return `<h1 style="margin:0;font-size:${T.titel};line-height:1.3;font-weight:700;color:${C.text}">${text}</h1>`;
}

/**
 * Der Satz, der jede dieser Mails abschließt.
 *
 * ER STEHT IN JEDER: Eine Mail über ein Konto, das man nicht angefordert hat,
 * ist der Moment, in dem jemand an einen Angriff denkt. Der Satz sagt, dass
 * Nichtstun genügt — das ist die Auskunft, die dann gebraucht wird, und sie
 * kostet eine Zeile.
 */
function beruhigung(was: string): string {
  return `<p style="margin:22px 0 0;font-size:${T.fuss};line-height:1.6;color:${C.leise}">
    Hast du ${was} nicht angefordert, kannst du diese Mail einfach löschen — es passiert dann nichts.
  </p>`;
}

/** Der Link zum Kopieren, für Postfächer, die Knöpfe verschlucken. */
function linkZumKopieren(): string {
  return `<p style="margin:18px 0 0;font-size:${T.klein};line-height:1.6;color:${C.leise};word-break:break-all">
    Falls der Knopf nicht funktioniert, kopiere diese Adresse in deinen Browser:<br>{{ .ConfirmationURL }}
  </p>`;
}

export const AUTH_MAIL_VORLAGEN: AuthMailVorlage[] = [
  {
    art: "confirmation",
    betreff: "Bestätige deine E-Mail-Adresse – Solar Check",
    html: huelle({
      vorschau: "Ein Klick, dann ist dein Konto da.",
      grundzeile: "Du bekommst diese Mail, weil mit deiner Adresse ein Konto bei Solar Check angelegt wurde.",
      inhalt:
        titel("Fast geschafft") +
        p("Bestätige kurz, dass dir diese Adresse gehört — danach kannst du deine Berechnungen speichern und jederzeit wieder aufrufen.") +
        knopf("{{ .ConfirmationURL }}", "E-Mail-Adresse bestätigen") +
        linkZumKopieren() +
        beruhigung("dieses Konto"),
    }),
  },
  {
    art: "recovery",
    betreff: "Passwort setzen – Solar Check",
    html: huelle({
      vorschau: "Der Link gilt 24 Stunden.",
      grundzeile: "Du bekommst diese Mail, weil für dein Konto bei Solar Check ein neues Passwort angefordert wurde.",
      inhalt:
        titel("Neues Passwort setzen") +
        p("Über diesen Link vergibst du ein neues Passwort. Er gilt 24 Stunden und lässt sich nur einmal benutzen.") +
        knopf("{{ .ConfirmationURL }}", "Passwort setzen") +
        linkZumKopieren() +
        p(
          "Falls du dich bisher immer über einen Link in der Mail angemeldet hast: Das ist der Weg zu deinem ersten Passwort. Danach meldest du dich damit an.",
        ) +
        beruhigung("das"),
    }),
  },
  {
    art: "email_change",
    betreff: "Neue E-Mail-Adresse bestätigen – Solar Check",
    html: huelle({
      vorschau: "Ein Klick, dann gilt die neue Adresse.",
      grundzeile: "Du bekommst diese Mail, weil für dein Konto bei Solar Check eine neue Adresse hinterlegt wurde.",
      inhalt:
        titel("Neue Adresse bestätigen") +
        p("Bestätige kurz, dass dir diese Adresse gehört. Danach meldest du dich mit ihr an.") +
        knopf("{{ .ConfirmationURL }}", "Neue Adresse bestätigen") +
        linkZumKopieren() +
        beruhigung("diese Änderung"),
    }),
  },
  {
    art: "magic_link",
    betreff: "Dein Anmeldelink – Solar Check",
    html: huelle({
      vorschau: "Ein Klick, und du bist angemeldet.",
      grundzeile: "Du bekommst diese Mail, weil für dein Konto bei Solar Check ein Anmeldelink angefordert wurde.",
      inhalt:
        titel("Anmelden") +
        p("Über diesen Link kommst du direkt in dein Konto.") +
        knopf("{{ .ConfirmationURL }}", "Anmelden") +
        linkZumKopieren() +
        beruhigung("diese Anmeldung"),
    }),
  },
  {
    art: "invite",
    betreff: "Einladung zu Solar Check",
    html: huelle({
      vorschau: "Ein Konto wartet auf dich.",
      grundzeile: "Du bekommst diese Mail, weil dich jemand zu Solar Check eingeladen hat.",
      inhalt:
        titel("Du bist eingeladen") +
        p("Solar Check rechnet aus, ob sich eine Photovoltaikanlage für dich lohnt — kostenlos, ohne Verkaufsanrufe. Mit einem Konto kannst du Berechnungen speichern.") +
        knopf("{{ .ConfirmationURL }}", "Einladung annehmen") +
        linkZumKopieren() +
        beruhigung("diese Einladung"),
    }),
  },
  {
    art: "reauthentication",
    betreff: "Dein Bestätigungscode – Solar Check",
    html: huelle({
      vorschau: "Der Code für den nächsten Schritt.",
      grundzeile: "Du bekommst diese Mail, weil für dein Konto bei Solar Check eine Bestätigung angefordert wurde.",
      inhalt:
        titel("Dein Code") +
        p("Gib diesen Code ein, um fortzufahren:") +
        `<p style="margin:20px 0 0;font-size:${T.titel};font-weight:700;letter-spacing:0.12em;color:${C.text}">{{ .Token }}</p>` +
        beruhigung("das"),
    }),
  },
];

/** Wie der Anmeldedienst die Vorlagen entgegennimmt. */
export function alsDienstEinstellungen(): Record<string, string> {
  const aus: Record<string, string> = {};
  for (const v of AUTH_MAIL_VORLAGEN) {
    aus[`mailer_subjects_${v.art}`] = v.betreff;
    aus[`mailer_templates_${v.art}_content`] = v.html;
  }
  return aus;
}

export { SITE };
