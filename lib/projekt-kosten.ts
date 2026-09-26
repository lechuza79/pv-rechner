// ─── Was dieses Projekt an Geld gekostet hat ─────────────────────────────────
//
// Schwestermodul zu `projekt-statistik.ts`: Dort stehen Tokens, Arbeitszeit und
// Bestand, hier die Rechnungen. Beide beantworten zusammen die Frage, mit der
// dieses Projekt einmal erzählt werden soll — was es gekostet hat, an Zeit, an
// Rechenleistung und an Geld.
//
// WARUM ES DAS GIBT (23.09.2026): Die Kostenfrage war nur durch Nachsehen in den
// Buchungsunterlagen zu beantworten, und die Antwort veraltete am nächsten
// Ersten. Die Buchhaltung selbst ist maschinell lesbar (eine Zeile je Buchung,
// mit Gegenpartei und Zweck) — es fehlte allein die Ableitung.
//
// ZWEI GRÖSSEN, DIE NICHT DASSELBE SIND, und deren Verwechslung der teuerste
// Fehler dieses Moduls wäre:
//
//   • AUSGABE    — was wirklich abgebucht wurde. Steht in der Buchhaltung,
//                  lässt sich belegen, ist in Euro.
//   • LISTENWERT — was dieselbe Rechenleistung über die Schnittstelle gekostet
//                  hätte. Ist KEINE Ausgabe, sondern ein Vergleichsmaßstab, in
//                  Dollar, und hängt an Preisen, die sich ändern.
//
// Sie stehen deshalb in getrennten Tabellen mit getrennten Einheiten. Wer sie
// addiert, addiert Bezahltes und Nichtbezahltes.
//
// DER ANTEIL WIRD NICHT MITGESPEICHERT, SONDERN GERECHNET. Abgelegt wird der
// volle Monatsbetrag; welcher Teil davon auf Solar Check entfällt, entscheidet
// der Schlüssel unten. Wäre der fertige Teilbetrag abgelegt, ließe sich ein
// später korrigierter Schlüssel nicht mehr rückwirkend anwenden — und die alten
// Zeilen behaupteten weiter eine Genauigkeit, die es nie gab.

import { tokenPreisUsd, type Modellname } from "./modellpreise";

/** Wofür Geld ausgegeben wurde. */
export type Kostenart =
  | "rechenleistung" // Abos und Kontingente der Sprachmodelle
  | "betrieb"        // Auslieferung, Datenbank, Mailversand
  | "daten";         // zugekaufte Abfragen (Suchmaschinen-Rankings)

/**
 * Woher ein Aufteilungsschlüssel kommt.
 *
 * DIESELBE TRENNUNG WIE BEIM PRÜFDATUM DER FÖRDERPROGRAMME: Ein geschätzter
 * Schlüssel, der als gemessener durchgeht, macht aus einer Spanne eine
 * Tatsache. Er bleibt eine Schätzung, auch wenn die Zahl daneben plausibel
 * aussieht.
 */
export type Schluesselherkunft = "gemessen" | "geschaetzt" | "eindeutig";

/** Wie viel eines Postens auf dieses Projekt entfällt. */
export interface Anteil {
  /** 0 bis 1. */
  anteil: number;
  herkunft: Schluesselherkunft;
  /** Woran gemessen wurde — ausgeschrieben, nicht als Kürzel. */
  beleg: string;
  /** Tag der Messung (JJJJ-MM-TT). Ohne ihn ist ein Anteil nicht nachprüfbar. */
  gemessenAm: string;
}

/** Ein Anbieter, bei dem Geld ausgegeben wird. */
export interface Anbieter {
  /** Kurzschlüssel in der Ablage — stabil, taucht in keiner Oberfläche auf. */
  schluessel: string;
  /** Klartext. */
  name: string;
  art: Kostenart;
  /** Erkennt die Buchungen dieses Anbieters an Gegenpartei und Zweck. */
  muster: RegExp;
  anteil: Anteil;
}

