// Die Mails des Gemeinde-Abos: Bestätigung und Meldung.
//
// AUFBAU aus dem Schwesterprojekt übernommen, wo dieselbe Sache läuft (jemand
// ohne Konto folgt einem Thema, bestätigt per Mail, meldet sich per Link ab):
// Kopf mit Wortmarke, Inhalt in einer Karte, Trennlinie, Fuß mit Impressum,
// dem Satz WARUM diese Mail kam, und dem Abmeldelink.
//
// NICHT übernommen ist der dortige Baukasten für Mail-Layouts: Sein Hersteller
// hat ihn als eingestellt markiert, und ihn für zwei Vorlagen einzuführen wäre
// genau die Abhängigkeit ohne konkreten Grund, die die Projektregeln
// ausschließen. Zwei Zeichenketten mit Inline-Stilen tun dasselbe — es ist
// ohnehin das Muster, in dem die Alarm- und die Preis-Mail schon geschrieben
// sind.
//
// ─── Drei Unterschiede zum Kommunen-Anschreiben, alle mit Grund ──────────────
//
// Das Anschreiben (lib/kommunen-outreach-draft.ts + lib/outreach-mail.ts) ist
// KALTAKQUISE. Diese Mails hier sind das Gegenteil: Jemand hat darum gebeten.
// Drei Regeln kippen dadurch, und wer sie aus dem Anschreiben kopiert, baut
// jeweils den falschen Fall:
//
//   1. LIST-UNSUBSCRIBE GEHÖRT HIER HINEIN. Im Anschreiben ist die Kopfzeile
//      absichtlich leer — am 19.08.2026 an einer echten Probemail gemessen:
//      Apple Mail setzt daraufhin ein Banner „Diese E-Mail ist von einer
//      Mailing-Liste" ÜBER den Brief, und der ganze Brief ist darauf gebaut,
//      dass ein Mensch einem anderen schreibt. Bei einer Abo-Mail IST es eine
//      Liste. Das Banner sagt dann die Wahrheit, und der Ein-Klick-Weg ist
//      genau das, was der Anmeldeknopf mit „jederzeit abmeldbar" zusagt.
//   2. DIE HERKUNFTSZEILE IST ART. 13, NICHT ART. 14. Beim Anschreiben stammen
//      die Kontaktdaten aus einer fremden Quelle (der Amtsseite), deshalb die
//      Herkunftspflicht nach Art. 14. Hier hat der Empfänger seine Adresse
//      selbst eingetragen — dann gilt Art. 13, und ein „wir haben Ihre Adresse
//      im Internet gefunden" wäre schlicht falsch.
//   3. DIE ANREDE IST DU-NEUTRAL. Das Anschreiben siezt eine Verwaltung. Hier
//      sitzen Rathaus und Nachbarin auf derselben Liste; die Mail spricht
//      deshalb niemanden direkt an, statt sich für eine Anrede zu entscheiden,
//      die für die halbe Liste falsch ist.

import { tokens } from "./theme";
import { escapeHtml } from "./html-escape";
import type { Meldung } from "./gemeinde-meldungen";

const SITE = "https://solar-check.io";

/**
 * Pflichtangaben einer Abo-Mail.
 *
 * EIGENE LISTE, nicht die des Anschreibens: Dort steht „Art. 14 DSGVO", und
 * genau die Angabe wäre hier falsch (siehe Punkt 2 oben). Der Versand prüft
 * dagegen, bevor irgendetwas hinausgeht — dieselbe Systematik wie beim
 * Anschreiben, nur mit dem richtigen Inhalt.
 */
export const ABO_PFLICHTANGABEN: { was: string; pruefe: (text: string) => boolean }[] = [
  { was: "Abmeldelink", pruefe: (t) => t.includes("/abo/abmelden") },
  { was: "Impressum-Link", pruefe: (t) => t.includes("solar-check.io/impressum") },
  { was: "Datenschutz-Link", pruefe: (t) => t.includes("solar-check.io/datenschutz") },
  { was: "Grund der Zusendung", pruefe: (t) => /Diese E-Mail bekommst du, weil/.test(t) },
];

export function fehlendeAboPflichtangaben(html: string): string[] {
  return ABO_PFLICHTANGABEN.filter((p) => !p.pruefe(html)).map((p) => p.was);
}

// ─── Farben ──────────────────────────────────────────────────────────────────
//
// Aus dem Theme, nie getippt (Projektregel: keine Design-Farbe als Hex-Literal).
// Eine Mail hat kein CSS-Variablen-System, deshalb der Weg über `tokens[…]` —
// derselbe wie beim OG-Bild und bei der Preis-Mail.
//
// FEST HELL, unabhängig von der Tageszeit: Die Seite folgt der Sonne, eine Mail
// liegt für immer im Postfach. Dieselbe Entscheidung wie beim Bild-Export, wo
// die Aufnahme immer auf der hellsten Stufe entsteht.
const C = {
  text: "#3F3F3F",
  leise: "#767676",
  linie: "#E4E4E4",
  karte: "#FFFFFF",
  grund: "#F6F6F4",
  akzent: tokens["--color-accent"],
};

