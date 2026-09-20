import { SITE, C, T, SCHRIFT } from "./mail-huelle";
// DIESELBE SIGNATUR WIE IM KOMMUNEN-ANSCHREIBEN (Betreiber, 03.09.2026), also
// die aus seinem Mailprogramm. Zwei Fassungen desselben Absenders wären genau
// dort sichtbar, wo jemand prüft, ob da wirklich ein Mensch sitzt — und wer
// hier antwortet, landet in demselben Postfach.
import { SIGNATURE } from "./kommunen-outreach-draft";

// ─── SIE SIEHT AUS WIE EINE MAIL VON EINEM MENSCHEN, WEIL SIE EINE IST ──────
//
// Keine Wortmarke, keine Karte, kein Knopf — die Hülle der übrigen Nutzermails
// bleibt hier bewusst weg (Betreiber-Entscheidung 03.09.2026). Eine gestaltete
// Systemmail über eine geänderte Anmeldung trägt exakt die Merkmale, an denen
// man Phishing erkennt: fremdes Layout, „dein Konto", ein Knopf. Ein kurzer
// Text vom Absender persönlich trägt sie nicht.
//
// Die Pflichtangaben stehen trotzdem drin, nur als Zeile statt als Fußleiste:
// Impressum, Datenschutz und der Grund der Zusendung.

// ─── Die einmalige Nachricht zur Umstellung der Anmeldung ────────────────────
//
// Bis zum 02.09.2026 kam man nur über einen Link in der Mail hinein; seitdem
// über E-Mail und Passwort. Die bestehenden Konten haben deshalb KEIN Passwort
// und kämen ohne diese Nachricht nicht mehr in ihren eigenen Bereich. Sie zu
// unterlassen wäre nicht die vorsichtigere, sondern die schlechtere Option.
//
// ─── ZWEI FASSUNGEN, WEIL ZWEI GRUPPEN ──────────────────────────────────────
//
// Von 17 fremden Konten haben 7 den Anmeldelink damals eingelöst, 10 nie.
// Beide werden angeschrieben (Betreiber-Entscheidung 02.09.2026), aber mit
// verschiedenem Aufhänger — und der Unterschied ist kein Zierrat:
//
//   BESTÄTIGT  → „Die Anmeldung hat sich geändert." Das ist die Fortführung
//                eines bestehenden Nutzungsverhältnisses; ohne diese Nachricht
//                kämen sie nicht mehr in ihr Konto.
//   UNBESTÄTIGT → „Wir löschen deinen Eintrag am …" Hier gibt es kein
//                Nutzungsverhältnis: Im doppelten Bestätigungsverfahren ist
//                die ausbleibende Bestätigung definitionsgemäß ein Nein. Was
//                die Nachricht trägt, ist die Transparenz über eine Löschung,
//                die ohnehin fällig ist (Art. 17 Abs. 1 Buchst. a — der Zweck
//                der Speicherung ist mit dem Scheitern der Registrierung
//                entfallen). Die Löschung ist der GRUND der Mail, nicht ihr
//                Nachsatz. Wer die Reihenfolge umdreht — erst einladen, dann
//                als Fußnote löschen —, macht aus der Transparenz einen
//                Vorwand, und dann trägt die Mail nichts mehr.
//
// Legal-Judge am 02.09.2026, Fundstellen im Volltext geprüft. Seine Empfehlung
// war, die 10 kommentarlos zu löschen; der Betreiber hat sich für die
// Löschankündigung entschieden, die derselbe Prüfer ausdrücklich als tragfähig
// bezeichnet hat.
//
// ─── DAS ABMAHNRISIKO IST PRAKTISCH NULL — UND WAR NIE DAS ARGUMENT ─────────
//
// Der Empfänger selbst darf nach § 8 Abs. 3 UWG nicht abmahnen; Mitbewerber
// und Verbände bekommen Mails an private Postfächer nicht mit. Bliebe eine
// Klage des Empfängers über §§ 823, 1004 BGB — bei einer einmaligen Nachricht
// eines kostenlosen Rechners praktisch ausgeschlossen.
//
// Was wirklich zählt, ist die ZUSTELLBARKEIT: Wer sich nach Monaten an nichts
// erinnert, drückt eher Spam als jemand, der eine Löschankündigung liest und
// nichts tun muss. Bei zehn Adressen sind das ein bis zwei Klicks — auf einem
// Versandweg, der am 02.09.2026 seinen ersten Tag hatte und später die
// Abo-Meldungen tragen soll. Deshalb steht der Hinweis auf die Neuerungen in
// der Fassung für die Unbestätigten UNTER der Löschankündigung, nicht darüber.
//
// ─── DER HINWEIS AUF DIE NEUERUNGEN IST EINE ENTSCHEIDUNG, KEIN VERSEHEN ────
//
// Er macht die Nachricht formal zur Werbung (Absatzförderung nach Art. 2
// Buchst. a RL 2006/114/EG) — der Bundesgerichtshof hat eine im Kern zulässige
// Rechnungsmail allein wegen einer angehängten Zufriedenheitsbefragung als
// unzulässige Werbung eingestuft (VI ZR 225/17). Der Betreiber hat das
// abgewogen und sich dafür entschieden; das Risiko steht oben.
//
// WAS TROTZDEM NICHT HINEINDARF, steht in der Liste unten: kein Themen-Abo,
// keine sozialen Netze, kein Abmeldelink für einen Verteiler, den es nicht
// gibt. Drei Neuerungen in drei Zeilen sind der Rahmen — was darüber
// hinausgeht, ist ein Newsletter, und dafür bräuchte es eine Einwilligung.
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
  { muster: /rabatt|angebot|kostenlos testen|empfehl/i, warum: "werbliche Ansprache" },
  { muster: /linkedin|instagram|facebook|folge uns/i, warum: "Verweis auf soziale Netze" },
  { muster: /abbestellen|abmelden von|unsubscribe/i, warum: "Abmeldelink, obwohl es keinen Verteiler gibt" },
];

