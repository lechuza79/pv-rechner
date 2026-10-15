// ─── Märkte: welches Land meint ein Wert, ein Lauf, eine Seite? ─────────────
//
// WARUM ES DAS BRAUCHT (26.09.2026): Prüfstand und Wächter-Register führen
// heute 19 Werte und 19 Läufe, und beide identifizieren über eine Zeichenkette
// — der Prüfstand über `feld` ("DEFAULT_PRICES.validFrom"), das Register über
// `id` und `tag`. Das trägt genau so lange, wie es einen Markt gibt.
//
// Beim zweiten Markt kollidiert es, und zwar STILL: Ein Schweizer Strompreis
// und ein deutscher heißen an derselben Stelle gleich, `pruefEintraege()` löst
// über den ersten Treffer auf, und einer der beiden verschwindet aus jeder
// Übersicht. Kein Typfehler, kein roter Test, keine kaputte Seite — nur ein
// Wert, den ab dann niemand mehr prüft. Das ist die Fehlerklasse, gegen die
// dieses Projekt seine Wächter überhaupt gebaut hat.
//
// Deshalb kommt die Dimension VOR dem zweiten Markt hinein, nicht mit ihm:
// Nachrüsten hieße, sie an einem Bestand einzuziehen, der bereits kollidiert.
//
// DIE ENTSCHEIDUNG DAHINTER — was hier ausdrücklich NICHT steht: eine
// gemeinsame Terminlogik über Märkte. Ein deutscher EEG-Stichtag und ein
// Schweizer Quartalstermin des Bundesamts haben nichts miteinander zu tun; sie
// in einen Rhythmus zu zwingen behauptete eine Gleichheit, die es nicht gibt.
// Jeder Markt trägt seine eigenen Rhythmen, Fristen und Toleranzen — geteilt
// wird die Mechanik, nicht der Kalender.

/**
 * Die Märkte, die dieses Projekt kennt.
 *
 * Die Reihenfolge ist die der Erhebung vom 26.09.2026
 * (`docs/marktstart-bestandsaufnahme.md`): Deutschland ist live, die übrigen
 * vier sind die Märkte, für die Anlagendaten je Gemeinde geprüft, offen und
 * kommerziell nutzbar vorliegen. Ein Markt steht hier, sobald an ihm gearbeitet
 * wird — nicht erst beim Livegang; sonst hätte die erste Zeile Code zu ihm
 * keinen Platz, an den sie gehört.
 */
export const MAERKTE = ["de", "ch", "nl", "fr", "pt"] as const;

export type Markt = (typeof MAERKTE)[number];

/**
 * Ohne Angabe gilt Deutschland.
 *
 * Damit bleibt jeder bestehende Eintrag in Prüfstand und Register unverändert
 * gültig — die Dimension kostet keinen einzigen geänderten Bestandseintrag. Der
 * Preis ist, dass ein vergessenes `markt` still als deutsch durchgeht; dagegen
 * steht die Eindeutigkeitsprüfung in `lib/__tests__/markt-dimension.test.ts`,
 * nicht die Hoffnung, dass niemand es vergisst.
 */
export const MARKT_VORGABE: Markt = "de";

/** Der Markt eines Eintrags, mit der Vorgabe aufgelöst. */
export function marktVon(eintrag: { markt?: Markt }): Markt {
  return eintrag.markt ?? MARKT_VORGABE;
}

/**
 * Der Schlüssel, unter dem ein geprüfter Wert eindeutig ist.
 *
 * NICHT das Feld allein: Zwei Märkte dürfen denselben Feldnamen tragen (und
 * werden es, wo dieselbe Config-Form je Land existiert), und genau dort entsteht
 * sonst die stille Verwechslung.
 */
export function pruefSchluessel(markt: Markt, feld: string): string {
  return `${markt}:${feld}`;
}

const NAMEN: Record<Markt, string> = {
  de: "Deutschland",
  ch: "Schweiz",
  nl: "Niederlande",
  fr: "Frankreich",
  pt: "Portugal",
};

/** Für Meldungen und Übersichten — ausgeschrieben, nicht als Kürzel. */
export function marktName(markt: Markt): string {
  return NAMEN[markt];
}

/**
 * Die Kennung, unter der ein Lauf seinen Bericht ablegt.
 *
 * Deutschland behält seinen Tag unverändert — jede abgelegte Zeile der letzten
 * Monate trägt ihn, und ein umbenannter Tag hieße, die Ablage beginnt bei null
 * und jeder Lauf sähe für seine Toleranzfrist wie ausgefallen aus. Für jeden
 * weiteren Markt hängt das Kürzel hinten an.
 */
export function marktTag(tag: string, markt: Markt): string {
  return markt === MARKT_VORGABE ? tag : `${tag}-${markt}`;
}