// ─── Hülle ───────────────────────────────────────────────────────────────────

/**
 * Kopf, Inhaltskarte, Fuß.
 *
 * Die Wortmarke steht als TEXT, nicht als Bild. Bilder werden in vielen
 * Postfächern erst nach einem Klick geladen; ein blockiertes Logo ist ein
 * leerer Kasten über dem Brief, und die Marke ist genau das, was oben stehen
 * soll.
 */
function huelle(o: {
  vorschau: string;
  inhalt: string;
  /** Fehlt er, ist es eine transaktionale Mail (Bestätigung) — dann kein
   *  Abmeldelink: Es gibt noch nichts, wovon man sich abmelden könnte. */
  abmeldeUrl?: string;
  /** Warum kam diese Mail? Steht im Fuß, nie im Kleingedruckten. */
  grundzeile: string;
}): string {
  const fuss = o.abmeldeUrl
    ? `<p style="margin:0 0 6px;font-size:12px;color:${C.leise}">${escapeHtml(o.grundzeile)}</p>
       <p style="margin:0 0 12px;font-size:12px">
         <a href="${o.abmeldeUrl}" style="color:${C.leise}">Diese Meldungen abbestellen</a>
       </p>`
    : `<p style="margin:0 0 12px;font-size:12px;color:${C.leise}">${escapeHtml(o.grundzeile)}</p>`;

  return `<div style="background:${C.grund};margin:0;padding:32px 16px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden">${escapeHtml(o.vorschau)}</span>
  <div style="max-width:560px;margin:0 auto">

    <div style="text-align:center;padding-bottom:20px">
      <a href="${SITE}" style="font-size:17px;font-weight:700;color:${C.text};text-decoration:none">Solar&nbsp;Check</a>
    </div>

    <div style="background:${C.karte};border:1px solid ${C.linie};border-radius:12px;padding:28px 24px;color:${C.text};font-size:15px;line-height:1.65">
      ${o.inhalt}
    </div>

    <div style="text-align:center;padding:20px 8px 0">
      ${fuss}
      <p style="margin:0;font-size:12px;color:${C.leise}">
        <a href="${SITE}/impressum" style="color:${C.leise}">Impressum</a>
        &nbsp;·&nbsp;
        <a href="${SITE}/datenschutz" style="color:${C.leise}">Datenschutz</a>
      </p>
    </div>

  </div>
</div>`;
}

function knopf(url: string, text: string): string {
  return `<p style="margin:24px 0">
    <a href="${url}" style="display:inline-block;background:${C.akzent};color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:15px">${escapeHtml(text)}</a>
  </p>`;
}

// ─── Die Bestätigungsmail ────────────────────────────────────────────────────

/**
 * Der zweite Schritt der Anmeldung.
 *
 * OHNE IHN GEHT NICHTS RAUS, und das ist keine Höflichkeit: Ohne bestätigte
 * Einwilligung wäre jede Folge-Mail unverlangte Werbung (§ 7 Abs. 2 Nr. 2
 * UWG) — diesmal nicht an ein Rathaus, das nicht abmahnbefugt ist, sondern an
 * eine beliebige Adresse, die jemand Drittes eingetragen haben kann. Das
 * Verfahren schützt außerdem genau diesen Dritten: Wer nie zugestimmt hat,
 * bekommt eine Mail und danach nie wieder eine.
 */
export function aboBestaetigungsMail(o: {
  ortName: string;
  bestaetigenUrl: string;
}): { subject: string; html: string; text: string } {
  const ort = escapeHtml(o.ortName);
  const subject = `Bitte bestätigen: Meldungen zu ${o.ortName}`;

  const inhalt = `
    <p style="margin:0 0 14px;font-size:19px;font-weight:700">Noch ein Klick</p>
    <p style="margin:0 0 14px">
      Du möchtest Bescheid bekommen, wenn sich bei den Solaranlagen in ${ort} etwas tut.
      Bestätige das bitte einmal — danach hörst du von uns nur, wenn es wirklich etwas zu
      berichten gibt.
    </p>
    ${knopf(o.bestaetigenUrl, "Ja, Meldungen zu " + o.ortName)}
    <p style="margin:0 0 8px;font-size:13px;color:${C.leise}">Der Link gilt 48 Stunden.</p>
    <p style="margin:0;font-size:13px;color:${C.leise}">
      Wenn du das nicht warst, ist nichts passiert: Ohne diesen Klick verschicken wir nichts,
      und die Eintragung wird nach kurzer Zeit von selbst gelöscht.
    </p>`;

  const html = huelle({
    vorschau: `Ein Klick, dann bekommst du Meldungen zu ${o.ortName}.`,
    inhalt,
    grundzeile:
      "Diese E-Mail bekommst du, weil diese Adresse auf solar-check.io für Meldungen zu " +
      `${o.ortName} eingetragen wurde. Sie wurde bei uns eingegeben und nicht aus einer anderen Quelle übernommen (Art. 13 DSGVO).`,
  });

  const text = [
    `Noch ein Klick.`,
    ``,
    `Du möchtest Bescheid bekommen, wenn sich bei den Solaranlagen in ${o.ortName} etwas tut.`,
    `Bitte bestätige das einmal:`,
    o.bestaetigenUrl,
    ``,
    `Der Link gilt 48 Stunden. Wenn du das nicht warst, ist nichts passiert.`,
    ``,
    `Impressum: ${SITE}/impressum · Datenschutz: ${SITE}/datenschutz`,
  ].join("\n");

  return { subject, html, text };
}

