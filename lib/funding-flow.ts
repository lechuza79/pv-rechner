// Der Förderflow: aus den erfassten Bedingungen (lib/funding-conditions.ts)
// werden die Fragen abgeleitet, die für DIESE Programme überhaupt etwas
// entscheiden — und aus den Antworten der Befund je Programm.
//
// Warum abgeleitet und nicht je Stadt gebaut: Die Bedingungen sind zwar alle
// verschieden formuliert (122 Zeilen, 122 Wortlaute), die Sorten wiederholen
// sich aber. Ein Flow je Programm wären 38 Varianten, die auseinanderdriften;
// hier bestimmt der Datenbestand, welche Fragen gestellt werden.
//
// Die dritte Antwort ist Absicht: Für Programme ohne erfasste Prüfform sagt der
// Flow „ungeprüft" statt „passt". Eine Berechtigungsaussage, die auf keiner
// erfassten Bedingung beruht, wäre geraten — und beim Thema Förderung teuer.

import type { FundingProgram } from "./funding-programs";
import {
  checksFor,
  antragsZeitpunkt,
  antragsZeitpunktSatz,
  type GebaeudeArt,
  type Pruefung,
} from "./funding-conditions";

export type AnlageWahl = "pv" | "pv-speicher" | "balkon";

export interface FlowAntworten {
  /** Ist der Auftrag an den Betrieb schon vergeben? */
  auftragVergeben?: boolean;
  anlage?: AnlageWahl;
  kwp?: number;
  gebaeude?: GebaeudeArt;
}

export type FrageId = "auftrag" | "anlage" | "kwp" | "gebaeude";

export interface FlowFrage {
  id: FrageId;
  titel: string;
  hinweis?: string;
  optionen?: { wert: string; label: string; sub?: string }[];
}

/**
 * Anlagengrößen als Stufen statt als freie Eingabe.
 *
 * Der Zahlenwert je Stufe geht in die Schwellenprüfung — er muss deshalb
 * **eindeutig** auf einer Seite jeder erfassten Schwelle liegen. Läge eine
 * Schwelle innerhalb einer Stufe (etwa „bis 12 kWp" bei der Stufe 10–20), würde
 * die Prüfung für einen Teil der Auswählenden das Falsche sagen, ohne dass es
 * auffiele. `funding-flow.test.ts` hält die Stufen deshalb gegen alle erfassten
 * Schwellen; wer eine Schwelle dazwischenlegt, bekommt einen roten Test statt
 * einer stillen Fehlauskunft.
 */
export const GROESSEN_STUFEN = [
  { wert: "8", kwp: 8, label: "Bis 10 kWp", sub: "typisches Einfamilienhaus" },
  { wert: "15", kwp: 15, label: "10 – 20 kWp", sub: "großes Dach" },
  { wert: "25", kwp: 25, label: "20 – 30 kWp", sub: "sehr großes Dach" },
  { wert: "40", kwp: 40, label: "Über 30 kWp", sub: "Mehrfamilienhaus, Gewerbe" },
] as const;

const ALLE_FRAGEN: Record<FrageId, FlowFrage> = {
  auftrag: {
    id: "auftrag",
    titel: "Hast du den Auftrag für die Anlage schon vergeben?",
    hinweis:
      "Bei den meisten Programmen muss der Antrag vorher raus — bei manchen ist es genau umgekehrt.",
    optionen: [
      { wert: "nein", label: "Noch nicht", sub: "Ich plane erst" },
      { wert: "ja", label: "Ja, ist vergeben", sub: "Vertrag ist unterschrieben" },
    ],
  },
  anlage: {
    id: "anlage",
    titel: "Was möchtest du bauen?",
    optionen: [
      { wert: "pv", label: "Solaranlage aufs Dach" },
      { wert: "pv-speicher", label: "Solaranlage mit Batteriespeicher" },
      { wert: "balkon", label: "Nur ein Balkonkraftwerk" },
    ],
  },
  kwp: {
    id: "kwp",
    titel: "Wie groß soll die Anlage werden?",
    hinweis: "Ungefähr reicht — es geht nur um die Grenzen der Programme.",
    optionen: GROESSEN_STUFEN.map((s) => ({ wert: s.wert, label: s.label, sub: s.sub })),
  },
  gebaeude: {
    id: "gebaeude",
    titel: "Um was für ein Gebäude geht es?",
    optionen: [
      { wert: "efh", label: "Ein- oder Zweifamilienhaus" },
      { wert: "mfh", label: "Mehrfamilienhaus" },
      { wert: "wohn", label: "Anderes Wohngebäude" },
    ],
  },
};

/**
 * Gebäudearten sind ineinander enthalten, nicht nebeneinander: Ein
 * Einfamilienhaus IST ein Wohngebäude. Wer beides als gleichrangige Werte
 * vergleicht, schließt die 0-%-Mehrwertsteuer („Wohngebäude") für jedes
 * Einfamilienhaus aus — die Auskunft wäre falsch und würde jemanden Geld kosten,
 * das ihm zusteht. Gefunden beim Durchklicken am 13.08.2026.
 *
 * Links steht, was jemand auswählt; rechts, welche Anforderungen das erfüllt.
 */
