// Kommunen-Solar-Award: Sieger je Kategorie × Vergleichsgruppe × geografischem
// Bezug. Reine Rechenfunktionen — kein DB-/Next-Import, damit Backend-Ansicht,
// Atlas-Seite und (später) das Badge dieselbe Rangliste benutzen. Es darf keine
// zweite geben.
//
// Das Modell ist an echten Daten verifiziert (2026-07-25):
//  - Pro Kopf NUR bei Haushalts-Kategorien (privates Dach, Balkon, private
//    Batterie). Bei Großanlagen (Freifläche, Wind, Biomasse, Wasser) ist „pro
//    Kopf" nachweislich absurd (Büttel: 24 Ew, 100 MWp Park → 4,2 Mio Wp/Kopf) —
//    deshalb gibt es dort schlicht keine Pro-Kopf-Kategorie, nur absolut.
//  - Rollen-Achse (kreisfrei/Hauptstadt) fängt die Städte, Größen-Drittel die
//    Dörfer. Größengrenzen kommen aus der Verteilung (Terzile), nicht gesetzt.
//
// Ausnahme vom „kein Import": die kanonischen Einheiten-Formatter (rein, ohne
// DB/Next) — Einheiten werden nie handgeschrieben (Zahlen-Korrektheit-BLOCKER).

import { fmtPvLeistung, fmtSpeicherKwh, fmtWattProKopf } from "./atlas-format";

export type AwardScopeLevel = "de" | "bundesland" | "landkreis";
export type Traeger = "buerger" | "gewerbe";
/**
 * "quote" ist ein Verhaeltnis zweier eigener Zahlen (Batterien je 100 Daecher),
 * nicht je Einwohner und nicht absolut. Eigene Messart, weil beides anders
 * beschriftet wird und die Untergrenze eine andere Begruendung braucht.
 */
export type Messart = "proKopf" | "absolut" | "quote";
export type SizeBand = "klein" | "mittel" | "gross";
export type Role = "gemeinde" | "stadt" | "grosse-kreisstadt" | "kreisfrei" | "hauptstadt";

/** Wie die Zahl angezeigt wird — die Einheit schreibt die Anzeige über den
 *  kanonischen Formatter, nie das Modul (lib/atlas-format.ts). */
export type MetricFormat =
  | "wattProKopf"
  | "pvLeistung"
  | "count"
  | "countPer1000"
  | "whProKopf"
  | "speicherKwh"
  | "je100Dach";

/** Solar-/Speicher-/EE-Kennzahlen einer bewohnten Gemeinde, je Träger getrennt.
 *  Kommt aus dem Rollup `mastr_gemeinde_award` (ein DB-seitiger Lauf), Name +
 *  Bezeichnung aus `mastr_regions`. */
export type GemeindeStats = {
  regionId: string; // 8-stelliger AGS
  name: string;
  bezeichnung: string; // amtliche Bezeichnung → Rolle
  /** Letztes Pfadstück der Atlas-Seite. Damit lässt sich jede Ranglisten-Zeile
   *  verlinken, ohne je Zeile eine Abfrage zu fahren. */
  slug?: string | null;
  population: number;
  privatDachKwp: number;
  /** Zahl der privaten Dachanlagen — fuer die Groessenpruefung. */
  privatDachCount?: number;
  gewerbeDachKwp: number;
  freiflaecheKwp: number;
  balkonCount: number;
  balkonKwp: number;
  batteriePrivatKwh: number;
  /** Zahl der privaten Batterien — fuer die Groessenpruefung. */
  batteriePrivatCount?: number;
  batterieGewerbeKwh: number;
  windKwp: number;
  biomasseKwp: number;
  wasserKwp: number;
  solarZubauKwp: number;
  /** Bestaende zu Stichtagen (siehe lib/mastr-award-sql.ts). Optional, weil
   *  aeltere Aufrufer sie nicht setzen — wer sie braucht, prueft auf undefined. */
  solarKwp?: number;
  solarKwpLy?: number;
  solarKwpL3?: number;
  solarKwpL5?: number;
  privatDachKwpLy?: number;
  privatDachKwpL3?: number;
  privatDachKwpL5?: number;
  balkonCountLy?: number;
  batteriePrivatKwhLy?: number;
  freiflaecheKwpLy?: number;
  windKwpLy?: number;
};

// ─── Kategorien ────────────────────────────────────────────────────────────────