/** Prüft die fertige Nachricht gegen die Liste. Leer heißt: unbedenklich. */
export function beipackBefund(html: string): string[] {
  return VERBOTEN_IN_UMSTELLUNGSMAIL.filter((v) => v.muster.test(html)).map((v) => v.warum);
}

/**
 * Die drei Neuerungen, die seit dem Frühsommer dazugekommen sind.
 *
 * DREI, NICHT MEHR: Was darüber hinausgeht, ist ein Newsletter — und dafür
 * bräuchte es eine Einwilligung, die hier niemand erteilt hat. Die Förderung
 * steht zuerst, weil sie als einzige konkret Geld bewegt.
 */
const NEUERUNGEN: { was: string }[] = [
  { was: "Förderprogramme deiner Gemeinde werden automatisch abgezogen, Postleitzahl eingeben reicht" },
  { was: "Umschalten zwischen heutiger Einspeisevergütung und dem, was ab 2027 geplant ist" },
  { was: "Neue Rechner für Balkonkraftwerk, Klimaanlage und Einspeisevergütung" },
];

export const UMSTELLUNG_BETREFF = "Die Anmeldung bei Solar Check läuft jetzt anders";

export type Empfaengergruppe = "bestaetigt" | "unbestaetigt";

/**
 * Wie lange ein nie bestätigter Eintrag noch bleibt, gerechnet ab dem Versand.
 *
 * Vier Wochen: lang genug, dass niemand die Mail im Urlaub verpasst, kurz
 * genug, dass es eine echte Ankündigung bleibt und keine Floskel.
 */
export const LOESCHFRIST_TAGE = 28;

