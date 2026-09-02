import { huelle, knopf, C, T, SITE } from "./mail-huelle";

// ─── Die einmalige Nachricht zur Umstellung der Anmeldung ────────────────────
//
// Bis zum 02.09.2026 kam man nur über einen Link in der Mail hinein; seitdem
// über E-Mail und Passwort. Die bestehenden Konten haben deshalb KEIN Passwort
// und kämen ohne diese Nachricht nicht mehr in ihren eigenen Bereich. Sie zu
// unterlassen wäre nicht die vorsichtigere, sondern die schlechtere Option.
//
// ─── SIE GEHT NUR AN BESTÄTIGTE ADRESSEN — BLOCKER ───────────────────────────
//
// Von 17 fremden Konten haben 10 den Anmeldelink nie eingelöst. An sie geht
// NICHTS: Im doppelten Bestätigungsverfahren ist die ausbleibende Bestätigung
// definitionsgemäß ein Nein, und eine zweite Mail behandelt dieses Nein als
// Vielleicht. Dazu kommt der Zeitablauf (Monate) gegen die vernünftigen
// Erwartungen aus Erwägungsgrund 47 und das ohnehin fällige Löschgebot aus
// Art. 17 Abs. 1 Buchst. a — der Zweck der Speicherung ist mit dem Scheitern
// der Registrierung entfallen. Legal-Judge am 02.09.2026, Fundstellen im
// Volltext geprüft.
//
// Der Einwand „die erste Mail ist im Spam gelandet, sie hatten nie die Wahl"
// ist ernst zu nehmen und bleibt eine VERMUTUNG: Die alten Mails gingen über
// den eingebauten Versand des Anmeldedienstes, dessen Zustellprotokolle nicht
// herausgegeben werden (am 02.09.2026 über die Schnittstelle geprüft, nicht
// erreichbar). Ohne diesen Beleg wird gelöscht, nicht geschrieben.
//
// ─── WARUM KEIN WORT MEHR DARIN STEHT, ALS DORT STEHT ────────────────────────
//
// Diese Nachricht ist KEINE Werbung — sie führt ein bestehendes
// Nutzungsverhältnis fort (Art. 6 Abs. 1 Buchst. b DSGVO). Genau diese
// Einordnung kippt, sobald irgendetwas beigepackt wird: ein Hinweis auf einen
// neuen Rechner, auf das Themen-Abo, ein Marketing-Fuß, Symbole sozialer
// Netze. Der Bundesgerichtshof hat eine im Kern zulässige Rechnungsmail allein
// wegen einer angehängten Zufriedenheitsbefragung als unzulässige Werbung
// eingestuft (VI ZR 225/17). Wer hier etwas hinzufügt, macht aus einer
// erlaubten Systemmail eine Werbemail an Adressen ohne Werbeeinwilligung.
//
// ─── UND WARUM SIE KEINEN ZUGANG TRÄGT ───────────────────────────────────────
//
// Der Knopf führt auf die Anmeldeseite, nicht auf einen fertigen Anmeldelink.
// Zwei Gründe: Die Mail transportiert dann keinen gültigen Kontozugang, der in
// einem Postfach liegen bleibt (Art. 32) — und sie sieht dem Phishing weniger
// ähnlich, dessen Muster sie sonst punktgenau trägt („dein Konto", „setz dein
// Passwort", ein Link). Den kurzlebigen Link fordert der Nutzer selbst an.

/** Was in dieser Nachricht NICHT stehen darf. Geprüft am fertigen HTML. */
export const VERBOTEN_IN_UMSTELLUNGSMAIL: { muster: RegExp; warum: string }[] = [
  { muster: /abonn|newsletter|meldungen zu deiner gemeinde/i, warum: "Hinweis auf das Themen-Abo" },
  { muster: /jetzt (berechnen|rechnen|ausprobieren)|schau dir an|entdecke/i, warum: "Aufforderung zur Nutzung" },
  { muster: /rabatt|angebot|kostenlos testen|empfehlen/i, warum: "werbliche Ansprache" },
  { muster: /linkedin|instagram|facebook|folge uns/i, warum: "Verweis auf soziale Netze" },
  { muster: /abbestellen|abmelden von|unsubscribe/i, warum: "Abmeldelink, obwohl es keinen Verteiler gibt" },
];

/** Prüft die fertige Nachricht gegen die Liste. Leer heißt: unbedenklich. */
export function beipackBefund(html: string): string[] {
  return VERBOTEN_IN_UMSTELLUNGSMAIL.filter((v) => v.muster.test(html)).map((v) => v.warum);
}

export const UMSTELLUNG_BETREFF = "Die Anmeldung bei Solar Check funktioniert jetzt anders";

/**
 * Die Nachricht an ein bestätigtes Konto.
 *
 * Ohne Anrede: Wir kennen keinen Namen, und „Hallo" an eine Adresse, hinter der
 * ein Rathaus oder eine Nachbarin sitzen kann, ist geraten — dieselbe
 * Entscheidung wie bei den Abo-Mails.
 */
export function umstellungsMail(): { betreff: string; html: string; text: string } {
  const anmeldeUrl = `${SITE}/login`;

  const html = huelle({
    vorschau: "Dein Konto und deine Berechnungen sind unverändert da.",
    grundzeile:
      "Du bekommst diese Nachricht, weil du bei Solar Check ein Konto hast. Sie geht einmalig an alle Konten.",
    inhalt:
      `<h1 style="margin:0;font-size:${T.titel};line-height:1.3;font-weight:700;color:${C.text}">Die Anmeldung hat sich geändert</h1>` +
      `<p style="margin:16px 0 0;font-size:${T.text};line-height:1.65;color:${C.fliess}">Bisher hast du dich über einen Link angemeldet, den wir dir per Mail geschickt haben. Ab jetzt läuft es über ein Passwort, das du selbst wählst — oder über dein Google-Konto.</p>` +
      `<p style="margin:16px 0 0;font-size:${T.text};line-height:1.65;color:${C.fliess}">Dein Konto und deine gespeicherten Berechnungen sind unverändert da. Du brauchst nur einmal ein Passwort zu setzen: auf der Anmeldeseite auf „Passwort vergessen?", dann bekommst du einen Link dorthin.</p>` +
      knopf(anmeldeUrl, "Zur Anmeldung") +
      `<p style="margin:22px 0 0;font-size:${T.fuss};line-height:1.6;color:${C.leise}">Falls du dein Konto nicht mehr brauchst, musst du nichts tun — schreib uns, dann löschen wir es samt allem, was darin liegt.</p>`,
  });

  const text = [
    "Die Anmeldung bei Solar Check hat sich geändert.",
    "",
    "Bisher hast du dich über einen Link angemeldet, den wir dir per Mail geschickt haben.",
    "Ab jetzt läuft es über ein Passwort, das du selbst wählst — oder über dein Google-Konto.",
    "",
    "Dein Konto und deine gespeicherten Berechnungen sind unverändert da. Du brauchst nur",
    "einmal ein Passwort zu setzen: auf der Anmeldeseite auf „Passwort vergessen?\", dann",
    "bekommst du einen Link dorthin.",
    "",
    anmeldeUrl,
    "",
    "Falls du dein Konto nicht mehr brauchst, musst du nichts tun — schreib uns, dann",
    "löschen wir es samt allem, was darin liegt.",
    "",
    "Solar Check · " + SITE + "/impressum · " + SITE + "/datenschutz",
  ].join("\n");

  return { betreff: UMSTELLUNG_BETREFF, html, text };
}
