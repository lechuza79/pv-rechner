// ─── Projekt-Statistik: was dieses Projekt gekostet hat ──────────────────────
//
// WARUM ES DAS GIBT (09.09.2026): Die Frage „wie lange arbeiten wir schon daran
// und was hat das an Rechenleistung gekostet" ließ sich nur noch für die letzten
// acht Wochen beantworten. Claude Code räumt die Gesprächsprotokolle nach
// dreißig Tagen weg; die erste Hälfte des Projekts (März bis Juli) ist
// unwiederbringlich weg, es gibt keine Sicherung, und die lokale Telemetrie
// führt keine Tokenzahlen. Was hier gebaut wird, hält die Zahlen ab jetzt fest,
// damit die Lücke nicht weiterwächst.
//
// ZWEI HERKÜNFTE, NIE VERMISCHT. Jede Tageszeile sagt, ob sie GEMESSEN ist
// (aus einem Protokoll gelesen) oder GESCHÄTZT (aus der Versionsgeschichte
// hochgerechnet). Eine Schätzung als Messung auszugeben ist im Projekt der
// schwerste Fehler — dieselbe Regel wie beim Prüfdatum der Förderprogramme, wo
// ein Ersatzwert 25 Programmen ein erfundenes Datum gab.
//
// DIE ZEIT IST EINE VEREINIGUNG, KEINE SUMME. An diesem Repo laufen regelmäßig
// bis zu elf Arbeitsstände gleichzeitig. Wer die Sitzungsdauern addiert,
// bekommt 662 Stunden für 48 Tage — knapp 14 Stunden am Tag, also die
// Parallelarbeit mehrfach gezählt. Zusammengelegt sind es 261 Stunden.

import { heuteInBerlin } from "./zeit";

/**
 * Der deutsche Kalendertag eines ZEITPUNKTS.
 *
 * Bewusst nicht `tagInBerlin(iso)`: Das schneidet einen String nur ab, weil ein
 * gemeinter Tag ("2026-08-01") nicht noch einmal verschoben werden darf. Ein
 * Protokoll-Zeitstempel meint dagegen einen Augenblick — und zwischen 22:00 und
 * Mitternacht deutscher Zeit steht in der Weltzeit noch der Vortag. Eine
 * Abendschicht läge dann auf dem falschen Tag.
 */
export const tagVon = (ms: number): string => heuteInBerlin(new Date(ms));

/** Ein zusammenhängender Arbeitsblock, in Millisekunden seit 1970. */
export interface Block {
  von: number;
  bis: number;
}

/** Woher eine Tageszeile stammt. */
export type Herkunft = "gemessen" | "geschaetzt";

/** Ein Tag Arbeit am Projekt. */
export interface Statistiktag {
  /** Kalendertag in deutscher Zeit (JJJJ-MM-TT). */
  tag: string;
  herkunft: Herkunft;
  /** Wiedergelesener Kontext — der billige, aber mit Abstand größte Anteil. */
  tokensGelesen: number;
  /** Frisch in den Zwischenspeicher geschriebener Kontext. */
  tokensNeu: number;
  tokensEingabe: number;
  /** Selbst geschriebener Text — die einzige Zahl, die einem Werk entspricht. */
  tokensAusgabe: number;
  sitzungen: number;
  /** Vom Menschen getippt (bis 800 Zeichen; Mittellänge 132). */
  nachrichtenGetippt: number;
  /** Längere Eingaben: Wächter-Aufträge, eingefügte Texte. */
  nachrichtenLang: number;
  antworten: number;
  werkzeugschritte: number;
  /** Zusammengelegte Arbeitszeit in Minuten (Lücken über 15 Min trennen). */
  arbeitsminuten: number;
  commits: number;
}

/** Der Bestand an einem Stichtag — wächst, statt sich je Tag zu ereignen. */
export interface Bestandstag {
  tag: string;
  dateien: number;
  codezeilen: number;
  dokuzeilen: number;
  testdateien: number;
  testfaelle: number;
  commitsGesamt: number;
}

