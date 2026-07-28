// Template-basierter Anschreiben-Generator für den Kommunen-Outreach.
//
// Bewusst KEIN LLM: das Projekt hat keine LLM-Anbindung, und die Personalisierung
// kommt aus den echten Zahlen der Gemeinde — der Mensch editiert vor dem Senden
// ohnehin. Eine reine Funktion (server + testbar), keine DB-/Next-Importe.
//
// DER ASK IST DIE MELDUNG, nicht das Widget (Entscheidung 28.07.2026). Ein
// Widget-Einbau bedeutet für eine Verwaltung CMS-Zugriff, IT und
// Datenschutzbeauftragten — vier Beteiligte für ein kostenloses Angebot ohne
// Frist, das sich intern gegen nichts durchsetzt. Eine fertige Meldung braucht
// einen Beteiligten, kein iframe, keine Datenschutzprüfung — und der Link auf
// uns steht danach als echtes <a> im HTML der Gemeindeseite. Das Widget bleibt
// als dauerhafte Alternative, aber nur in der Variante `meldung_plus_widget`.
//
// Betreff + Einstieg kommen aus der Award-Hook-Logik (lib/award-hook.ts) —
// DIESELBE Quelle wie die Anschreiben-Vorschau. Einheiten ausschließlich über
// die kanonischen Formatierer (lib/atlas-format.ts), damit in der Meldung nie
// eine andere Zahl steht als auf der verlinkten Seite.

import { fmtPvLeistung, fmtWattProKopf } from "./atlas-format";
import type { AskVariante } from "./kommunen-ask";

export type DraftContext = {
  name: string;
  /**
   * KANONISCHE Adresse der Gemeindeseite — die steht in der Meldung, also in
   * dem Text, den die Gemeinde veröffentlicht.
   *
   * NIE eine Zähl-Weiterleitung (/r/…) an dieser Stelle: Eine Verwaltung
   * veröffentlicht keine kryptische Umleitung, sie kann jederzeit brechen, und
   * als Backlink ist sie schwächer als die echte Adresse — was genau das Ziel
   * des ganzen Vorhabens untergräbt.
   */
  pageUrl: string | null;
  /** Optionale Zähl-Weiterleitung NUR für den Brieftext („schauen Sie selbst"):
   *  misst, ob der Empfänger die Seite überhaupt geöffnet hat. Wird nie
   *  veröffentlicht. */
  vorschauUrl?: string | null;
  /** Betreff aus der Hook-Logik (Messgröße im Klartext, kein interner Titel). */
  betreff: string;
  /** Einstiegssatz aus der Hook-Logik. */
  einstieg: string;
  /** Welcher Ask? Steuert einzig den Widget-Absatz — alles andere ist identisch,
   *  damit die beiden Varianten vergleichbar bleiben. */
  variante: AskVariante;
  /**
   * Funktion der im Impressum benannten OPERATIVEN Stelle, falls vorhanden
   * („Referentin für Öffentlichkeitsarbeit"). Nur dann wird direkt adressiert.
   *
   * Gemessen am 27.07.2026: Von 21 kleinen Gemeinden nannte genau EINE jemand
   * anderen als den Bürgermeister. Die Person, die die Website pflegt, steht
   * dort schlicht nicht öffentlich — deshalb ist der Regelfall NICHT die
   * namentliche Anrede, sondern ein Text, der eine Weiterleitung übersteht.
   */
  funktion?: string | null;
  /**
   * Amtliche Gattung: „Stadt", „Markt", „Gemeinde". Eine Landeshauptstadt als
   * „Ihre Gemeinde" anzuschreiben wirkt ahnungslos.
   */
  gattung?: string | null;
  /** Zahlen für die Meldung — aus derselben Quelle wie die Atlas-Seite. */
  zahlen: {
    anlagen: number;
    leistungKwp: number;
    wpProKopf: number | null;
    /** Datenstand des Marktstammdatenregisters, ISO (YYYY-MM-DD). */
    stand: string;
  };
  /** Wo die Bestleistung gilt: „im Landkreis Würzburg", „in Bayern". */
  wo: string;
  /** Die Messgröße im Klartext: „die meiste private Speicherkapazität". */
  bestleistung: string;
  /** Platz und Gruppengröße für den Beleg. */
  rang?: { platz: number; von: number } | null;
};

export type OutreachDraft = { subject: string; body: string; meldung: string };

const SIGNATURE = `Sebastian Schäder
Betreiber solar-check.io
Impressum: https://solar-check.io/impressum · Datenschutz: https://solar-check.io/datenschutz`;

const dsgvoHinweis = (gattung: string) =>
  `Datenschutz-Hinweis (Art. 14 DSGVO): Ihre öffentlich verfügbaren Kontaktdaten (Website Ihrer ${gattung}) nutze ich einmalig für dieses Angebot. Herkunft, Zweck und Ihr Widerspruchsrecht: https://solar-check.io/datenschutz`;

/** „Kreisfreie Stadt", „Große Kreisstadt", „Markt" … auf das Wort reduzieren,
 *  das in einem Anschreiben natürlich klingt. */
export function gattungKurz(bezeichnung: string | null | undefined): string {
  if (!bezeichnung) return "Gemeinde";
  if (/stadt/i.test(bezeichnung)) return "Stadt";
  if (/markt/i.test(bezeichnung)) return "Markt";
  return "Gemeinde";
}