export type AwardCategory = {
  key: string;
  /**
   * Adresse der Ranking-Seite (`/solar-atlas/ranking/<slug>`). Nur Kategorien
   * mit Slug bekommen eine Seite.
   *
   * OHNE SEITE bleiben die absoluten BUERGER-Kategorien (Balkon-, Solardach-,
   * Speicher-"Hauptstadt"): Ihr Sieger ist gemessen an mastr_gemeinde_award
   * schlicht die einwohnerstaerkste Kommune — in BW, BY und NRW jeweils exakt,
   * und 6 bis 10 der ersten Zehn sind die zehn einwohnerstaerksten Orte. Eine
   * Rangliste daraus waere eine Einwohner-Rangliste mit anderem Titel.
   *
   * Fuer die STANDORT-Kategorien gilt das NICHT — dieselbe Messung ergab bei
   * Freiflaeche und Wind 0 von 10 Ueberschneidung mit den einwohnerstaerksten
   * Gemeinden, und der Sieger ist nie die groesste. Dort gewinnen Doerfer mit
   * einem Solarpark oder Windraedern; das ist eine echte Aussage.
   */
  slug?: string;
  /** Interner Kurzname (Backend-Ansichten). NICHT nach außen verwenden — siehe
   *  `bestleistung`/`thema`. */
  label: string;
  merit: string;
  /**
   * Klartext für die Außenkommunikation, als Nominalphrase: „die meisten
   * Balkonkraftwerke je 1.000 Einwohner".
   *
   * WARUM ES DAS GIBT (27.07.2026): Im Anschreiben stand vorher der interne
   * Titel — „Erlenbach a.Main ist Speicher-Hauptstadt im Landkreis Miltenberg".
   * Der sagt nicht, was gemessen wurde, klingt bei 9.717 Einwohnern nach
   * Marketing-Erfindung, und die Auszeichnung existiert öffentlich nirgends.
   * Eine Verwaltung liest so etwas als Werbung. Die nackte Messgröße ist
   * belegbar und wirkt stärker als jedes Kunstwort.
   */
  bestleistung: string;
  /** Dasselbe ohne Superlativ, für Platzierungen unterhalb von Platz 1:
   *  „Balkonkraftwerke je 1.000 Einwohner". */
  thema: string;
  /**
   * Dieselbe Messgröße im DATIV, für den Betreff („… bei Balkonkraftwerken je
   * 1.000 Einwohner"). Von Hand gepflegt statt aus `thema` abgeleitet: Deutsche
   * Kasusbildung per Regel produziert zuverlässig Murks („bei private
   * Solarleistung"), und ein Betreff ist das Erste, was ein Rathaus liest.
   */
  themaDativ: string;
  /**
   * KURZFORM FUER DEN BETREFF, als vollstaendige Praepositionalphrase:
   * "bei Balkonkraftwerken", "beim Solar-Zubau in drei Jahren".
   *
   * MIT der Praeposition, nicht nur das Substantiv: "bei" und "beim" haengen am
   * Wort dahinter, und deutsche Kasusbildung per Regel produziert zuverlaessig
   * Murks (dieselbe Begruendung wie bei `themaDativ`). Wer nur das Substantiv
   * speichert, baut sich die Falle wieder ein.
   *
   * WARUM KURZ: Der Betreff hatte 123 Zeichen ("… auf Platz 3 von 34 unter den
   * Kleinen Gemeinden im Landkreis Musterkreis bei Balkonkraftwerken je 1.000
   * Einwohner") — in jedem Postfach abgeschnitten. Die Einzelheiten (Klasse,
   * Gruppengroesse, Wert) stehen im Einstiegssatz, wo Platz dafuer ist.
   */
  betreffPhrase?: string;
  traeger: Traeger;
  messart: Messart;
  format: MetricFormat;
  metric: (g: GemeindeStats) => number | null;
  /** Dieselbe Messgroesse zum Stand Ende des letzten vollen Jahres. Nur wo ein
   *  Stichtagswert vorliegt — daraus faellt die Rangveraenderung. */
  metricVorjahr?: (g: GemeindeStats) => number | null;
  /**
   * Sieht die Anlage ueberhaupt nach dem aus, was die Kategorie behauptet?
   *
   * WARUM DAS NOETIG IST: "privat" kommt im Register aus einem angekreuzten Feld
   * (Nutzungsbereich = Haushalt), OHNE Groessenpruefung. Ein Landwirt mit
   * 300-kWp-Scheunendach, der "Haushalt" ankreuzt, zaehlte als Privatdach.
   * Dolgesheim fuehrte damit die Pro-Kopf-Liste an: 88 Anlagen mit im Schnitt
   * 107 kWp, waehrend die uebliche private Dachanlage bei 9,8 kWp liegt (Median
   * ueber alle 10.725 Gemeinden, 99 % unter 17,8).
   *
   * Das ersetzt die frueher pauschale Einwohner-Untergrenze von 2.000, die 5.627
   * Gemeinden ausschloss, um ein paar falsch etikettierte Anlagen zu neutralisieren.
   */
  plausibel?: (g: GemeindeStats) => boolean;
  /** Satz fuer die ausgeschlossenen Orte. Ohne ihn steht der Standardsatz zur
   *  Groessenpruefung — der passt nur dort, wo `plausibel` die Anlagengroesse
   *  prueft, nicht bei einer Mindest-Stueckzahl. */
  plausibelGrund?: string;
  /**
   * Die absolute Menge hinter einer Pro-Kopf-Zahl, fertig formuliert
   * ("1 Balkonkraftwerk", "36 Dachanlagen") — null, wo es nichts zu zaehlen gibt.
   *
   * WARUM: Eine Rate ohne ihre Grundmenge kann jede Groesse vortaeuschen.
   * Wiedenborstel hat 10 Einwohner und EIN Balkonkraftwerk und stand damit auf
   * Platz 4 der Bundesliste — mit "100,0 je 1.000 Einwohner", was nach sehr viel
   * aussieht. Die Zahl ist richtig, die Wirkung falsch. Statt kleine Orte
   * auszuschliessen (dieselbe Diskussion wie bei der Einwohner-Untergrenze)
   * steht die Stueckzahl daneben, dann rechnet niemand mehr falsch.
   * CLAUDE.md, "Zahlen und Einheiten", Punkt 3.
   */
  basis?: (g: GemeindeStats) => string | null;
};