// ─── Die Meldungsmail ────────────────────────────────────────────────────────

/**
 * Was sich im Ort getan hat.
 *
 * Der Inhalt wird GERECHNET, nicht getippt: Die Meldungen kommen aus
 * `gemeindeMeldungen()`, also aus derselben Rechnung, die den Block auf der
 * Gemeindeseite füllt. Ein Beitrag kann damit keine Zahl behaupten, die die
 * verlinkte Seite widerlegt — genau die Fehlerklasse, an der das
 * Kommunen-Anschreiben schon einmal gescheitert ist.
 */
export function aboMeldungsMail(o: {
  ortName: string;
  ortUrl: string;
  meldungen: Meldung[];
  abmeldeUrl: string;
  /** Datenstand des Anlagenregisters, ausgeschrieben. */
  standLabel: string;
}): { subject: string; html: string; text: string } {
  if (o.meldungen.length === 0) {
    throw new Error("Eine Meldungsmail ohne Meldung wird nicht gebaut — der Versand entscheidet vorher.");
  }

  const erste = o.meldungen[0];
  const weitere = o.meldungen.slice(1);
  const ort = escapeHtml(o.ortName);

  const subject = erste.titel;

  const weitereHtml = weitere.length
    ? `<hr style="border:0;border-top:1px solid ${C.linie};margin:22px 0">
       <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:${C.leise}">Außerdem</p>
       ${weitere
         .map(
           (m) =>
             `<p style="margin:0 0 12px"><strong>${escapeHtml(m.titel)}</strong><br>
              <span style="font-size:14px">${escapeHtml(m.text)}</span></p>`,
         )
         .join("")}`
    : "";

  const inhalt = `
    <p style="margin:0 0 14px;font-size:19px;font-weight:700">${escapeHtml(erste.titel)}</p>
    <p style="margin:0 0 16px">${escapeHtml(erste.text)}</p>
    ${weitereHtml}
    <hr style="border:0;border-top:1px solid ${C.linie};margin:22px 0">
    <p style="margin:0 0 6px">
      <a href="${o.ortUrl}" style="color:${C.akzent};font-weight:600">Alle Zahlen zu ${ort} ansehen</a>
    </p>
    <p style="margin:0;font-size:12px;color:${C.leise}">
      Grundlage ist das Marktstammdatenregister der Bundesnetzagentur, Stand ${escapeHtml(o.standLabel)}.
      Erzeugungs- und CO₂-Angaben sind gerechnet, nicht gemessen.
    </p>`;

  const html = huelle({
    vorschau: erste.titel,
    inhalt,
    abmeldeUrl: o.abmeldeUrl,
    grundzeile: `Diese E-Mail bekommst du, weil du Meldungen zu ${o.ortName} abonniert hast.`,
  });

  const text = [
    erste.titel,
    "",
    erste.text,
    ...weitere.flatMap((m) => ["", m.titel, m.text]),
    "",
    `Alle Zahlen zu ${o.ortName}: ${o.ortUrl}`,
    "",
    `Grundlage: Marktstammdatenregister der Bundesnetzagentur, Stand ${o.standLabel}.`,
    `Abbestellen: ${o.abmeldeUrl}`,
    `Impressum: ${SITE}/impressum · Datenschutz: ${SITE}/datenschutz`,
  ].join("\n");

  return { subject, html, text };
}

// ─── Kopfzeilen ──────────────────────────────────────────────────────────────

/**
 * Die Kopfzeilen einer Abo-Meldung.
 *
 * HIER STEHT LIST-UNSUBSCRIBE — anders als beim Kommunen-Anschreiben, wo das
 * Feld nach einer Messung absichtlich leer bleibt. Der Grund für den
 * Unterschied steht oben im Dateikopf: Dort erzeugt es ein falsches
 * „Mailing-Liste"-Banner über einem persönlichen Brief, hier beschreibt es den
 * Sachverhalt richtig.
 *
 * `List-Unsubscribe-Post` macht daraus den Ein-Klick nach RFC 8058: Das
 * Postfach ruft die Adresse selbst auf, der Empfänger sieht nur „abgemeldet".
 * Wer das setzt, MUSS die Abmelde-Adresse auch auf POST antworten lassen — und
 * zwar ohne Rückfrage, sonst meldet sich niemand ab und die Mail gilt bei
 * großen Anbietern als nicht abbestellbar.
 */
export function aboMailKopfzeilen(abmeldeUrl: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${abmeldeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