export function loeschdatum(ab: Date): string {
  const d = new Date(ab.getTime() + LOESCHFRIST_TAGE * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
}

/**
 * Die Nachricht an ein Konto.
 *
 * OHNE ANREDE: Wir kennen keinen Namen, und „Hallo" an eine Adresse, hinter
 * der ein Rathaus oder eine Nachbarin sitzen kann, ist geraten — dieselbe
 * Entscheidung wie bei den Abo-Mails.
 *
 * DIE REIHENFOLGE IST BEI DEN UNBESTÄTIGTEN DER GANZE PUNKT: erst die
 * Löschung, dann erst der Rest. Sie trägt die Nachricht; kommt sie als
 * Nachsatz, ist sie ein Vorwand (siehe Kopf dieser Datei).
 */
export function umstellungsMail(o: {
  gruppe: Empfaengergruppe;
  /** Wird hereingereicht, nie hier geholt — sonst ließe sich nichts prüfen. */
  jetzt: Date;
}): { betreff: string; html: string; text: string } {
  const anmeldeUrl = `${SITE}/login`;
  const bestaetigt = o.gruppe === "bestaetigt";
  const frist = loeschdatum(o.jetzt);

  const betreff = bestaetigt
    ? UMSTELLUNG_BETREFF
    : "Dein Account bei solar-check.io wird gelöscht";

  // WICHTIG BEI DEN BESTÄTIGTEN: Sie haben kein Passwort und bekommen hier
  // auch keins. Der Text muss deshalb sagen, dass sie es sich per Mail
  // anfordern („Passwort vergessen?") — sonst stehen sie vor einem Formular,
  // in das sie nichts eintragen können. Genau das ist beim ersten Entwurf
  // aufgefallen.
  // ─── Inhalt als BLÖCKE, nicht als Zeilen ───────────────────────────────────
  //
  // Vorher stand der Text als fest umbrochene Zeilen da, und beide Fassungen
  // haben ihn geerbt. Im Postfach sah man das sofort: „Die Mail ist
  // wahrscheinlich / im Spam gelandet" bricht mitten im Satz, weil ein
  // Mailprogramm selbst umbricht und unser Umbruch obendrauf kommt. Dazu eine
  // Leerzeile zu viel unter der Liste — der Abstand der Liste UND die leere
  // Zeile daneben.
  //
  // Also: Absätze bleiben ungebrochen, das HTML setzt sie als Absätze, und die
  // Textfassung bricht sie erst beim Ausgeben um. Nur die Signatur behält ihre
  // Zeilen, dort ist der Umbruch der Inhalt.
  type Block = string | { liste: string[] } | { zeilen: string[] };

  const bloecke: Block[] = bestaetigt
    ? [
        "Hallo,",
        `du hattest dir mal ein Konto bei Solar Check angelegt. Wir haben die Anmeldefunktion optimiert, dazu müsstest du nur einmal ein Passwort hier bei \u201ePasswort vergessen\u201c anfordern: ${anmeldeUrl}`,
        "Würde mich freuen wenn du mal wieder reinschaust, es hat sich einiges getan:",
        { liste: NEUERUNGEN.map((n) => n.was) },
        "Brauchst du das Konto nicht mehr, schreib einfach zurück, dann lösche ich es.",
        { zeilen: ["Viele Grüße", ...SIGNATURE.split("\n")] },
      ]
    : [
        "Hallo,",
        "du hattest dich mal bei Solar Check angemeldet. Die Mail ist wahrscheinlich im Spam gelandet, weil sie von einer komischen Absenderadresse kam. Ist inzwischen gefixt.",
        `Deine Adresse wird am ${frist} automatisch gelöscht, falls du nichts tust.`,
        "Würde mich allerdings freuen wenn du noch mal reinschaust, es hat sich einiges getan:",
        { liste: NEUERUNGEN.map((n) => n.was) },
        `Willst du das Konto doch, leg es bis dahin einfach neu an: ${anmeldeUrl}`,
        "Soll ich früher löschen, schreib einfach zurück.",
        { zeilen: ["Viele Grüße", ...SIGNATURE.split("\n")] },
      ];

  const fussZeile = `Impressum: ${SITE}/impressum · Datenschutz: ${SITE}/datenschutz`;

  // ─── Textfassung ──────────────────────────────────────────────────────────

  const umbrechen = (t: string, breite = 78): string[] => {
    const raus: string[] = [];
    let zeile = "";
    for (const wort of t.split(" ")) {
      if (zeile && (zeile + " " + wort).length > breite) {
        raus.push(zeile);
        zeile = wort;
      } else zeile = zeile ? zeile + " " + wort : wort;
    }
    if (zeile) raus.push(zeile);
    return raus;
  };

  const textTeile: string[] = [];
  for (const b of bloecke) {
    if (typeof b === "string") textTeile.push(umbrechen(b).join("\n"));
    else if ("liste" in b) textTeile.push(b.liste.map((l) => `* ${l}`).join("\n"));
    else textTeile.push(b.zeilen.join("\n"));
  }
  const text = textTeile.join("\n\n") + "\n\n--\n" + fussZeile;

  // ─── HTML ─────────────────────────────────────────────────────────────────

  const verlinke = (t: string) =>
    t.replace(/https:\/\/[^\s]+/g, (u) => `<a href="${u}" style="color:${C.akzent}">${u}</a>`);

  const absatz = (inhalt: string) => `<p style="margin:0 0 16px">${inhalt}</p>`;

  const htmlTeile = bloecke.map((b) => {
    if (typeof b === "string") return absatz(verlinke(b));
    if ("liste" in b)
      return (
        `<ul style="margin:0 0 16px;padding:0 0 0 20px">` +
        b.liste.map((l) => `<li style="margin:0 0 6px">${verlinke(l)}</li>`).join("") +
        `</ul>`
      );
    return absatz(b.zeilen.map((z) => verlinke(z)).join("<br>"));
  });

  const html =
    `<div style="font-family:${SCHRIFT};font-size:${T.text};line-height:1.55;color:${C.text}">` +
    htmlTeile.join("") +
    `<p style="margin:0;color:${C.leise};font-size:${T.fuss}">--<br>${verlinke(fussZeile)}</p>` +
    `</div>`;

  return { betreff, html, text };
}