// Die Reihenfolge ist die Prüfreihenfolge: Das Claude-Abo muss VOR den
// Kontingenten stehen, sonst fängt das allgemeinere Muster („anthropic") die
// Abo-Buchung ab — und dann steht ein Festbetrag in der Spalte, die den
// verbrauchsabhängigen Teil misst.
export const ANBIETER: Anbieter[] = [
  {
    schluessel: "claude-abo",
    name: "Claude-Abo",
    art: "rechenleistung",
    muster: /claude.?sub|claude subscription|max plan|claude pro|claude\.ai/i,
    anteil: {
      anteil: 0.77,
      herkunft: "gemessen",
      beleg:
        "Anteil dieses Projekts an der gesamten Rechenleistung aller Projekte, " +
        "ausgezählt über die noch vorhandenen Gesprächsprotokolle (rund vier Wochen): " +
        "52.050 von 67.652 US-Dollar Listenwert",
      gemessenAm: "2026-09-23",
    },
  },
  {
    schluessel: "claude-kontingente",
    name: "Claude, zusätzliche Kontingente",
    art: "rechenleistung",
    muster: /anthropic/i,
    anteil: {
      anteil: 0.77,
      herkunft: "gemessen",
      beleg: "derselbe Schlüssel wie beim Abo — dieselbe Rechenleistung, andere Abrechnung",
      gemessenAm: "2026-09-23",
    },
  },
  {
    schluessel: "openai",
    name: "OpenAI und Codex",
    art: "rechenleistung",
    muster: /openai|chatgpt/i,
    anteil: {
      anteil: 0.4,
      herkunft: "gemessen",
      beleg:
        "Anteil dieses Projekts an den Codex-Sitzungen, ausgezählt über deren " +
        "Arbeitsverzeichnisse: 1,06 von 2,63 Milliarden Tokens",
      gemessenAm: "2026-09-23",
    },
  },
  {
    schluessel: "vercel",
    name: "Auslieferung",
    art: "betrieb",
    muster: /vercel/i,
    anteil: {
      anteil: 0.4,
      herkunft: "gemessen",
      beleg:
        "im Abrechnungs-Dashboard nach Projekt gefiltert gemessen: 67 von 157 US-Dollar " +
        "im Zeitraum Juli 2026, davon 37 US-Dollar Bauzeit. SEITDEM GESUNKEN — die " +
        "Bauzeit wurde am selben Tag um eine Maschinenstufe gedrosselt, und der größte " +
        "Posten der August-Rechnung (Cache-Schreibvorgänge) stammt nachweislich aus dem " +
        "Schwesterprojekt. Der Schlüssel ist die schwächste Zahl dieser Aufstellung",
      gemessenAm: "2026-08-26",
    },
  },
  {
    schluessel: "datenbank",
    name: "Datenbank",
    art: "betrieb",
    muster: /supabase/i,
    anteil: {
      anteil: 0.08,
      herkunft: "gemessen",
      beleg:
        "die Rechnung weist die Betriebsstunden je Datenbank einzeln aus: " +
        "3,41 von 43,77 US-Dollar im Juli 2026",
      gemessenAm: "2026-09-23",
    },
  },
  {
    schluessel: "mailversand",
    name: "Mailversand",
    art: "betrieb",
    muster: /resend/i,
    anteil: {
      anteil: 0.5,
      herkunft: "geschaetzt",
      beleg:
        "beide Projekte versenden darüber, die Rechnung ist ein Festpreis ohne " +
        "Mengenausweis — hälftig geteilt, weil es keinen messbaren Schlüssel gibt",
      gemessenAm: "2026-09-23",
    },
  },
  {
    schluessel: "domain",
    name: "Domains und Webhosting",
    art: "betrieb",
    muster: /all-?inkl|münnich|munnich/i,
    anteil: {
      anteil: 0.54,
      herkunft: "gemessen",
      beleg:
        "der Registrar zieht mehrere Rechnungen in EINER Lastschrift ein; aus den " +
        "Einzelrechnungen ausgezählt entfallen 79,80 von 147,60 Euro auf die Domain " +
        "solar-check.io, der Rest auf ein Webhosting-Paket für fremde Domains",
      gemessenAm: "2026-09-23",
    },
  },
  {
    schluessel: "seo-abfragen",
    name: "Suchmaschinen-Abfragen",
    art: "daten",
    muster: /dataforseo/i,
    anteil: {
      anteil: 1,
      herkunft: "eindeutig",
      beleg: "wird ausschließlich vom Sichtbarkeits-Wächter dieses Projekts abgerufen",
      gemessenAm: "2026-09-23",
    },
  },
  {
    schluessel: "quellcode-verwaltung",
    name: "Quellcode-Verwaltung",
    art: "betrieb",
    muster: /github/i,
    anteil: {
      anteil: 0.5,
      herkunft: "geschaetzt",
      beleg: "ein Konto für alle Projekte, kein Mengenausweis je Projekt",
      gemessenAm: "2026-09-23",
    },
  },
];