/** Die zugebaute Leistung hinter einer Tempo-Zahl. Einheit aus dem kanonischen
 *  Formatter, nie handgeschrieben. */
const zubauBasis = (kwp: number): string | null => (kwp > 0 ? `${fmtPvLeistung(kwp)} dazugebaut` : null);

/** "1 Anlage" / "7 Anlagen" — Singular und Plural sind Teil der Richtigkeit. */
const stueck = (anzahl: number | undefined, einzahl: string, mehrzahl: string): string | null => {
  if (!anzahl || anzahl <= 0) return null;
  return `${anzahl.toLocaleString("de-DE")} ${anzahl === 1 ? einzahl : mehrzahl}`;
};

const perCapita = (val: number, pop: number): number | null => (pop > 0 ? (val * 1000) / pop : null);
const pos = (n: number): number | null => (n > 0 ? n : null);

/** Mittlere Groesse einer Anlage. Ohne Anzahl keine Aussage → 0 (unauffaellig). */
const mittlereGroesse = (summe: number, anzahl?: number): number => (anzahl && anzahl > 0 ? summe / anzahl : 0);

/**
 * Bis hierher kann ein Dach an einem Wohnhaus haengen. Gemessen ueber alle
 * 10.725 Gemeinden: Median 9,8 kWp, 99. Perzentil 17,8 — 30 laesst also jedem
 * grossen Eigenheim Luft und faengt trotzdem die Gewerbehallen. Betroffen sind
 * 17 Gemeinden.
 */
const MAX_PRIVATDACH_KWP = 30;
/** Hausspeicher liegen bei rund 10 kWh; darueber ist es Gewerbe. */
const MAX_HAUSSPEICHER_KWH = 30;

/**
 * Batterien je 100 private Dachanlagen — der einzige gemessen groessenneutrale
 * Buerger-Wert: Median je Groessenklasse 64 · 63 · 66 · 72 · 79 (Faktor 1,2 vom
 * Weiler zur Grossstadt, gegenueber Faktor 4 bei "je Einwohner" und Faktor 8 bei
 * "je km²"). Er misst ein Verhalten, nicht eine Ortsgroesse.
 *
 * ER GEHT UEBER 100, und das ist kein Fehler: Speicher werden nachgeruestet und
 * auch an Anlagen gemeldet, die nicht als privates Dach gezaehlt werden.
 * Osterwald kommt so auf 113 Batterien bei 71 Dachanlagen. Deshalb NIE als
 * Prozentzahl anzeigen (siehe formatAwardValue, "je100Dach").
 */
const speicherQuote = (g: GemeindeStats): number | null => {
  const daecher = g.privatDachCount ?? 0;
  if (daecher <= 0) return null;
  return ((g.batteriePrivatCount ?? 0) / daecher) * 100;
};

/**
 * Ab so vielen Dachanlagen traegt die Quote — HERGELEITET, nicht gesetzt.
 *
 * Gemessen am 30.07.2026, Streuung der Quote (5. bis 95. Perzentil) nach Zahl
 * der Dachanlagen im Ort:
 *   1–4 Anlagen: 200 Punkte breit, 21 % der Orte ueber 100
 *   5–9:         100 Punkte, 9 %
 *   10–24:        74 Punkte, 7 %
 *   25–49:        55 Punkte, 2 %
 *   50–99:        45 Punkte, 1 %
 *   100+:         44 bzw. 39 Punkte, 0 %
 * Der Median liegt ab 5 Anlagen stabil bei 63–67; was zusammenbricht, ist die
 * Streuung. Der grosse Sprung ist bis 25 passiert (200 → 55); danach flacht die
 * Kurve ab. 50 waere sauberer, wuerde aber 73 % der Kleingemeinden aussperren
 * (bei 25 bleiben 63 % drin, alle anderen Klassen bleiben vollstaendig).
 */
const MIN_DACH_FUER_QUOTE = 25;

/**
 * Der Zubau-Zeitraum, EHRLICH benannt.
 *
 * WAS GEMESSEN WIRD: heutiger Bestand minus Bestand am Ende eines Stichjahres.
 * "letztes Jahr" hiess damit in Wahrheit "seit Ende 2025" — heute also Januar
 * bis heute, sieben Monate. Am 1. Januar waeren es null Tage und die Liste
 * kroente einen zufaelligen Ort.
 *
 * WARUM NICHT DIE RECHNUNG AENDERN: Ein echtes volles Jahr braeuchte den
 * Bestand zum Ende des VORLETZTEN Jahres; den fuehrt die Aggregation nicht.
 * Die Zahl ist richtig — nur ihr Name war es nicht. Dieselbe Ehrlichkeit wie
 * bei der Rangveraenderung, die aus demselben Grund "seit Ende <Jahr>" heisst
 * und nicht "gegenueber dem Vorjahr".
 *
 * KEINE JAHRESZAHL IM CODE: Das Stichjahr wird zur Laufzeit gebildet, sonst
 * wird die Beschriftung am 1. Januar still falsch.
 */