const GEBAEUDE_ERFUELLT: Record<GebaeudeArt, GebaeudeArt[]> = {
  efh: ["efh", "wohn"],
  mfh: ["mfh", "wohn"],
  wohn: ["wohn"],
  gruendach: ["gruendach"],
  fassade: ["fassade"],
  denkmal: ["denkmal"],
};

export function erfuelltGebaeude(gewaehlt: GebaeudeArt, verlangt: GebaeudeArt[]): boolean {
  const deckt = GEBAEUDE_ERFUELLT[gewaehlt] ?? [gewaehlt];
  return verlangt.some((v) => deckt.includes(v));
}

/** Welche Prüfungssorten machen welche Frage nötig. */
function fragenFuerPruefung(p: Pruefung): FrageId[] {
  switch (p.art) {
    case "antrag-zeitpunkt":
      return ["auftrag"];
    case "anlage-speicher":
    case "anlage-balkon":
      return ["anlage"];
    case "anlage-groesse":
      return ["kwp"];
    case "gebaeude-art":
      // Trägt die Prüfung eine Vermutungsschwelle, entscheidet die Größe mit —
      // nicht über den Ausschluss, aber darüber, ob nach der Gebäudeart
      // überhaupt gefragt werden muss.
      return p.vermutetBisKwp != null ? ["kwp", "gebaeude"] : ["gebaeude"];
    case "gebaeude-bestand":
      return ["gebaeude"];
    default:
      // Antragsweg, Ausführung, Bindung, Dachbelegung entscheiden nicht über die
      // Berechtigung — sie gehören ins Ergebnis, nicht in eine Frage.
      return [];
  }
}

/**
 * Die Fragen, die für diese Programme etwas entscheiden — in fester Reihenfolge.
 * Der Zeitpunkt steht bewusst vorn: Er ist die einzige Bedingung, die sich nach
 * einer falschen Antwort nicht mehr heilen lässt.
 */
export function fragenFuer(programme: FundingProgram[]): FlowFrage[] {
  const noetig = new Set<FrageId>();
  for (const prog of programme) {
    for (const b of checksFor(prog.id)?.pruefungen ?? []) {
      for (const f of fragenFuerPruefung(b.pruefung)) noetig.add(f);
    }
  }
  const reihenfolge: FrageId[] = ["auftrag", "anlage", "kwp", "gebaeude"];
  return reihenfolge.filter((id) => noetig.has(id)).map((id) => ALLE_FRAGEN[id]);
}

export type Befund = "moeglich" | "ausgeschlossen" | "ungeprueft";

export interface ProgrammBefund {
  program: FundingProgram;
  befund: Befund;
  /** Warum ausgeschlossen — in Klartext, für die Anzeige. */
  gruende: string[];
  /** Was zu tun ist, in der Reihenfolge, in der es zu tun ist. */
  schritte: string[];
}

function schritteFuer(prog: FundingProgram): string[] {
  const checks = checksFor(prog.id);
  if (!checks) return [];
  const schritte: string[] = [];

  const zeit = antragsZeitpunkt(prog.id);
  const weg = checks.pruefungen.find((b) => b.pruefung.art === "antragsweg")?.pruefung;

  if (zeit?.zeitpunkt === "bescheid-vor-start" || zeit?.zeitpunkt === "vor-auftrag") {
    if (weg?.art === "antragsweg") {
      schritte.push(
        weg.weg === "online"
          ? `Antrag online stellen${weg.registrierung ? " (vorher registrieren)" : ""}`
          : weg.weg === "hausbank"
            ? "Antrag über die eigene Hausbank stellen"
            : weg.weg === "zweistufig"
              ? "Antrag stellen — das Verfahren läuft in zwei Stufen"
              : "Antragsformular ausfüllen und einreichen",
      );
    } else {
      schritte.push("Antrag stellen");
    }
    if (zeit.zeitpunkt === "bescheid-vor-start") schritte.push("Bewilligungsbescheid abwarten");
    schritte.push("Erst danach den Auftrag vergeben");
    schritte.push("Anlage bauen lassen und in Betrieb nehmen");
  } else if (zeit?.zeitpunkt === "nach-inbetriebnahme") {
    schritte.push("Auftrag vergeben und Anlage bauen lassen");
    schritte.push("Anlage in Betrieb nehmen und im Marktstammdatenregister anmelden");
    schritte.push(
      zeit.fristMonate
        ? `Antrag stellen — innerhalb von ${zeit.fristMonate} Monaten nach Inbetriebnahme`
        : "Antrag stellen",
    );
  }

  const ausf = checks.pruefungen.find((b) => b.pruefung.art === "ausfuehrung")?.pruefung;
  if (ausf?.art === "ausfuehrung" && ausf.fachbetriebPflicht) {
    schritte.push("Ausführung durch einen Fachbetrieb — Eigenleistung zählt nicht");
  }
  return schritte;
}