/**
 * BEWUSST NICHT AUFGENOMMEN, damit eine spätere Sitzung sie nicht für vergessen
 * hält: ein Wurzelserver-Anbieter (dieses Projekt läuft vollständig bei einem
 * anderen Betreiber, die Buchungen gehören dem Schwesterprojekt), die
 * Gebühr eines App-Marktplatzes, Mobilfunk, Festnetz und Musikdienste. Die
 * Grenze verläuft nicht bei „geschäftlich", sondern bei „ohne dieses Projekt
 * gäbe es die Ausgabe genauso".
 *
 * Arbeitsplatz-Werkzeuge (Schreibtisch, Rechner, Zeichenprogramm) stehen aus
 * demselben Grund nicht darin — sie wären ohne dieses Projekt ebenso da. Sie
 * hier anteilig einzurechnen würde die Zahl größer und schlechter machen.
 */

/** Den Anbieter zu einer Buchung finden — oder nichts, wenn sie nicht hierher gehört. */
export function anbieterFuer(gegenpartei: string, zweck: string): Anbieter | null {
  const text = `${gegenpartei} ${zweck}`;
  for (const a of ANBIETER) if (a.muster.test(text)) return a;
  return null;
}

/** Eine Monatssumme je Anbieter, wie sie abgelegt wird. */
export interface Kostenmonat {
  /** Kalendermonat (JJJJ-MM). */
  monat: string;
  /** Kurzschlüssel aus `ANBIETER`. */
  anbieter: string;
  /**
   * Was in diesem Monat wirklich abgebucht wurde, in Euro, brutto.
   *
   * BRUTTO IST ABSICHT: Das ist der Betrag, der vom Konto ging. Die Vorsteuer
   * holt der Betreiber sich zurück, aber das ist eine Aussage über seine
   * Steuererklärung, nicht über die Kosten des Projekts — und ein Teil der
   * Rechnungen läuft im Reverse-Charge-Verfahren ganz ohne deutsche Steuer.
   * Wer netto rechnen will, braucht je Rechnung den Steuersatz, nicht eine
   * pauschale Quote.
   */
  betragEur: number;
  /** Erstattungen sind negative Ausgaben und werden verrechnet, nicht ausgelassen. */
  buchungen: number;
}

export const KOSTEN_DDL = `
  create table if not exists projekt_kosten (
    monat text not null,
    anbieter text not null,
    betrag_eur numeric not null,
    buchungen integer not null,
    erfasst_am timestamptz not null default now(),
    primary key (anbieter, monat)
  );
  alter table projekt_kosten enable row level security;

  create table if not exists projekt_listenwert (
    tag date not null,
    modell text not null,
    tokens_gelesen bigint not null,
    tokens_schreiben_kurz bigint not null,
    tokens_schreiben_lang bigint not null,
    tokens_eingabe bigint not null,
    tokens_ausgabe bigint not null,
    listenwert_usd numeric not null,
    erfasst_am timestamptz not null default now(),
    primary key (tag, modell)
  );
  alter table projekt_listenwert enable row level security;
`;

/** Was auf dieses Projekt entfällt — gerechnet, nie abgelegt. */
export function anteilBetrag(m: Kostenmonat): number {
  const a = ANBIETER.find((x) => x.schluessel === m.anbieter);
  return a ? m.betragEur * a.anteil.anteil : 0;
}

export interface Kostensumme {
  /** Alle Projekte zusammen. */
  gesamtEur: number;
  /** Nur dieses Projekt, nach Schlüssel. */
  solarCheckEur: number;
  /** Je Kostenart, nur dieses Projekt. */
  jeArt: Record<Kostenart, number>;
  monate: number;
}

export function summiereKosten(zeilen: Kostenmonat[]): Kostensumme {
  const s: Kostensumme = {
    gesamtEur: 0,
    solarCheckEur: 0,
    jeArt: { rechenleistung: 0, betrieb: 0, daten: 0 },
    monate: new Set(zeilen.map((z) => z.monat)).size,
  };
  for (const z of zeilen) {
    const a = ANBIETER.find((x) => x.schluessel === z.anbieter);
    if (!a) continue;
    s.gesamtEur += z.betragEur;
    const anteil = z.betragEur * a.anteil.anteil;
    s.solarCheckEur += anteil;
    s.jeArt[a.art] += anteil;
  }
  return s;
}