const seitEnde = (jahreZurueck: number): number => new Date().getFullYear() - jahreZurueck;

export const AWARD_CATEGORIES: AwardCategory[] = [
  // Bürger, pro Kopf — verifiziert aussagekräftig (skaliert mit Haushalten).
  {
    key: "dach-privat-pk",
    betreffPhrase: "bei privater Solarleistung",
    slug: "solarleistung-je-einwohner",
    label: "Solardach-Spitzenreiter",
    merit: "Meiste private Dach-Solarleistung je Einwohner.",
    bestleistung: "die meiste private Solarleistung auf den Dächern je Einwohner",
    thema: "private Solarleistung auf den Dächern je Einwohner",
    themaDativ: "Solarleistung auf privaten Dächern je Einwohner",
    traeger: "buerger",
    messart: "proKopf",
    format: "wattProKopf",
    metric: (g) => perCapita(g.privatDachKwp, g.population),
    basis: (g) => stueck(g.privatDachCount, "private Dachanlage", "private Dachanlagen"),
    plausibel: (g) => mittlereGroesse(g.privatDachKwp, g.privatDachCount) <= MAX_PRIVATDACH_KWP,
    metricVorjahr: (g) => perCapita(g.privatDachKwpLy ?? 0, g.population),
  },
  {
    key: "balkon-pk",
    betreffPhrase: "bei Balkonkraftwerken",
    slug: "balkonkraftwerke-je-einwohner",
    label: "Balkon-Pionier",
    merit: "Meiste Balkonkraftwerke je 1.000 Einwohner — die sauberste Bürgerzahl.",
    bestleistung: "die meisten Balkonkraftwerke je 1.000 Einwohner",
    thema: "Balkonkraftwerke je 1.000 Einwohner",
    themaDativ: "Balkonkraftwerken je 1.000 Einwohner",
    traeger: "buerger",
    messart: "proKopf",
    format: "countPer1000",
    metric: (g) => perCapita(g.balkonCount, g.population),
    basis: (g) => stueck(g.balkonCount, "Balkonkraftwerk", "Balkonkraftwerke"),
    metricVorjahr: (g) => perCapita(g.balkonCountLy ?? 0, g.population),
  },
  {
    key: "speicherquote",
    betreffPhrase: "bei Speichern je Dach",
    slug: "speicher-je-dachanlage",
    label: "Speicher-Quote",
    merit: "Meiste Batteriespeicher je 100 private Dachanlagen.",
    bestleistung: "die meisten Batteriespeicher je 100 privaten Dachanlagen",
    thema: "Batteriespeicher je 100 private Dachanlagen",
    themaDativ: "Batteriespeichern je 100 privaten Dachanlagen",
    traeger: "buerger",
    messart: "quote",
    format: "je100Dach",
    metric: (g) => speicherQuote(g),
    // Kein Stichtagswert: Die Award-Tabelle fuehrt privat_dach_count und
    // batterie_privat_count nur zum HEUTIGEN Stand, nicht zum Jahresende. Ohne
    // beide Zaehler zum selben Stichtag gaebe es keine ehrliche Rangveraenderung.
    plausibel: (g) => (g.privatDachCount ?? 0) >= MIN_DACH_FUER_QUOTE,
    plausibelGrund: `Dort stehen unter ${MIN_DACH_FUER_QUOTE} private Dachanlagen — darunter ist die Quote ein Zufallswert.`,
    basis: (g) => stueck(g.privatDachCount, "private Dachanlage", "private Dachanlagen"),
  },
  {
    key: "batterie-privat-pk",
    betreffPhrase: "bei Hausspeichern",
    slug: "speicherkapazitaet-je-einwohner",
    label: "Speicher-Vorreiter",
    merit: "Meiste private Batteriekapazität je Einwohner.",
    bestleistung: "die meiste private Speicherkapazität je Einwohner",
    thema: "private Speicherkapazität je Einwohner",
    themaDativ: "privater Speicherkapazität je Einwohner",
    traeger: "buerger",
    messart: "proKopf",
    format: "whProKopf",
    metric: (g) => perCapita(g.batteriePrivatKwh, g.population),
    basis: (g) => stueck(g.batteriePrivatCount, "Hausspeicher", "Hausspeicher"),
    // Finsing: eine Gewerbe-Batterie als privat gemeldet, seit jeher als
    // Einzelfall im Code gefuehrt. Die Groessenpruefung faengt die ganze Klasse.
    plausibel: (g) => mittlereGroesse(g.batteriePrivatKwh, g.batteriePrivatCount) <= MAX_HAUSSPEICHER_KWH,
    metricVorjahr: (g) => perCapita(g.batteriePrivatKwhLy ?? 0, g.population),
  },
  // Zubau-Tempo je Einwohner ueber mehrere Zeitraeume. Absolut waere es wieder
  // eine Einwohner-Rangliste; RELATIV ("+300 %") gewinnt, wer bei fast null
  // angefangen hat. Je Einwohner zugebaute Leistung ist beides nicht.
  {
    key: "tempo-1j",
    betreffPhrase: `beim Solar-Zubau seit Ende ${seitEnde(1)}`,
    slug: "zubau-1-jahr-je-einwohner",
    label: "Tempo 1 Jahr",
    merit: `Meiste je Einwohner zugebaute Solarleistung seit Ende ${seitEnde(1)}.`,
    bestleistung: `den größten Zubau auf privaten Dächern je Einwohner seit Ende ${seitEnde(1)}`,
    thema: `Zubau auf privaten Dächern je Einwohner seit Ende ${seitEnde(1)}`,
    themaDativ: `Solar-Zubau je Einwohner seit Ende ${seitEnde(1)}`,
    traeger: "buerger",
    messart: "proKopf",
    format: "wattProKopf",
    metric: (g) => perCapita(Math.max(0, g.privatDachKwp - (g.privatDachKwpLy ?? 0)), g.population),
    basis: (g) => zubauBasis(g.privatDachKwp - (g.privatDachKwpLy ?? 0)),
  },
  {
    key: "tempo-3j",
    betreffPhrase: `beim Solar-Zubau seit Ende ${seitEnde(3)}`,
    slug: "zubau-3-jahre-je-einwohner",
    label: "Tempo 3 Jahre",
    merit: `Meiste je Einwohner zugebaute Solarleistung seit Ende ${seitEnde(3)}.`,
    bestleistung: `den größten Zubau auf privaten Dächern je Einwohner seit Ende ${seitEnde(3)}`,
    thema: `Zubau auf privaten Dächern je Einwohner seit Ende ${seitEnde(3)}`,
    themaDativ: `Solar-Zubau je Einwohner seit Ende ${seitEnde(3)}`,
    traeger: "buerger",
    messart: "proKopf",
    format: "wattProKopf",
    metric: (g) => perCapita(Math.max(0, g.privatDachKwp - (g.privatDachKwpL3 ?? 0)), g.population),
    basis: (g) => zubauBasis(g.privatDachKwp - (g.privatDachKwpL3 ?? 0)),
  },
  {
    key: "tempo-5j",
    betreffPhrase: `beim Solar-Zubau seit Ende ${seitEnde(5)}`,
    slug: "zubau-5-jahre-je-einwohner",
    label: "Tempo 5 Jahre",
    merit: `Meiste je Einwohner zugebaute Solarleistung seit Ende ${seitEnde(5)}.`,
    bestleistung: `den größten Zubau auf privaten Dächern je Einwohner seit Ende ${seitEnde(5)}`,
    thema: `Zubau auf privaten Dächern je Einwohner seit Ende ${seitEnde(5)}`,
    themaDativ: `Solar-Zubau je Einwohner seit Ende ${seitEnde(5)}`,
    traeger: "buerger",
    messart: "proKopf",
    format: "wattProKopf",
    metric: (g) => perCapita(Math.max(0, g.privatDachKwp - (g.privatDachKwpL5 ?? 0)), g.population),
    basis: (g) => zubauBasis(g.privatDachKwp - (g.privatDachKwpL5 ?? 0)),
  },
  // Bürger, absolut — belohnt die großen Städte-Bürgerschaften.
  {
    key: "balkon-abs",
    betreffPhrase: "bei Balkonkraftwerken",
    label: "Balkon-Hauptstadt",
    merit: "Meiste Balkonkraftwerke insgesamt.",
    bestleistung: "die meisten Balkonkraftwerke insgesamt",
    thema: "Balkonkraftwerke insgesamt",
    themaDativ: "Balkonkraftwerken",
    traeger: "buerger",
    messart: "absolut",
    format: "count",
    metric: (g) => pos(g.balkonCount),
  },
  {
    key: "dach-privat-abs",
    betreffPhrase: "bei privater Solarleistung",
    label: "Solardach-Hauptstadt",
    merit: "Meiste private Dach-Solarleistung insgesamt — Bürger-Solar auf den Dächern, kein Gewerbe/Park.",
    bestleistung: "die meiste private Solarleistung auf den Dächern",
    thema: "private Solarleistung auf den Dächern",
    themaDativ: "Solarleistung auf privaten Dächern",
    traeger: "buerger",
    messart: "absolut",
    format: "pvLeistung",
    metric: (g) => pos(g.privatDachKwp),
  },
  {
    key: "batterie-privat-abs",
    betreffPhrase: "bei Hausspeichern",
    label: "Speicher-Hauptstadt",
    merit: "Meiste private Batteriekapazität insgesamt.",
    bestleistung: "die meiste private Speicherkapazität",
    thema: "private Speicherkapazität",
    themaDativ: "privater Speicherkapazität",
    traeger: "buerger",
    messart: "absolut",
    format: "speicherKwh",
    metric: (g) => pos(g.batteriePrivatKwh),
  },
  // Gewerbe / Standort, absolut — pro Kopf hier verifiziert absurd, daher nur so.
  {
    key: "solar-gesamt",
    slug: "solarleistung-gesamt",
    label: "Solar gesamt",
    merit: "Meiste installierte Solarleistung insgesamt — Dächer, Balkone und Freiflächen zusammen.",
    bestleistung: "die meiste installierte Solarleistung insgesamt",
    thema: "Solarleistung insgesamt",
    themaDativ: "installierter Solarleistung insgesamt",
    traeger: "gewerbe",
    messart: "absolut",
    format: "pvLeistung",
    // ABSOLUT und nicht je Einwohner — gemessen: Je Einwohner fuehrt Buettel mit
    // 4.205.483 Wp je Kopf (rund 120 Einwohner neben einer Industrieanlage), eine
    // Zahl, die niemand lesen kann. Absolut korreliert die Liste zwar mit der
    // Ortsgroesse (+0,82), ihre Spitze ist aber trotzdem eine Aussage: die
    // groesste Stadt und zwei Kraftwerks-Standorte. Genau deshalb steht sie unter
    // "Sonstiges" und nicht bei den privaten Ranglisten.
    metric: (g) => pos(g.solarKwp ?? 0),
    metricVorjahr: (g) => pos(g.solarKwpLy ?? 0),
  },
  {
    key: "solar-standort",
    label: "Solar-Standort",
    merit: "Höchste gewerbliche + Freiflächen-Solarleistung. Misst den Standort, nicht die Bürger.",
    bestleistung: "die meiste installierte Solarleistung insgesamt",
    thema: "installierte Solarleistung insgesamt",
    themaDativ: "installierter Solarleistung",
    traeger: "gewerbe",
    messart: "absolut",
    format: "pvLeistung",
    metric: (g) => pos(g.gewerbeDachKwp + g.freiflaecheKwp),
  },
  {
    key: "freiflaeche-standort",
    slug: "freiflaechen-solar",
    label: "Freiflächen-Standort",
    merit: "Höchste Freiflächen-Solarleistung (Solarparks).",
    bestleistung: "die meiste Solarleistung auf Freiflächen",
    thema: "Solarleistung auf Freiflächen",
    themaDativ: "Solarleistung auf Freiflächen",
    traeger: "gewerbe",
    messart: "absolut",
    format: "pvLeistung",
    metric: (g) => pos(g.freiflaecheKwp),
    metricVorjahr: (g) => pos(g.freiflaecheKwpLy ?? 0),
  },
  {
    key: "gewerbespeicher-abs",
    label: "Gewerbespeicher-Standort",
    merit: "Höchste gewerbliche Batteriekapazität.",
    bestleistung: "die meiste gewerbliche Speicherkapazität",
    thema: "gewerbliche Speicherkapazität",
    themaDativ: "gewerblicher Speicherkapazität",
    traeger: "gewerbe",
    messart: "absolut",
    format: "speicherKwh",
    metric: (g) => pos(g.batterieGewerbeKwh),
  },
  {
    key: "wind-standort",
    slug: "windleistung",
    label: "Wind-Standort",
    merit: "Höchste installierte Windleistung.",
    bestleistung: "die meiste Windleistung",
    thema: "Windleistung",
    themaDativ: "Windleistung",
    traeger: "gewerbe",
    messart: "absolut",
    format: "pvLeistung",
    metric: (g) => pos(g.windKwp),
    metricVorjahr: (g) => pos(g.windKwpLy ?? 0),
  },
  {
    key: "biomasse-standort",
    label: "Biomasse-Standort",
    merit: "Höchste installierte Biomasseleistung.",
    bestleistung: "die meiste Biomasseleistung",
    thema: "Biomasseleistung",
    themaDativ: "Biomasseleistung",
    traeger: "gewerbe",
    messart: "absolut",
    format: "pvLeistung",
    metric: (g) => pos(g.biomasseKwp),
  },
  {
    key: "wasser-standort",
    label: "Wasserkraft-Standort",
    merit: "Höchste installierte Wasserkraftleistung.",
    bestleistung: "die meiste Wasserkraftleistung",
    thema: "Wasserkraftleistung",
    themaDativ: "Wasserkraftleistung",
    traeger: "gewerbe",
    messart: "absolut",
    format: "pvLeistung",
    metric: (g) => pos(g.wasserKwp),
  },
  // Dynamik.
  {
    key: "zubau",
    slug: "solar-zubau",
    label: "Zubau-Champion",
    merit: "Größter Solar-Zubau im letzten vollständigen Jahr.",
    bestleistung: "den größten Solar-Zubau im letzten Jahr",
    thema: "Solar-Zubau im letzten Jahr",
    themaDativ: "Solar-Zubau im letzten Jahr",
    traeger: "gewerbe",
    messart: "absolut",
    format: "pvLeistung",
    metric: (g) => pos(g.solarZubauKwp),
  },
];