/** Prüft ein einzelnes Programm gegen die Antworten. */
export function pruefeProgramm(prog: FundingProgram, a: FlowAntworten): ProgrammBefund {
  const checks = checksFor(prog.id);
  if (!checks) {
    return {
      program: prog,
      befund: "ungeprueft",
      gruende: [],
      schritte: [],
    };
  }

  const gruende: string[] = [];

  for (const { pruefung: p } of checks.pruefungen) {
    switch (p.art) {
      case "antrag-zeitpunkt": {
        if (a.auftragVergeben && (p.zeitpunkt === "vor-auftrag" || p.zeitpunkt === "bescheid-vor-start")) {
          gruende.push(
            p.zeitpunkt === "bescheid-vor-start"
              ? "Hier muss der Bewilligungsbescheid vor der Beauftragung vorliegen — der Auftrag ist bereits vergeben."
              : "Der Antrag hätte vor der Auftragsvergabe gestellt werden müssen.",
          );
        }
        break;
      }
      case "anlage-balkon": {
        if (p.regel === "ausgeschlossen" && a.anlage === "balkon") {
          gruende.push("Balkonkraftwerke werden hier nicht gefördert.");
        }
        if (p.regel === "nur-balkon" && a.anlage !== "balkon") {
          gruende.push("Gefördert werden hier ausschließlich Balkonkraftwerke.");
        }
        break;
      }
      case "anlage-speicher": {
        if (p.regel === "nicht-gefoerdert" && a.anlage === "pv-speicher") {
          gruende.push("Ein Batteriespeicher wird hier nicht gefördert — die Anlage selbst schon.");
        }
        break;
      }
      case "anlage-groesse": {
        if (a.kwp != null) {
          if (p.maxKwp != null && a.kwp > p.maxKwp) gruende.push(`Gilt nur bis ${p.maxKwp} kWp.`);
          if (p.minKwp != null && a.kwp < p.minKwp) gruende.push(`Erst ab ${p.minKwp} kWp.`);
        }
        break;
      }
      case "gebaeude-art": {
        // Greift die Vermutung, wird die Gebäudeart gar nicht erst geprüft.
        const vermutet = p.vermutetBisKwp != null && a.kwp != null && a.kwp <= p.vermutetBisKwp;
        if (!vermutet && a.gebaeude && !erfuelltGebaeude(a.gebaeude, p.nur)) {
          const nurMfh = p.nur.includes("mfh") && !p.nur.includes("efh");
          gruende.push(
            nurMfh
              ? "Gefördert werden hier nur Mehrfamilienhäuser."
              : "Für diese Gebäudeart ist das Programm nicht vorgesehen.",
          );
        }
        break;
      }
      default:
        break;
    }
  }

  return {
    program: prog,
    befund: gruende.length > 0 ? "ausgeschlossen" : "moeglich",
    gruende,
    schritte: gruende.length > 0 ? [] : schritteFuer(prog),
  };
}

export interface FlowErgebnis {
  moeglich: ProgrammBefund[];
  ausgeschlossen: ProgrammBefund[];
  ungeprueft: ProgrammBefund[];
  /** Programme, die durch eine bereits erfolgte Beauftragung weggefallen sind —
   *  der teuerste Einzelfall, deshalb eigens ausgewiesen. */
  durchBeauftragungVerloren: ProgrammBefund[];
}

/** Alle Größen-Schwellen, die in den erfassten Programmen vorkommen. */
export function alleGroessenSchwellen(programme: FundingProgram[]): number[] {
  const s: number[] = [];
  for (const p of programme) {
    for (const b of checksFor(p.id)?.pruefungen ?? []) {
      if (b.pruefung.art === "anlage-groesse") {
        if (b.pruefung.minKwp != null) s.push(b.pruefung.minKwp);
        if (b.pruefung.maxKwp != null) s.push(b.pruefung.maxKwp);
      }
    }
  }
  return [...new Set(s)];
}

export function werteAus(programme: FundingProgram[], a: FlowAntworten): FlowErgebnis {
  const alle = programme.map((p) => pruefeProgramm(p, a));
  const verloren = alle.filter(
    (b) =>
      b.befund === "ausgeschlossen" &&
      antragsZeitpunkt(b.program.id) != null &&
      a.auftragVergeben === true,
  );
  const verlorenIds = new Set(verloren.map((b) => b.program.id));
  return {
    moeglich: alle.filter((b) => b.befund === "moeglich"),
    ausgeschlossen: alle.filter((b) => b.befund === "ausgeschlossen" && !verlorenIds.has(b.program.id)),
    ungeprueft: alle.filter((b) => b.befund === "ungeprueft"),
    durchBeauftragungVerloren: verloren,
  };
}

/** Der Warnsatz zum Zeitpunkt — nur wenn er für dieses Programm erfasst ist. */
export { antragsZeitpunktSatz };