// ─── Der Listenwert: was die Rechenleistung gekostet hätte ───────────────────
//
// ER MUSS TÄGLICH FESTGEHALTEN WERDEN, weil er sich sonst nicht mehr rechnen
// lässt: Die Gesprächsprotokolle, aus denen er entsteht, werden nach dreißig
// Tagen gelöscht. Genau daran ist die erste Projekthälfte schon verloren
// gegangen. Anders als bei den Tokens genügt die Gesamtsumme hier NICHT — der
// Eingabepreis unterscheidet sich zwischen den Modellen um das Doppelte, und
// eine Summe ohne Modell lässt sich nachträglich keinem Preis mehr zuordnen.

/** Tokens eines Tages auf EINEM Modell, aufgeschlüsselt nach Abrechnungsart. */
export interface Listenwerttag {
  tag: string;
  modell: string;
  /** Wiedergelesener Zwischenspeicher — der größte und billigste Posten. */
  tokensGelesen: number;
  /** Frisch zwischengespeichert, kurze Haltbarkeit (teurer als Eingabe). */
  tokensSchreibenKurz: number;
  /** Frisch zwischengespeichert, lange Haltbarkeit (am teuersten). */
  tokensSchreibenLang: number;
  tokensEingabe: number;
  tokensAusgabe: number;
}

/**
 * Was dieser Tag über die Schnittstelle gekostet hätte, in US-Dollar.
 *
 * Unbekannte Modelle ergeben null, nicht einen geratenen Preis: Lieber eine
 * Lücke, die auffällt, als eine Zahl, die niemand nachrechnen kann.
 */
export function listenwertUsd(t: Listenwerttag): number | null {
  const p = tokenPreisUsd(t.modell as Modellname);
  if (!p) return null;
  return (
    (t.tokensGelesen * p.gelesen +
      t.tokensSchreibenKurz * p.schreibenKurz +
      t.tokensSchreibenLang * p.schreibenLang +
      t.tokensEingabe * p.eingabe +
      t.tokensAusgabe * p.ausgabe) /
    1_000_000
  );
}

export function summiereListenwert(tage: Listenwerttag[]): number {
  let s = 0;
  for (const t of tage) s += listenwertUsd(t) ?? 0;
  return s;
}

// ─── Hilfen beim Einlesen der Buchungsübersichten ────────────────────────────
//
// SIE STEHEN HIER UND NICHT IM ERFASSUNGSLAUF, damit eine Prüfung sie benutzen
// kann, ohne das Skript zu laden: Ein Skript, das ein Test importiert, führt
// beim Laden seinen ganzen Ablauf aus. Genau das hat den Prüflauf umgeworfen —
// lokal unsichtbar, weil dort die Buchungsunterlagen liegen und der Lauf
// anstandslos durchläuft.

/** Spaltenbuchstaben („A", „AB") in einen Index ab null. */
export function spalteAus(buchstaben: string | undefined): number | null {
  if (!buchstaben) return null;
  let n = 0;
  for (const c of buchstaben) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

/**
 * Ist das eine Buchungsübersicht?
 *
 * DER NAME WIRD NORMALISIERT, BEVOR ER VERGLICHEN WIRD — BLOCKER auf dieser
 * Plattform. macOS legt Dateinamen in ZERLEGTER Form ab: Das „Ü" in „Übersicht"
 * ist dort ein U plus ein Trema-Zeichen, im Quelltext dagegen ein einzelnes
 * Zeichen. Beide sehen im Terminal identisch aus, und der Vergleich schlägt
 * trotzdem fehl. Beim Bauen genau so passiert: Der Lauf meldete „0 Buchungen
 * gelesen" und sah aus, als gäbe es die Dateien nicht.
 *
 * Die Sperre für „~$…" gilt den Sicherungskopien, die ein Tabellenprogramm
 * neben einer geöffneten Datei anlegt.
 */
export function istUebersicht(dateiname: string): boolean {
  const n = dateiname.normalize("NFC");
  return /^Übersicht.*\.(csv|xlsx)$/i.test(n) && !n.startsWith("~$");
}