export const AWARD_CATEGORY_BY_KEY: Record<string, AwardCategory> = Object.fromEntries(
  AWARD_CATEGORIES.map((c) => [c.key, c]),
);

/** Bekannte Solar-Freiflächen-Doppelzählungen (MaStR, gemessen von der Dedup-
 *  Session 2026-07-25): dieselbe Anlage steht in zwei Nachbargemeinden desselben
 *  Kreises mit IDENTISCHEM krummem kWp — also Doppelzählung, kein echter Split.
 *  Behandlung: HALBIEREN. Jede der beiden behält kwp/2 (Summe über beide = eine
 *  Nennleistung), weil der physische Host im Register nicht bestimmbar ist. Wert
 *  hier = abzuziehende kWp (halber Park). Betrifft nur `freiflaecheKwp` →
 *  Kategorien Solar-Standort + Freiflächen-Standort (keine Aufhänger).
 *  Feste geprüfte Liste; regelbasierte Auto-Erkennung (identischer, NICHT runder
 *  kWp in >1 Gemeinde desselben Kreises) gehört später in den MaStR-Wächter. */
export const FREIFLAECHE_DEDUP_ABZUG: Record<string, number> = {
  "09471154": 19999.3 / 2, "09471172": 19999.3 / 2, // Lisberg / Pommersfelden
  "09478120": 9993.0 / 2, "09478165": 9993.0 / 2, // Ebensfeld / Bad Staffelstein
  "01059051": 9974.6 / 2, "01059158": 9974.6 / 2, // Klein Rheide / Schafflund
  "09778157": 4693.5 / 2, "09778219": 4693.5 / 2, // Kirchhaslach / Woringen
  "07235074": 3612.0 / 2, "07235094": 3612.0 / 2, // Leiwen / Newel
  "09278118": 1579.5 / 2, "09278144": 1579.5 / 2, // Bogen / Laberweinting
  "13071092": 1499.5 / 2, "13071101": 1499.5 / 2, // Malchin / Möllenhagen
  "05358004": 1440.0 / 2, "05358036": 1440.0 / 2, // Aldenhoven / Linnich
  "09277124": 1296.8 / 2, "09277151": 1296.8 / 2, // Hebertsfelden / Unterdietfurt
  "09275128": 1249.7 / 2, "09275135": 1249.7 / 2, // Hutthurm / Neukirchen vorm Wald
};

