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

import { escapeHtml } from "./html-escape";
import type { Meldung } from "./gemeinde-meldungen";

import { huelle, knopf, C, T, SITE } from "./mail-huelle";

/**
 * Was eine Abo-Mail tragen MUSS.
 *
 * EIGENE LISTE, nicht die des Anschreibens: Dort steht „Art. 14 DSGVO", und
 * genau die Angabe wäre hier falsch (siehe Punkt 2 oben). Der Versand prüft
 * dagegen, bevor irgendetwas hinausgeht.
 *
 * `nurMeldung` unterscheidet die beiden Arten — und die Unterscheidung ist
 * nicht kosmetisch, sie war ein BLOCKER: Ohne sie verlangte die Prüfung auch
 * von der Bestätigungsmail einen Abmeldelink, den diese bewusst nicht hat (es
 * gibt noch nichts, wovon man sich abmelden könnte). Der Versand wies sie
 * deshalb ab — es wäre NIE eine Bestätigungsmail hinausgegangen, und damit nie
 * ein Abo zustande gekommen.
 *
 * Kein Test hat das gefangen: Sie prüfen die Vorlagen einzeln, und die
 * Bestätigungsmail wurde nur darauf geprüft, dass sie KEINEN Abmeldelink hat.
 * Aufgefallen ist es erst beim ersten echten Versand.
 */
export const ABO_PFLICHTANGABEN: {
  was: string;
  /** Nur für Meldungsmails — die Bestätigung trägt diese Angabe nicht. */
  nurMeldung?: boolean;
  /**
   * Nicht für die einmalige Umstellungs-Nachricht.
   *
   * Sie ist als Mail eines Menschen geschrieben, und ein Satz wie „Diese
   * E-Mail bekommst du, weil …" ist genau der Systemton, gegen den sie gebaut
   * ist (Betreiber, 03.09.2026). Rechtlich verlangt ihn hier nichts: Der
   * Empfänger hat sich selbst eingetragen, es gibt keinen Verteiler und keine
   * Werbeeinwilligung, auf die zu verweisen wäre. Impressum und Datenschutz
   * bleiben Pflicht und bleiben drin.
   */
  nichtBeiUmstellung?: boolean;
  pruefe: (text: string) => boolean;
}[] = [
  { was: "Abmeldelink", nurMeldung: true, pruefe: (t) => t.includes("/abo/abmelden") },
  { was: "Impressum-Link", pruefe: (t) => t.includes("solar-check.io/impressum") },
  { was: "Datenschutz-Link", pruefe: (t) => t.includes("solar-check.io/datenschutz") },
  {
    was: "Grund der Zusendung",
    nichtBeiUmstellung: true,
    pruefe: (t) => /Diese E-Mail bekommst du, weil/.test(t),
  },
];

export type AboMailArt = "bestaetigung" | "meldung" | "umstellung";

export function fehlendeAboPflichtangaben(html: string, art: AboMailArt = "meldung"): string[] {
  return ABO_PFLICHTANGABEN.filter(
    (p) =>
      (art === "meldung" || !p.nurMeldung) &&
      !(art === "umstellung" && p.nichtBeiUmstellung) &&
      !p.pruefe(html),
  ).map((p) => p.was);
}

// ─── Farben und Maße ────────────────────────────────────────────────────────
//
// ALLES aus dem Theme, NICHTS getippt. Eine Mail hat kein
// CSS-Variablen-System, deshalb der Weg über `tokens[…]` — derselbe wie beim
// OG-Bild und bei der Preis-Mail. Eine erste Fassung hatte die Werte hier
// hingeschrieben ("die Mail kennt das Theme ja nicht"), und das ist genau der
// Fehler, gegen den die Regel steht: Ändert sich das Blau, ändert es sich
// überall außer hier, und niemand merkt es.
//
// FEST HELL, unabhängig von der Tageszeit: Die Seite folgt der Sonne, eine Mail
// liegt für immer im Postfach. Dieselbe Entscheidung wie beim Bild-Export, wo
// die Aufnahme immer auf der hellsten Stufe entsteht. Genommen wird deshalb der
// Grundsatz aus `tokens`, nie eine Tagesstufe.

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
  einstellungenUrl?: string;
}): { subject: string; html: string; text: string } {
  const ort = escapeHtml(o.ortName);
  const subject = `Bitte bestätigen: Meldungen zu ${o.ortName}`;

  const inhalt = `
    <p style="margin:0 0 14px;font-size:${T.titel};font-weight:800;line-height:1.25;color:${C.text};letter-spacing:-0.02em">Noch ein Klick</p>
    <p style="margin:0 0 14px">
      Du möchtest Bescheid bekommen, wenn sich bei den Solaranlagen in ${ort} etwas tut.
      Bestätige das bitte einmal — danach hörst du von uns nur, wenn es wirklich etwas zu
      berichten gibt.
    </p>
    ${knopf(o.bestaetigenUrl, "Ja, Meldungen zu " + o.ortName)}
    <p style="margin:0 0 8px;font-size:${T.fuss};color:${C.leise}">Der Link gilt 48 Stunden.</p>
    <p style="margin:0;font-size:${T.fuss};color:${C.leise}">
      Wenn du das nicht warst, ist nichts passiert: Ohne diesen Klick verschicken wir nichts,
      und die Eintragung wird nach kurzer Zeit von selbst gelöscht.
    </p>`;

  const html = huelle({
    vorschau: `Ein Klick, dann bekommst du Meldungen zu ${o.ortName}.`,
    inhalt,
    einstellungenUrl: o.einstellungenUrl,
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
    ...(o.einstellungenUrl ? [`Deine Meldungen einstellen: ${o.einstellungenUrl}`, ``] : []),
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
  einstellungenUrl?: string;
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
       <p style="margin:0 0 10px;font-size:${T.fuss};font-weight:600;color:${C.leise}">Außerdem</p>
       ${weitere
         .map(
           (m) =>
             `<p style="margin:0 0 12px"><strong style="color:${C.text}">${escapeHtml(m.titel)}</strong><br>
              <span style="font-size:${T.text}">${escapeHtml(m.text)}</span></p>`,
         )
         .join("")}`
    : "";

  const inhalt = `
    <p style="margin:0 0 14px;font-size:${T.titel};font-weight:800;line-height:1.25;color:${C.text};letter-spacing:-0.02em">${escapeHtml(erste.titel)}</p>
    <p style="margin:0 0 16px">${escapeHtml(erste.text)}</p>
    ${weitereHtml}
    <hr style="border:0;border-top:1px solid ${C.linie};margin:22px 0">
    <p style="margin:0 0 6px">
      <a href="${o.ortUrl}" style="color:${C.akzent};font-weight:700">Alle Zahlen zu ${ort} ansehen</a>
    </p>
    <p style="margin:0;font-size:${T.klein};color:${C.leise}">
      Grundlage ist das Marktstammdatenregister der Bundesnetzagentur, Stand ${escapeHtml(o.standLabel)}.
      Erzeugungs- und CO₂-Angaben sind gerechnet, nicht gemessen.
    </p>`;

  const html = huelle({
    vorschau: erste.titel,
    inhalt,
    abmeldeUrl: o.abmeldeUrl,
    einstellungenUrl: o.einstellungenUrl,
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
    ...(o.einstellungenUrl ? [`Deine Meldungen einstellen: ${o.einstellungenUrl}`] : []),
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
