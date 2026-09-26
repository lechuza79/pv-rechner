// ─── Was ein Team gekostet hätte: Rollen und ihre Sätze ──────────────────────
//
// Der Herstellungsaufwand wurde bisher mit EINEM Satz multipliziert. Das ist für
// eine Angebotsrechnung falsch: Ein Projekt dieser Art baut keine Person allein,
// sondern ein Team mit verschiedenen Stundensätzen — und die Mischung
// entscheidet über die Summe stärker als jede einzelne Zahl.
//
// DIE BELEGLAGE IST DÜNN, UND DAS GEHÖRT AN DIE ZAHLEN. Es gibt genau EINE
// belastbare Erhebung (den Freelancer-Kompass, über 5.400 Befragte), und die
// schlüsselt **nicht nach Seniorität** auf. Alles, was nach „Junior 80–100,
// Senior 120–160" aussieht, stammt aus Marktbeobachtungen von Agenturen, die
// ihre eigenen Sätze beschreiben — die Spannen widersprechen sich zwischen den
// Quellen um bis zu 40 Punkte. Deshalb: die Erhebung als Anker, der Aufschlag
// und die Spreizung als ausgewiesenes Urteil, und eine Spanne statt eines
// Punktwerts.
//
// WAS DIE ERHEBUNG ÜBER DIE SPREIZUNG SAGT, ist bemerkenswert und wird hier
// bewusst festgehalten: Nach Alter gestaffelt liegen die Sätze bei 80 € (20–30
// Jahre), 95 € (31–40), 96 € (41–50) und 95 € (51+). Der Abstand zwischen
// Anfang und Routine beträgt also rund ein Fünftel, nicht das Doppelte. Eine
// Rollenstaffel, die Junior und Architekt um Faktor zwei spreizt, beschreibt
// die Preisliste einer Agentur, nicht den Markt für die Arbeitskraft.

/** Wer im gedachten Team arbeitet. */
export type Rolle = "cto" | "senior" | "junior";

export interface Rollensatz {
  rolle: Rolle;
  /** Klartext für die Ausgabe. */
  name: string;
  /** Euro je Stunde, netto, als Agenturpreis gegenüber dem Kunden. */
  eurProStunde: number;
  /** Womit dieser Satz begründet ist. */
  beleg: string;
}

/**
 * Der Anker aus der einzigen echten Erhebung.
 *
 * Freelancer-Kompass 2026 (freelancermap, veröffentlicht 02.07.2026, über 5.400
 * Befragte im DACH-Raum): mittlerer Stundensatz über alle IT-Freelancer 103 €,
 * für den Fachbereich Software- und Webentwicklung 90 € bei n=356. Am
 * 23.09.2026 gelesen.
 */
export const ERHEBUNG = {
  quelle: "Freelancer-Kompass 2026 (freelancermap, über 5.400 Befragte)",
  gelesenAm: "2026-09-23",
  itGesamtEurProStunde: 103,
  softwareEntwicklungEurProStunde: 90,
  stichprobeSoftware: 356,
  /** Sätze nach Alter — der einzige belegte Anhalt für eine Spreizung. */
  nachAlter: { "20-30": 80, "31-40": 95, "41-50": 96, "51+": 95 },
} as const;

export const ROLLENSAETZE: Rollensatz[] = [
  {
    rolle: "cto",
    name: "CTO / Architekt",
    eurProStunde: 165,
    beleg:
      "Marktbeobachtung mehrerer Dienstleister für Lead-, Architektur- und " +
      "Spezialistenrollen (150–180 €); Mitte der Spanne. Keine Erhebung — die " +
      "einzige Studie schlüsselt nicht nach Seniorität auf",
  },
  {
    rolle: "senior",
    name: "Senior-Entwickler",
    eurProStunde: 130,
    beleg:
      "Mitte der für IT-Dienstleister genannten Spanne (120–150 €). Sie liegt " +
      "rund 30 % über dem erhobenen Freelancer-Median und deckt Projektleitung, " +
      "Qualitätssicherung, Vertretung und Haftung ab",
  },
  {
    rolle: "junior",
    name: "Junior-Entwickler",
    eurProStunde: 95,
    beleg:
      "unterstes Ende der Dienstleister-Spanne, knapp über dem erhobenen Satz " +
      "der Altersgruppe 20–30 Jahre (80 €)",
  },
];