/** Freiflächen-Leistung einer Gemeinde nach Abzug bekannter Doppelzählungen. */
export function dedupFreiflaeche(regionId: string, freiflaecheKwp: number): number {
  const abzug = FREIFLAECHE_DEDUP_ABZUG[regionId] ?? 0;
  return Math.max(0, freiflaecheKwp - abzug);
}

/** Belegwert einer Kategorie anzeigefertig — Einheit aus dem kanonischen Atlas-
 *  Formatter (nie handgeschrieben, außer den dimensionslosen Zähl-/Pro-Kopf-Fällen). */
export function formatAwardValue(value: number, format: MetricFormat): string {
  switch (format) {
    case "wattProKopf":
      return fmtWattProKopf(value);
    case "pvLeistung":
      return fmtPvLeistung(value);
    case "speicherKwh":
      return fmtSpeicherKwh(value);
    case "count":
      return `${Math.round(value).toLocaleString("de-DE")} Anlagen`;
    case "countPer1000":
      // Feste Nachkommastelle: In einer Spalte untereinander las sich sonst
      // "125,9" ueber "125" wie ein Sprung, wo nur die Null fehlte.
      return `${value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} je 1.000 Ew.`;
    case "whProKopf":
      return `${Math.round(value).toLocaleString("de-DE")} Wh/Kopf`;
    case "je100Dach":
      // NIE als Prozentzahl: Orte kommen auf ueber 100 (Osterwald: 113 Batterien
      // auf 71 Dachanlagen), weil Speicher nachgeruestet und auch an
      // Nicht-Dach-Anlagen gemeldet werden. "113 %" waere schlicht falsch.
      return `${Math.round(value).toLocaleString("de-DE")} je 100 Dächer`;
  }
}

