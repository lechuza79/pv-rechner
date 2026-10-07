/**
 * Wie heißt diese Ebene für einen Besucher? — je Markt.
 *
 * DIE STRUKTUR IST GEMEINSAM, DIE BESCHRIFTUNG NICHT. Die vier Ebenen-Werte
 * ("de", "bundesland", "landkreis", "gemeinde") sind technische Bezeichner und
 * werden je Markt wiederverwendet; sie umzubenennen kostet 112 Stellen in 33
 * Dateien plus eine Migration und liefert keine richtigere Zahl (gemessen am
 * 07.10.2026, Begründung in `lib/ch-register.ts`). Was ein Besucher LIEST, kommt
 * dagegen aus dem Markt: Die erste Untergliederung heißt in Deutschland
 * Bundesland und in der Schweiz Kanton, die zweite Landkreis bzw. Bezirk.
 * Dieselbe Trennung wie bei Zahl und Einheit.
 *
 * DER MARKT STEHT IM SCHLÜSSEL, es gibt keine Marktspalte und keinen Parameter,
 * den ein Aufrufer vergessen könnte: Ein Schweizer Schlüssel beginnt mit "ch",
 * ein deutscher ist rein numerisch (der Bund ist der leere String). Deshalb
 * genügt überall der Regionsschlüssel, den die Stelle ohnehin schon hat.
 *
 * ZWEI WÖRTER JE EBENE, UND DAS IST ABSICHT: Im Fließtext steht „Landkreis", in
 * einer Zählung „12 Kreise" — die kurze Form ist dort eine Entscheidung über
 * Platz (sie trägt Rangzeilen und Kacheln), keine Nachlässigkeit. Ein einziges
 * Wort je Ebene würde diese Unterscheidung einziehen. Für die Schweiz fallen
 * beide Formen zusammen, dort gibt es nichts zu kürzen.
 */
import { CH_EBENEN_NAMEN, istChSchluessel } from "./ch-register";

export type Markt = "de" | "ch";

/** Zu welchem Markt gehört dieser Regionsschlüssel? */
export function marktVonSchluessel(regionKey: string | null | undefined): Markt {
  return regionKey && istChSchluessel(regionKey) ? "ch" : "de";
}

/** Die ausgeschriebene Form — für Fließtext, Krümelspur und Suchtreffer. */
const LANG: Record<Markt, Record<string, string>> = {
  de: { de: "Deutschland", bundesland: "Bundesland", landkreis: "Landkreis", gemeinde: "Gemeinde" },
  ch: {
    de: CH_EBENEN_NAMEN.de,
    bundesland: CH_EBENEN_NAMEN.bundesland,
    landkreis: CH_EBENEN_NAMEN.landkreis,
    gemeinde: CH_EBENEN_NAMEN.gemeinde,
  },
};

/** Die kurze Form mit Mehrzahl — für Zählungen, Kacheln und Rangzeilen. */
const KURZ: Record<Markt, Record<string, [string, string]>> = {
  de: {
    de: ["Deutschland", "Deutschland"],
    bundesland: ["Bundesland", "Bundesländer"],
    landkreis: ["Kreis", "Kreise"],
    gemeinde: ["Gemeinde", "Gemeinden"],
  },
  ch: {
    de: ["Schweiz", "Schweiz"],
    bundesland: ["Kanton", "Kantone"],
    landkreis: ["Bezirk", "Bezirke"],
    gemeinde: ["Gemeinde", "Gemeinden"],
  },
};

/**
 * Der ausgeschriebene Name der Ebene.
 *
 * Eine unbekannte Ebene ergibt „Region" — das ist der Zustand, den der Bestand
 * schon kannte, und er ist hier richtig: Lieber ein unverbindliches Wort als
 * eines, das eine Gliederung behauptet, die es nicht gibt.
 */
export function ebenenName(level: string, regionKey?: string | null): string {
  return LANG[marktVonSchluessel(regionKey)][level] ?? "Region";
}

/** Die kurze Form, mit korrektem Numerus (`anzahl === 1` ergibt die Einzahl). */
export function ebenenWort(level: string | null, regionKey?: string | null, anzahl?: number): string {
  const paar = KURZ[marktVonSchluessel(regionKey)][level ?? ""] ?? KURZ[marktVonSchluessel(regionKey)].gemeinde;
  return anzahl === 1 ? paar[0] : paar[1];
}
