// Prüfbare Form der Förderbedingungen.
//
// Die Freitexte in `conditions` (lib/funding-programs.ts) bleiben, was sie sind:
// das, was ein Mensch liest. Dieses Modul beantwortet die andere Frage — welche
// davon sich PRÜFEN lassen, also im Förderflow zu einer Frage werden können.
//
// Gemessen am 13.08.2026: 38 Programme, 122 Bedingungen, **keine einzige
// Formulierung kommt zweimal vor**. Verschieden sind aber nur die Wortlaute und
// Werte — die Sorten wiederholen sich (Antragszeitpunkt, wer darf, welches
// Gebäude, welche Anlage, Ausführung, Bindungsdauer). Deshalb kein Flow je
// Programm, sondern ein Flow über wiederkehrende Prüfungen.
//
// **Jede Prüfung trägt den Wortlaut, aus dem sie stammt** (`ausBedingung`). Das
// ist kein Kommentar, sondern der Mechanismus: `funding-conditions.test.ts` hält
// jede `conditions`-Zeile gegen die Belege, die regionsgedeckten und die
// ausdrücklichen Hinweise. Was in keiner dieser Listen auftaucht, ist beim
// Erfassen untergegangen — und lässt den Test fallen, statt still zu fehlen.

import { allFundingPrograms, type FundingProgram } from "./funding-programs";

// ── Wer darf beantragen ──────────────────────────────────────────────────────
export type Antragsteller =
  | "eigentuemer"   // Wohngebäudeeigentümer
  | "mieter"        // ausdrücklich auch Mieter
  | "weg"           // Wohnungseigentümergemeinschaft
  | "verein"        // eingetragene gemeinnützige Vereine
  | "gewerbe";

export type GebaeudeArt = "efh" | "mfh" | "wohn" | "gruendach" | "fassade" | "denkmal";

/**
 * Eine einzelne prüfbare Bedingung.
 *
 * Der Antragszeitpunkt ist bewusst dreiwertig und NICHT als „vorher ja/nein"
 * modelliert: Die verbreitete Regel „immer vor Auftragsvergabe beantragen" ist
 * falsch. Mehrere Programme verlangen den Antrag ausdrücklich **nach**
 * Inbetriebnahme (eines mit Sechs-Monats-Frist danach). Eine pauschale Warnung
 * würde genau diesen Antragstellern die Förderung kosten.
 */
export type Pruefung =
  | {
      art: "antrag-zeitpunkt";
      /** `bescheid-vor-start`: der Antrag allein reicht nicht, der Bescheid muss da sein. */
      zeitpunkt: "vor-auftrag" | "bescheid-vor-start" | "nach-inbetriebnahme";
      /** Nur bei `nach-inbetriebnahme`: Frist in Monaten. */
      fristMonate?: number;
    }
  | { art: "antragsweg"; weg: "online" | "hausbank" | "formular" | "zweistufig"; registrierung?: boolean }
  | { art: "antragsteller"; wer: Antragsteller[] }
  | { art: "gebaeude-bestand"; bauantragVorIso?: string }
  | { art: "gebaeude-art"; nur: GebaeudeArt[] }
  | { art: "anlage-groesse"; minKwp?: number; maxKwp?: number }
  | {
      art: "anlage-speicher";
      regel: "nur-mit-neuer-pv" | "nicht-gefoerdert" | "min-kwh" | "max-je-kwp";
      wert?: number;
    }
  | { art: "anlage-balkon"; regel: "ausgeschlossen" | "nur-balkon" }
  | { art: "anlage-dachbelegung"; volleBelegung: true }
  | { art: "ausfuehrung"; fachbetriebPflicht?: boolean; eigenleistungAusgeschlossen?: boolean; mietmodellAusgeschlossen?: boolean }
  | { art: "bindung"; jahre: number };

export interface Bedingungspruefung {
  /** Wortlaut aus `conditions` — der Beleg. Muss zeichengleich sein. */
  ausBedingung: string;
  pruefung: Pruefung;
}

export interface FundingChecks {
  /**
   * Programme ohne Antragsverfahren — die Vergünstigung greift von selbst
   * (Steuerregel). Bewusstes Feld statt einer fehlenden Angabe: „hier gibt es
   * keine Frist" ist eine Aussage, „Frist nicht erfasst" wäre eine Lücke, und
   * beides sähe im Code sonst gleich aus.
   */
  ohneAntrag?: { warum: string };
  pruefungen: Bedingungspruefung[];
  /** Bedingungen, welche die Ortsauswahl im Flow bereits erledigt. */
  durchRegion: string[];
  /** Bedingungen, die Hinweis bleiben. `warum` erzwingt die bewusste Entscheidung
   *  statt eines Abladeplatzes für alles Unbequeme. */
  hinweise: { ausBedingung: string; warum: string }[];
}

/**
 * Programme, deren Bedingungen noch nicht erfasst sind. Bewusst als sichtbare,
 * schrumpfende Liste (gleiche Systematik wie die Ausnahmeliste im
 * Einheiten-Wächter): Der Test prüft jedes Programm, das NICHT hier steht, auf
 * Vollständigkeit — die Liste zu verlängern ist damit eine sichtbare
 * Entscheidung, kein Versehen.
 */