export const STATISTIK_DDL = `
  create table if not exists projekt_statistik (
    tag date primary key,
    herkunft text not null,
    tokens_gelesen bigint not null,
    tokens_neu bigint not null,
    tokens_eingabe bigint not null,
    tokens_ausgabe bigint not null,
    sitzungen integer not null,
    nachrichten_getippt integer not null,
    nachrichten_lang integer not null,
    antworten integer not null,
    werkzeugschritte integer not null,
    arbeitsminuten integer not null,
    commits integer not null,
    erfasst_am timestamptz not null default now()
  );
  create table if not exists projekt_bestand (
    tag date primary key,
    dateien integer not null,
    codezeilen integer not null,
    dokuzeilen integer not null,
    testdateien integer not null,
    testfaelle integer not null,
    commits_gesamt integer not null,
    erfasst_am timestamptz not null default now()
  );
  alter table projekt_statistik enable row level security;
  alter table projekt_bestand enable row level security;
`;

/** Summe über einen Zeitraum, getrennt nach Herkunft. */
export interface Summe {
  tage: number;
  tokensGelesen: number;
  tokensNeu: number;
  tokensEingabe: number;
  tokensAusgabe: number;
  tokensGesamt: number;
  sitzungen: number;
  nachrichtenGetippt: number;
  nachrichtenLang: number;
  antworten: number;
  werkzeugschritte: number;
  arbeitsstunden: number;
  commits: number;
}

export function summiere(tage: Statistiktag[]): Summe {
  const s: Summe = {
    tage: tage.length, tokensGelesen: 0, tokensNeu: 0, tokensEingabe: 0,
    tokensAusgabe: 0, tokensGesamt: 0, sitzungen: 0, nachrichtenGetippt: 0,
    nachrichtenLang: 0, antworten: 0, werkzeugschritte: 0, arbeitsstunden: 0,
    commits: 0,
  };
  let minuten = 0;
  for (const t of tage) {
    s.tokensGelesen += t.tokensGelesen;
    s.tokensNeu += t.tokensNeu;
    s.tokensEingabe += t.tokensEingabe;
    s.tokensAusgabe += t.tokensAusgabe;
    s.sitzungen += t.sitzungen;
    s.nachrichtenGetippt += t.nachrichtenGetippt;
    s.nachrichtenLang += t.nachrichtenLang;
    s.antworten += t.antworten;
    s.werkzeugschritte += t.werkzeugschritte;
    minuten += t.arbeitsminuten;
    s.commits += t.commits;
  }
  s.tokensGesamt = s.tokensGelesen + s.tokensNeu + s.tokensEingabe + s.tokensAusgabe;
  s.arbeitsstunden = Math.round(minuten / 60);
  return s;
}

// ─── Rückrechnung für die Zeit ohne Protokolle ───────────────────────────────
//
// DIE REGEL STEHT HIER, DAMIT SIE PRÜFBAR IST: Für einen Tag ohne Protokoll wird
// aus den Commits dieses Tages hochgerechnet, und zwar mit dem Verhältnis, das
// im gemessenen Zeitraum tatsächlich galt. Kein anderer Bezug — Kalendertage
// scheiden aus, weil die frühen Wochen viel dünner besetzt waren (382 von 2.122
// Änderungen an 44 von 97 aktiven Tagen).
//
// SIE ÜBERSCHÄTZT EHER, und das gehört an die Zahl: Repo und Projektanleitung
// waren damals kleiner, jede Anfrage trug also weniger Kontext mit sich. Der
// wiedergelesene Anteil — mit Abstand der größte — ist deshalb zu hoch
// angesetzt.

/** Was ein Commit im gemessenen Zeitraum im Schnitt gekostet hat. */
export interface Kennwert {
  tokensGelesenJeCommit: number;
  tokensNeuJeCommit: number;
  tokensEingabeJeCommit: number;
  tokensAusgabeJeCommit: number;
  minutenJeCommit: number;
  nachrichtenJeCommit: number;
  antwortenJeCommit: number;
  werkzeugschritteJeCommit: number;
}