export function satzFuer(rolle: Rolle): number {
  const r = ROLLENSAETZE.find((x) => x.rolle === rolle);
  if (!r) throw new Error(`Kein Satz für die Rolle ${rolle}`);
  return r.eurProStunde;
}

/** Wie sich ein Gewerk auf die Rollen verteilt. Die Anteile ergeben zusammen 1. */
export type Rollenmix = Record<Rolle, number>;

/**
 * Wiederkehrende Mischungen, damit nicht jedes Gewerk seine eigene Zahlenreihe
 * bekommt und zwei ähnliche Posten stillschweigend auseinanderlaufen.
 *
 * DIE ANTEILE SIND URTEIL, keine Messung — sie beschreiben, wie ein Team diese
 * Arbeit üblicherweise aufteilt. Das Urteil steckt schon in den Tagessätzen der
 * Gewerke; hier kommt nur die Frage dazu, WER die Tage leistet.
 */
export const MIX = {
  /** Modellarbeit, Recht, Architektur: die Entscheidung wiegt schwerer als die Umsetzung. */
  konzeptlastig: { cto: 0.5, senior: 0.5, junior: 0 } as Rollenmix,
  /** Der Normalfall: eine erfahrene Kraft baut, die Leitung entscheidet mit. */
  umsetzung: { cto: 0.2, senior: 0.7, junior: 0.1 } as Rollenmix,
  /** Handwerk ohne Architekturfragen — Tests, Bausteine, Schnittstellen. */
  handwerk: { cto: 0.05, senior: 0.75, junior: 0.2 } as Rollenmix,
  /** Fleißarbeit mit Anleitung: Inhalte, Erfassung, Pflege. */
  fleissarbeit: { cto: 0, senior: 0.3, junior: 0.7 } as Rollenmix,
  /** Rechtsrecherche im Volltext — sonst eine Anwaltsleistung, hier CTO-nah. */
  recht: { cto: 0.8, senior: 0.2, junior: 0 } as Rollenmix,
} as const;

export type MixName = keyof typeof MIX;

/** Stunden je Personentag — dieselbe Annahme wie in der Aufwandsschätzung. */
export const STUNDEN_JE_TAG = 8;

/**
 * Was ein Gewerk mit diesem Rollenmix kostet.
 *
 * Gerechnet wird über die STUNDEN, nicht über einen Tagessatz je Rolle: Ein
 * Tagessatz wäre eine zweite Stelle, an der die Acht-Stunden-Annahme steckt,
 * und zwei Stellen laufen auseinander.
 */
export function kostenFuerTage(tage: number, mix: Rollenmix): number {
  const stunden = tage * STUNDEN_JE_TAG;
  let summe = 0;
  for (const r of ROLLENSAETZE) summe += stunden * mix[r.rolle] * r.eurProStunde;
  return summe;
}

/** Der Mischsatz eines Rollenmix, in Euro je Stunde. */
export function mischsatz(mix: Rollenmix): number {
  let s = 0;
  for (const r of ROLLENSAETZE) s += mix[r.rolle] * r.eurProStunde;
  return s;
}

/** Wie viele Stunden je Rolle anfallen — für die Aufschlüsselung in der Übersicht. */
export function stundenJeRolle(tage: number, mix: Rollenmix): Record<Rolle, number> {
  const stunden = tage * STUNDEN_JE_TAG;
  return {
    cto: stunden * mix.cto,
    senior: stunden * mix.senior,
    junior: stunden * mix.junior,
  };
}