// ─── Rolle (Vergleichsgruppe) ───────────────────────────────────────────────────

/** Die 16 Landeshauptstädte — fixe, bekannte Liste (ändert sich nicht). Als
 *  Rolle ein Querschnitt: eine Hauptstadt ist meist auch kreisfrei, wird aber
 *  ihrer Hauptstadt-Gruppe zugeordnet (Hauptstadt gegen Hauptstadt). */
const HAUPTSTAEDTE = new Set([
  "Stuttgart", "München", "Berlin", "Potsdam", "Bremen", "Hamburg", "Wiesbaden",
  "Schwerin", "Hannover", "Düsseldorf", "Mainz", "Saarbrücken", "Dresden",
  "Magdeburg", "Kiel", "Erfurt",
]);

export const ROLE_LABELS: Record<Role, string> = {
  gemeinde: "Gemeinden",
  stadt: "Städte & Märkte",
  "grosse-kreisstadt": "Große Kreisstädte",
  kreisfrei: "Kreisfreie Städte",
  hauptstadt: "Landeshauptstädte",
};

/** Amtliche Rolle einer Gemeinde. Aus der Bezeichnung (mastr_regions), plus die
 *  fixe Hauptstadt-Liste als Querschnitt. */
export function roleOf(g: GemeindeStats): Role {
  if (g.population > 50000 && HAUPTSTAEDTE.has(g.name)) return "hauptstadt";
  const b = g.bezeichnung;
  if (b === "Kreisfreie Stadt" || b === "Stadtkreis") return "kreisfrei";
  if (b === "Große Kreisstadt") return "grosse-kreisstadt";
  if (b === "Stadt" || b === "Markt") return "stadt";
  return "gemeinde";
}