export function kennwertAus(gemessen: Statistiktag[]): Kennwert | null {
  const s = summiere(gemessen);
  if (s.commits <= 0) return null;
  const je = (x: number) => x / s.commits;
  return {
    tokensGelesenJeCommit: je(s.tokensGelesen),
    tokensNeuJeCommit: je(s.tokensNeu),
    tokensEingabeJeCommit: je(s.tokensEingabe),
    tokensAusgabeJeCommit: je(s.tokensAusgabe),
    minutenJeCommit: je(s.arbeitsstunden * 60),
    nachrichtenJeCommit: je(s.nachrichtenGetippt),
    antwortenJeCommit: je(s.antworten),
    werkzeugschritteJeCommit: je(s.werkzeugschritte),
  };
}

/** Einen protokolllosen Tag aus seinen Commits hochrechnen. */
export function schaetzeTag(tag: string, commits: number, k: Kennwert): Statistiktag {
  const r = (x: number) => Math.round(x * commits);
  return {
    tag,
    herkunft: "geschaetzt",
    tokensGelesen: r(k.tokensGelesenJeCommit),
    tokensNeu: r(k.tokensNeuJeCommit),
    tokensEingabe: r(k.tokensEingabeJeCommit),
    tokensAusgabe: r(k.tokensAusgabeJeCommit),
    // Sitzungen sind nicht ableitbar: Ein Tag mit zehn Commits kann eine
    // Sitzung gewesen sein oder fünf. Null ist hier ehrlicher als eine Zahl.
    sitzungen: 0,
    nachrichtenGetippt: r(k.nachrichtenJeCommit),
    nachrichtenLang: 0,
    antworten: r(k.antwortenJeCommit),
    werkzeugschritte: r(k.werkzeugschritteJeCommit),
    arbeitsminuten: r(k.minutenJeCommit),
    commits,
  };
}

/**
 * Überlappende Blöcke zusammenlegen.
 *
 * DAS IST DER GRUND, WARUM DIE ZEIT KEINE SUMME IST: An diesem Repo laufen
 * regelmäßig bis zu elf Arbeitsstände gleichzeitig. Wer die Sitzungsdauern
 * addiert, bekommt für dieselben 48 Tage 662 statt 261 Stunden — knapp 14
 * Stunden am Tag, also dieselbe Stunde bis zu fünfmal gezählt.
 */
export function vereinigeBloecke(bloecke: Block[]): Block[] {
  const sortiert = [...bloecke].sort((a, b) => a.von - b.von);
  const vereint: Block[] = [];
  for (const b of sortiert) {
    const letzter = vereint[vereint.length - 1];
    if (letzter && b.von <= letzter.bis) letzter.bis = Math.max(letzter.bis, b.bis);
    else vereint.push({ ...b });
  }
  return vereint;
}

/** Blöcke zusammenlegen und die Minuten auf die deutschen Kalendertage verteilen. */
export
function verteileZeit(bloecke: Block[], tage: Map<string, Statistiktag>): void {
  const vereint = vereinigeBloecke(bloecke);
  for (const b of vereint) {
    // Über Mitternacht laufende Blöcke tageweise aufteilen, sonst landet eine
    // Nachtschicht komplett auf dem Vortag. Die Tagesgrenze wird GESUCHT statt
    // gerechnet: Sie liegt je nach Sommer- oder Winterzeit eine oder zwei
    // Stunden vor Mitternacht Weltzeit, und ein fester Versatz trifft im
    // anderen Zeitregime den falschen Tag.
    let von = b.von;
    while (von < b.bis) {
      const tag = tagVon(von);
      const bis = tagVon(b.bis) === tag ? b.bis : grenzeNach(von, b.bis);
      const t = tage.get(tag);
      if (t) t.arbeitsminuten += Math.round((bis - von) / 60000);
      if (bis <= von) break;
      von = bis;
    }
  }
}

/** Erster Zeitpunkt in (von, bis], der schon zum nächsten deutschen Tag gehört. */
export function grenzeNach(von: number, bis: number): number {
  const tag = tagVon(von);
  let lo = von;
  let hi = bis;
  while (hi - lo > 1000) {
    const mitte = Math.floor((lo + hi) / 2);
    if (tagVon(mitte) === tag) lo = mitte;
    else hi = mitte;
  }
  return hi;
}