export const NOCH_NICHT_ERFASST: string[] = [
  "berlin-solarplus", "stuttgart-solaroffensive", "karlsruhe-klimabonus",
  "regensburg-effizient", "wuerzburg-klimastadt", "darmstadt-pv",
  "badhomburg-energiespar", "koeln-pv", "duesseldorf-klimafreundlich",
  "hannover-proklima", "bonn-solares", "goettingen-klimafonds",
  "freiburg-stromerzeugung", "heidelberg-rev", "mannheim-solarbonus",
  "muenster-klimafreundlich", "wiesbaden-eswe-speicher", "mainz-kipki-speicher",
  "muenchen-fkg", "bremen-rundumshaus", "potsdam-klimaschutz", "dortmund-pv",
  "essen-solar", "schweinfurt-pv", "osnabrueck-saniert", "memmingen-ee",
  "baden-baden-pvplus", "schwerin-pv", "wolfsburg-pv", "bottrop-solaroffensive",
  "krefeld-klimafreundlich", "rhein-erft-energieoffensive", "viersen-klimaschutz",
  "bergstrasse-speicher", "mayen-koblenz-speicher",
];

/**
 * Die erfassten Prüfungen je Programm-Id.
 *
 * Erfassungsregel: Ein Programm kommt erst hier hinein, wenn **alle** seine
 * Bedingungen zugeordnet sind — halb erfasst gibt es nicht, sonst entsteht
 * genau die stille Lücke, die der Test verhindern soll.
 */
export const FUNDING_CHECKS: Record<string, FundingChecks> = {
  "bund-nullsteuer": {
    ohneAntrag: {
      warum:
        "Steuerregel nach § 12 Abs. 3 UStG — der Nullsatz wird beim Kauf angewandt, " +
        "es gibt weder Antrag noch Frist noch einen Topf, der leerlaufen kann.",
    },
    pruefungen: [
      { ausBedingung: "Wohngebäude", pruefung: { art: "gebaeude-art", nur: ["wohn"] } },
      { ausBedingung: "Anlage bis 30 kWp", pruefung: { art: "anlage-groesse", maxKwp: 30 } },
    ],
    durchRegion: [],
    hinweise: [],
  },

  "bund-kfw270": {
    pruefungen: [
      {
        ausBedingung: "Antrag vor Vorhabenbeginn über die Hausbank",
        pruefung: { art: "antrag-zeitpunkt", zeitpunkt: "vor-auftrag" },
      },
      {
        ausBedingung: "Antrag vor Vorhabenbeginn über die Hausbank",
        pruefung: { art: "antragsweg", weg: "hausbank" },
      },
    ],
    durchRegion: [],
    hinweise: [],
  },

  "frankfurt-klimabonus": {
    pruefungen: [
      {
        ausBedingung: "Erst nach Zuwendungsbescheid mit der Maßnahme beginnen",
        pruefung: { art: "antrag-zeitpunkt", zeitpunkt: "bescheid-vor-start" },
      },
      {
        ausBedingung: "Online-Antrag mit Registrierung",
        pruefung: { art: "antragsweg", weg: "online", registrierung: true },
      },
      {
        ausBedingung: "Batteriespeicher und Ladesäulen nur in Kombination mit einer neuen PV-Anlage",
        pruefung: { art: "anlage-speicher", regel: "nur-mit-neuer-pv" },
      },
      {
        ausBedingung:
          "Balkonkraftwerke werden seit dem 03.06.2025 nicht mehr gefördert",
        pruefung: { art: "anlage-balkon", regel: "ausgeschlossen" },
      },
    ],
    durchRegion: ["Grundstück im Stadtgebiet Frankfurt"],
    hinweise: [],
  },
};

// ── Ableitungen für den Flow ─────────────────────────────────────────────────

export function checksFor(programId: string): FundingChecks | undefined {
  return FUNDING_CHECKS[programId];
}

/** Der Antragszeitpunkt eines Programms — oder undefined, wenn nicht erfasst. */
export function antragsZeitpunkt(programId: string) {
  const found = checksFor(programId)?.pruefungen.find(
    (b): b is Bedingungspruefung & { pruefung: Extract<Pruefung, { art: "antrag-zeitpunkt" }> } =>
      b.pruefung.art === "antrag-zeitpunkt",
  );
  return found?.pruefung;
}

/**
 * Klartext-Satz zum Antragszeitpunkt. Bewusst je Programm aus den Daten und
 * NICHT als allgemeine Warnung — die Richtung stimmt nicht überall.
 */
export function antragsZeitpunktSatz(programId: string): string | null {
  const z = antragsZeitpunkt(programId);
  if (!z) return null;
  switch (z.zeitpunkt) {
    case "vor-auftrag":
      return "Der Antrag muss gestellt sein, bevor du den Auftrag vergibst. Wer zuerst beauftragt, bekommt nichts mehr.";
    case "bescheid-vor-start":
      return "Der Antrag reicht nicht — du musst den Bewilligungsbescheid abwarten und darfst erst danach beauftragen.";
    case "nach-inbetriebnahme":
      return z.fristMonate
        ? `Hier wird umgekehrt beantragt: erst nach Inbetriebnahme, und zwar innerhalb von ${z.fristMonate} Monaten.`
        : "Hier wird umgekehrt beantragt: erst nach der Inbetriebnahme.";
  }
}

/** Programme, deren Antragsfrist mit einer bereits erfolgten Beauftragung verpasst ist. */
export function verpasstDurchBeauftragung(programId: string): boolean {
  const z = antragsZeitpunkt(programId);
  return z?.zeitpunkt === "vor-auftrag" || z?.zeitpunkt === "bescheid-vor-start";
}

/** Alle Programme, die eine Prüfform haben — Grundlage für Tests und Flow. */
export function erfassteProgramme(): FundingProgram[] {
  return allFundingPrograms().filter((p) => FUNDING_CHECKS[p.id]);
}