// ─── Größen-Drittel (Terzile) ────────────────────────────────────────────────────

export const SIZE_LABELS: Record<SizeBand, string> = {
  klein: "kleine",
  mittel: "mittlere",
  gross: "große",
};

function quantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return 0;
  const i = (sortedAsc.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (i - lo);
}

/** Terzil-Grenzen der Einwohnerzahl über eine Menge — die Größenklassen-Grenzen
 *  kommen so aus der Verteilung selbst, nicht aus einer gesetzten Zahl. */
export function populationTertiles(gemeinden: GemeindeStats[]): { c1: number; c2: number } {
  const pops = gemeinden.map((g) => g.population).sort((a, b) => a - b);
  return { c1: Math.round(quantile(pops, 1 / 3)), c2: Math.round(quantile(pops, 2 / 3)) };
}

export function sizeBandOf(population: number, c1: number, c2: number): SizeBand {
  if (population < c1) return "klein";
  if (population < c2) return "mittel";
  return "gross";
}

// ─── Rangrechnung ────────────────────────────────────────────────────────────────

export function scopeIdOf(regionId: string, level: AwardScopeLevel): string {
  if (level === "de") return "de";
  if (level === "bundesland") return regionId.slice(0, 2);
  return regionId.slice(0, 5);
}

export type RankedGemeinde = {
  regionId: string;
  name: string;
  rank: number;
  value: number;
  population: number;
};

/** Rangliste einer schon gefilterten Menge, absteigend; Gleichstand nach AGS
 *  (stabil). Nicht wertbare (Kennzahl 0/leer) fallen raus. */
export function rankGemeinden(gemeinden: GemeindeStats[], cat: AwardCategory): RankedGemeinde[] {
  const scored = gemeinden
    .map((g) => ({ g, value: cat.metric(g) }))
    .filter((e): e is { g: GemeindeStats; value: number } => e.value != null && e.value > 0);
  // GLEICHSTAND EXAKT WIE IN DER OEFFENTLICHEN RANGLISTE (lib/atlas-ranking.ts):
  // Name als Entscheider, Sportrang. Vorher entschied hier der Gemeindeschluessel
  // und die Plaetze liefen fortlaufend durch — der Orden sagte damit "Platz 4",
  // die verlinkte Liste "Platz 3", und die gleichstehenden Orte standen auch noch
  // in anderer Reihenfolge. Zwei Zahlen fuer dieselbe Sache auf zwei Seiten, die
  // aufeinander zeigen.
  scored.sort((a, b) => b.value - a.value || a.g.name.localeCompare(b.g.name, "de"));
  let letzterWert: number | null = null;
  let letzterRang = 0;
  return scored.map((e, i) => {
    const rank = letzterWert !== null && e.value === letzterWert ? letzterRang : i + 1;
    letzterWert = e.value;
    letzterRang = rank;
    return { regionId: e.g.regionId, name: e.g.name, rank, value: e.value, population: e.g.population };
  });
}

export type ViewOptions = {
  level: AwardScopeLevel;
  splitByRole: boolean;
  splitBySize: boolean;
  minPopulation?: number;
};

export type WinnerGroup = {
  scopeId: string;
  role: Role | null;
  sizeBand: SizeBand | null;
  winner: RankedGemeinde;
  total: number;
};

/** Der Kern: Sieger je Kombination aus geografischem Bezug, optional Rolle und
 *  optional Größen-Drittel. Die Größengrenzen werden über die GESAMTE wertbare
 *  Menge gebildet (stabile Klassendefinition überall), nicht je Region. */
export function computeWinners(
  gemeinden: GemeindeStats[],
  cat: AwardCategory,
  opts: ViewOptions,
): WinnerGroup[] {
  const floor = opts.minPopulation ?? 0;
  const pool = gemeinden.filter((g) => {
    const m = cat.metric(g);
    return m != null && m > 0 && g.population >= floor;
  });

  const t = opts.splitBySize ? populationTertiles(pool) : { c1: 0, c2: 0 };

  const groups = new Map<string, GemeindeStats[]>();
  const meta = new Map<string, { scopeId: string; role: Role | null; sizeBand: SizeBand | null }>();
  for (const g of pool) {
    const scopeId = scopeIdOf(g.regionId, opts.level);
    const role = opts.splitByRole ? roleOf(g) : null;
    const sizeBand = opts.splitBySize ? sizeBandOf(g.population, t.c1, t.c2) : null;
    const key = [scopeId, role ?? "", sizeBand ?? ""].join("|");
    const arr = groups.get(key);
    if (arr) arr.push(g);
    else {
      groups.set(key, [g]);
      meta.set(key, { scopeId, role, sizeBand });
    }
  }

  const out: WinnerGroup[] = [];
  for (const [key, list] of Array.from(groups.entries())) {
    const ranked = rankGemeinden(list, cat);
    if (ranked.length === 0) continue;
    const m = meta.get(key)!;
    out.push({ scopeId: m.scopeId, role: m.role, sizeBand: m.sizeBand, winner: ranked[0], total: ranked.length });
  }
  return out;
}
