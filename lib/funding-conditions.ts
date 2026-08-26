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
  | {
      art: "gebaeude-art";
      nur: GebaeudeArt[];
      /**
       * Bis zu dieser Anlagengröße gilt die Gebäudeart als erfüllt, ohne dass
       * sie geprüft wird — eine VERMUTUNGSREGEL, keine Obergrenze.
       *
       * Gebraucht wird das für den umsatzsteuerlichen Nullsatz: § 12 Abs. 3
       * Nr. 1 Satz 1 UStG verlangt die Anlage an einer Wohnung oder einem dem
       * Gemeinwohl dienenden Gebäude; Satz 2 sagt, die Voraussetzungen des
       * Satzes 1 „gelten als erfüllt", wenn die Bruttoleistung nicht mehr als
       * 30 kW (peak) beträgt. Eine Fiktion wirkt nur in eine Richtung: Sie sagt,
       * wann etwas als erfüllt GILT, nie wann es als nicht erfüllt gilt.
       *
       * Ohne dieses Feld waren beide Sätze als zwei UND-verknüpfte Bedingungen
       * erfasst, und das gab zwei falsche Auskünfte gleichzeitig: 40 kWp auf
       * einem Wohnhaus galten als ausgeschlossen (obwohl Satz 1 unmittelbar
       * erfüllt ist und nur nachgewiesen statt vermutet werden muss), und
       * 8 kWp auf einem Nicht-Wohngebäude ebenso — ausgerechnet der Fall, für
       * den die Vermutung geschaffen wurde. Geprüft am 25.08.2026 im Volltext:
       * § 12 Abs. 3 Nr. 1 UStG sowie UStAE 12.18 Abs. 5 Satz 2 („Vereinfachung
       * für die Prüfung der Gebäudeart") und Abs. 6 Satz 2, der die beiden
       * Wege ausdrücklich mit „entweder … oder" verbindet.
       */
      vermutetBisKwp?: number;
    }
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
  // Nach dem Merge von main dazugekommen — der Test hat sie gefunden, statt sie
  // still ungeprüft durchzulassen. Genau dafür ist die Liste da.
  "ludwigshafen-kipki", "waiblingen-klimaschutz", "herne-klimafoerderung",
  // Aus dem Abdeckungs-Screening vom 18.08.2026 — Sätze und Bedingungen sind an
  // der Amtsseite belegt, die Zuordnung zu den Prüfformen steht noch aus.
  "hoehr-grenzhausen-energie", "wietzen-pv", "gaimersheim-energie", "dietmannsried-pv",
  // Zweiter Schwung aus dem Screening (18.08.2026), diesmal überwiegend
  // Balkonkraftwerke. Sätze, Status und Bedingungen sind an der Amtsseite
  // gelesen und belegt; was noch fehlt, ist die Zuordnung zu den Prüfformen —
  // die ist eine eigene Arbeit, und halb erfasst gibt es hier nicht.
  "ennepetal-steckersolar", "wittlich-balkonkraftwerke", "hochheim-klimaschutz",
  "linsengericht-oekologie", "holzgerlingen-erneuerbare", "wernau-balkonkraftwerke",
  "muehlhausen-sulz-pv", "senden-klima",
  // Erste Wärmepumpen-Funde derselben Runde.
  "maintal-klima", "roth-klimaschutz", "wenden-heizungstausch",
  // Von der Prüfmechanik-Session übergeben und hier im Volltext gegengelesen.
  "hohenahr-pv", "leimen-klimaschutz",
  "sandhausen-foerderprogramme", "helmstedt-umwelt-klima", "nottuln-klimaschutz",
  "heddesheim-umwelt", "nittenau-steckersolar", "beratzhausen-effizient",
  "rietheim-weilheim-pv", "forstinning-energiewende", "oftersheim-co2",
  "bad-rothenfelde-klima", "vilshofen-steckersolar",
  // Erste Städte, die überhaupt erst die URL-Suche gefunden hat.
  "neuwied-balkonkraftwerke", "rodgau-balkonsolar", "tuebingen-balkon-pv",
  "zweibruecken-balkonkraftwerke", "unterhaching-energiesparen",
  "hueckelhoven-balkonkraftwerke", "weinheim-effizienz", "ottobrunn-foerderprogramme",
  "feucht-klimaschutz",
  // Aus dem Parallel-Lesen vom 18.08.2026, Beträge selbst gegengelesen.
  "limburgerhof-balkonkraftwerke", "gernsheim-foerderprogramme", "gudensberg-balkonkraftwerke",
  "poing-energie", "goch-balkonkraftwerke", "herzberg-balkonkraftwerke",
  "herbrechtingen-balkonkraftwerke", "weyhe-klimaschutz", "moormerland-balkonkraftwerke",
  "bad-krozingen-balkon-pv",
  "reichelsheim-steckersolar", "putzbrunn-klimaschutz", "dettelbach-gestaltungssatzung-pv",
  "gailingen-balkonsolar", "hattenhofen-balkonsolar", "gaiberg-steckersolar",
  "karlshuld-balkonkraftwerke", "walddorfhaeslach-steckersolar", "klempau-balkonkraftwerke",
  // Leseliste vom 19.08.2026 — die 42 ungelesenen Fundstellen und die 35 Seiten,
  // die der Screener automatisch als „ausgelaufen" abgetan hatte. Jede Zahl an
  // der Amtsseite bzw. im Richtlinien-PDF selbst gegengelesen.
  "schiltach-pv", "altdorf-bb-balkonkraftwerke", "steffenberg-balkonkraftwerke",
  "tegernheim-stecker-pv", "lohfelden-100-daecher", "schwebheim-batteriespeicher",
  "asbach-balkonkraftwerke", "parkstein-nachhaltigkeitszuschuss",
  "marburg-balkonkraftwerke", "schoenbrunn-balkon-pv",
  "hillscheid-energie", "schlierbach-energiespeicher",
  // Hamburg (26.08.2026) — und hier steht ausnahmsweise, WAS genau fehlt, weil
  // es eine einzelne beschaffbare Angabe ist: der Antragszeitpunkt. Sachsen und
  // M-V derselben Runde sind vollständig erfasst; bei Hamburg sagen weder die
  // Seite der Umweltbehörde noch die Pressemitteilung des Caritasverbands, ob
  // vor dem Kauf zu beantragen ist. Der belegte Ablauf (erst Beratung, dann
  // wird das geförderte Gerät ausgewählt) legt „vorher" nahe — aber „legt nahe"
  // ist bei genau der Bedingung zu wenig, deren Verletzung die ganze Förderung
  // kostet. Zu klären ist das nur bei der Caritas selbst, und das ist
  // Außenkontakt.
  "hamburg-balkon-geringes-einkommen",
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
      {
        ausBedingung:
          "Anlage an einer Wohnung oder einem dem Gemeinwohl dienenden Gebäude — bis 30 kWp ohne Nachweis der Gebäudeart",
        // EINE Bedingung mit zwei Nachweiswegen, nicht zwei Bedingungen: siehe
        // die Begründung an `vermutetBisKwp`. Eine Größenprüfung steht hier
        // bewusst NICHT mehr — der Nullsatz kennt keine Leistungsobergrenze.
        pruefung: { art: "gebaeude-art", nur: ["wohn", "gruendach", "fassade", "denkmal"], vermutetBisKwp: 30 },
      },
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
    hinweise: [
      {
        ausBedingung: "Pflichtmaßnahmen werden nicht gefördert",
        warum:
          "Ob eine Maßnahme gesetzlich vorgeschrieben ist, hängt am Gebäude und am " +
          "Zeitpunkt — das weiß der Rechner nicht. Für eine neue Dachanlage auf einem " +
          "Bestandsgebäude ist es der Regelfall, dass keine Pflicht besteht; sicher " +
          "sagen kann es nur die Stadt.",
      },
      {
        ausBedingung: "Die Investitionen dürfen nicht zu einer Mieterhöhung führen",
        warum:
          "Betrifft nur, wer vermietet, und ist eine Zusage über die Zukunft — nicht " +
          "aus den Eingaben ableitbar. Für Selbstnutzer ohne Belang.",
      },
    ],
  },

  // ── Landesprogramme Steckersolar (erfasst 26.08.2026) ──────────────────────
  // Bewusst vollständig zugeordnet statt in NOCH_NICHT_ERFASST abgelegt: Es
  // sind drei Programme mit zusammen 18 Bedingungen, und zwei davon tragen
  // genau die Sorte Bedingung, für die der Flow gebaut wurde — eine, deren
  // Verletzung die ganze Förderung kostet.

  "sachsen-balkon": {
    pruefungen: [
      {
        ausBedingung:
          "Der Antrag war erst nach Kauf und Inbetriebnahme zu stellen",
        pruefung: { art: "antrag-zeitpunkt", zeitpunkt: "nach-inbetriebnahme" },
      },
      {
        ausBedingung:
          "Antragsberechtigt waren Privatpersonen mit Erstwohnsitz in Sachsen — Mieter und selbstnutzende Eigentümer",
        pruefung: { art: "antragsteller", wer: ["eigentuemer", "mieter"] },
      },
      {
        ausBedingung:
          "Gefördert wurden Anlagen ab 300 Wp Modulleistung und höchstens 800 W je Wechselrichter",
        pruefung: { art: "anlage-balkon", regel: "nur-balkon" },
      },
    ],
    durchRegion: [],
    hinweise: [
      {
        ausBedingung:
          "Das Programm ist zum 30. Juni 2026 ausgelaufen; neue Anträge sind nicht mehr möglich",
        warum:
          "Der Status trägt das bereits (`eingestellt`), und `fundingZaehlt()` " +
          "sortiert das Programm damit aus jeder Rechnung aus. Als Prüfung im " +
          "Flow wäre es eine Frage, die nie zu einem Ja führen kann — der Satz " +
          "steht hier, weil der Leser den Grund sehen soll, nicht weil er etwas " +
          "zu prüfen hätte.",
      },
      {
        ausBedingung:
          "Gefördert wurden rund 16.600 Anlagen mit über 5 Mio. € Landesmitteln",
        warum:
          "Eine Bilanz, keine Bedingung. Sie steht in der Liste, weil sie die " +
          "Größenordnung einordnet, die hier gerade weggefallen ist.",
      },
      {
        ausBedingung:
          "Eine zusätzliche Förderung aus einem anderen Programm war ausgeschlossen",
        warum:
          "Steht bereits strukturiert in der leeren `combinableWith`-Liste. Als " +
          "eigene Prüfung wäre es eine zweite Fassung derselben Angabe — genau " +
          "die Sorte Kopie, die im Katalog schon einmal auseinandergelaufen ist.",
      },
    ],
  },

  "mv-mini-solar": {
    pruefungen: [
      {
        ausBedingung: "Der Antrag wird erst nach Kauf und Installation gestellt",
        pruefung: { art: "antrag-zeitpunkt", zeitpunkt: "nach-inbetriebnahme" },
      },
      {
        ausBedingung:
          "Der Antrag ist schriftlich auf dem Formular einzureichen — per E-Mail übersandte Anträge sind unwirksam",
        pruefung: { art: "antragsweg", weg: "formular" },
      },
      {
        // Der Eigentümer-Topf ist leer — antragsberechtigt sind faktisch nur
        // noch Mietende. Das ist bewusst als PRÜFUNG erfasst und nicht als
        // Hinweis: Es ist die Bedingung, an der hier alles hängt, und die
        // einzige, die im Flow ein klares Nein erzeugen kann.
        ausBedingung:
          "Das Kontingent für Eigentümer ist ausgeschöpft; nur Mietende können noch beantragen",
        pruefung: { art: "antragsteller", wer: ["mieter"] },
      },
      {
        ausBedingung:
          "Zubehör, Umbausätze, Eigenleistungen und Eigenbau sind nicht förderfähig",
        pruefung: { art: "ausfuehrung", eigenleistungAusgeschlossen: true },
      },
    ],
    durchRegion: [
      "Antragsberechtigt sind Privatpersonen mit Erstwohnsitz in Mecklenburg-Vorpommern",
    ],
    hinweise: [
      {
        ausBedingung: "Gefördert werden nur Anlagen mit Kaufdatum nach dem 07.11.2022",
        warum:
          "Ein Stichtag, der bald vier Jahre zurückliegt — für jeden, der heute " +
          "kauft, erfüllt. Als Frage im Flow wäre er reine Reibung; als Hinweis " +
          "steht er für die wenigen, die eine ältere Anlage nachträglich " +
          "anmelden wollen.",
      },
      {
        ausBedingung:
          "Unvollständige Anträge werden nicht bewilligt; es zählt die Reihenfolge vollständiger Anträge",
        warum:
          "Eine Verfahrensregel über die Sorgfalt beim Ausfüllen, nicht über " +
          "die Anlage oder den Antragsteller. Aus keiner Eingabe ableitbar.",
      },
    ],
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