/** "2026-07-15" → "15. Juli 2026". */
function standLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * Die fertige Meldung — der eigentliche Ask.
 *
 * TON: berichtend, nicht lobend. „In X sind 412 Anlagen in Betrieb, der höchste
 * Wert im Landkreis" kann eine Pressestelle ohne Rückfrage übernehmen; „X ist
 * Spitzenreiter" muss sie erst prüfen und umschreiben. Jede Zahl trägt ihre
 * Quelle, damit die Meldung ohne uns nachprüfbar bleibt.
 */
export function renderMeldung(c: DraftContext): string {
  const { anlagen, leistungKwp, wpProKopf, stand } = c.zahlen;
  const rangSatz = c.rang ? ` — Platz ${c.rang.platz} von ${c.rang.von} Gemeinden` : "";
  const proKopfSatz = wpProKopf != null ? `, das entspricht ${fmtWattProKopf(wpProKopf)} je Einwohnerin und Einwohner` : "";

  // Der zweite Satz greift die Überschrift auf, wiederholt sie aber NICHT
  // wortgleich — vier Zeilen mit derselben Formulierung lesen sich wie ein
  // Textbaustein-Unfall, egal wie richtig sie sind.
  return `${c.name}: ${c.bestleistung} ${c.wo}

In ${c.name} sind ${anlagen.toLocaleString("de-DE")} Solaranlagen mit zusammen ${fmtPvLeistung(leistungKwp)} in Betrieb${proKopfSatz}. Das ist der höchste Wert ${c.wo}${rangSatz}.

Grundlage sind die Anlagendaten des Marktstammdatenregisters der Bundesnetzagentur (Stand: ${standLabel(stand)}). Eine laufend aktualisierte Übersicht für ${c.name} gibt es unter ${c.pageUrl ?? "solar-check.io"}.`;
}

export function renderOutreachDraft(c: DraftContext): OutreachDraft {
  const gattung = gattungKurz(c.gattung);
  const meldung = renderMeldung(c);

  // Wer die Website betreut, ist bei kleinen Gemeinden nicht ermittelbar (siehe
  // `funktion`). Deshalb steht die Bitte um Weiterleitung GANZ OBEN und nennt
  // die gesuchte Rolle: Das Rathaus verteilt Post ohnehin den ganzen Tag — die
  // Nachricht muss nur erkennen lassen, wohin sie gehört.
  const weiterleitung = c.funktion
    ? ""
    : `\n\nFalls Sie nicht selbst zuständig sind: Diese Nachricht richtet sich an die Kollegin oder den Kollegen, die Ihre Website und Öffentlichkeitsarbeit betreut. Ich wäre Ihnen für eine kurze Weiterleitung dankbar.`;

  // Der Widget-Absatz ist der EINZIGE Unterschied zwischen den Varianten —
  // sonst wäre nicht zu erkennen, ob eine Reaktion am Widget oder am Text lag.
  const widgetAbsatz =
    c.variante === "meldung_plus_widget"
      ? `\n\nWenn Sie die Zahlen dauerhaft auf Ihrer Website zeigen möchten, statt sie einmalig zu melden: Es gibt dieselbe Übersicht auch als einbettbares Widget — cookielos, ohne Anmeldung, monatlich automatisch aktuell, Farben und Schrift passe ich an Ihren Auftritt an. Sagen Sie einfach Bescheid, dann schicke ich den Einbettungscode und einen Vorschau-Link.`
      : "";

  // Der Aufhänger steht im BETREFF und in der Meldungs-Überschrift. Ein dritter
  // Einstiegssatz mit derselben Aussage las sich wie ein Textbaustein-Unfall
  // („Stuttgart hat die meiste …" dreimal in zehn Zeilen). Hier deshalb nur der
  // Anlass, die Aussage macht die Meldung.
  // Zähl-Weiterleitung nur im Brief, nie in der Meldung (siehe `pageUrl`).
  const vorschau = c.vorschauUrl ? `\n\nEinen kurzen Blick vorab können Sie hier werfen: ${c.vorschauUrl}` : "";

  const body = `Sehr geehrte Damen und Herren,${weiterleitung}

${weiterleitung ? "A" : "a"}us den amtlichen Anlagendaten des Marktstammdatenregisters ergibt sich für ${c.name} gerade eine Meldung, die Sie übernehmen können. Ich habe sie fertig formuliert:

────────────────────────────
${meldung}
────────────────────────────

Sie können den Text frei verwenden, kürzen und anpassen. Ich bitte nur darum, den Link auf solar-check.io stehen zu lassen — das ist der einzige Gegenwert, den ich dafür möchte. Kein Vertrieb, keine Kosten, keine Anmeldung.${vorschau}

Die Zahlen bereite ich monatlich aus dem amtlichen Marktstammdatenregister auf; die verlinkte Seite ist damit immer aktuell, auch wenn die Meldung älter wird.${widgetAbsatz}

Für Rückfragen oder andere Zuschnitte der Zahlen bin ich jederzeit erreichbar.

Mit freundlichen Grüßen
${SIGNATURE}

—
${dsgvoHinweis(gattung)}`;

  return { subject: c.betreff, body, meldung };
}
