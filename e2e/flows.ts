/**
 * Die Flows, die der Flow-Läufer (flows.spec.ts) erschöpfend durchklickt.
 *
 * Anlass (Betreiber, 13.08.2026): „ich kann unmöglich alle flows einzeln
 * prüfen. können wir dafür einen automatismus einrichten der alle wege
 * durchklickt und sicherstellt dass alle funktionieren?"
 *
 * Zu pflegen ist hier **eine Zeile je Flow** — die Adresse. Alles andere
 * erkennt der Läufer an den Bausteinen: `data-flow-option` (OptionCard) und
 * `data-flow-nav` / `data-flow-next` (FlowNav). Ein Flow, der diese Bausteine
 * nutzt, wird ohne weiteres Zutun vollständig geprüft.
 */

export interface FlowUnterTest {
  name: string;
  pfad: string;
  /** Text, der im Ergebnis stehen muss — beweist, dass der Weg wirklich ankommt
   *  und nicht nur die Knöpfe verschwinden. */
  ergebnisEnthaelt: string;
  /** Beschriftung des Knopfes, der den Flow erst öffnet (Flows im Fenster).
   *  Ohne Angabe steht der Flow direkt auf der Seite. */
  startKnopf?: string;
}

export const FLOWS: FlowUnterTest[] = [
  {
    name: "Förder-Check Frankfurt",
    pfad: "/photovoltaik-foerderung/hessen/frankfurt",
    ergebnisEnthaelt: "Das gilt für dich",
    // Der Check steht nicht offen auf der Seite, sondern startet im Fenster
    // (components/FoerderCheckStarter.tsx). Ohne diesen Knopf findet der Läufer
    // gar keine Navigation und bricht ab, bevor er den ersten Schritt sieht.
    startKnopf: "Förder-Check starten",
  },
  {
    name: "PV-Rechner",
    pfad: "/photovoltaik-rechner",
    ergebnisEnthaelt: "amortisiert sich in",
  },
  {
    name: "PV-Bedarf / Empfehlung",
    pfad: "/pv-bedarf-berechnen",
    ergebnisEnthaelt: "Die Empfehlung basiert auf",
  },
  {
    name: "Wärmepumpen-Rechner",
    pfad: "/waermepumpe-rechner",
    ergebnisEnthaelt: "Deine Wärmepumpen-Prognose",
  },
  {
    name: "Klimaanlagen-Rechner",
    pfad: "/klimaanlage-stromkosten",
    ergebnisEnthaelt: "Deine Klimaanlage im Betrieb",
  },
  {
    name: "Balkonkraftwerk-Rechner",
    pfad: "/balkonkraftwerk/rechner",
    ergebnisEnthaelt: "Deine Empfehlung",
  },
  {
    name: "Einspeisevergütungs-Rechner",
    pfad: "/einspeiseverguetung-rechner",
    ergebnisEnthaelt: "Dein Vergütungssatz",
  },
];

/**
 * Flows, die der Automatismus zwar erkennt, aber noch nicht zu Ende bedienen
 * kann — mit dem Grund und dem, was dafür fehlt.
 *
 * Bewusst hier statt stillschweigend ausgelassen: Ein Flow, der nicht geprüft
 * wird, soll als ungeprüft dastehen.
 *
 * Derzeit leer: Der letzte Eintrag (Einspeisevergütung, Schritt „Wer verbraucht
 * den Strom?“) ist seit dem 17.08.2026 bedienbar — seine Auswahl-Chips tragen
 * dieselbe Kennzeichnung wie eine Auswahlkarte. Wer einen Flow baut, den der
 * Läufer nicht zu Ende klicken kann, trägt ihn hier mit Begründung ein, statt
 * ihn zu verschweigen.
 */
export const NOCH_NICHT_BEDIENBAR: { name: string; pfad: string; grund: string }[] = [];

/**
 * Flows, die den gemeinsamen Navigations-Baustein noch NICHT nutzen und
 * deshalb vom Läufer nicht erfasst werden.
 *
 * Bewusst als sichtbare Liste, nicht als Schweigen: Ein ungeprüfter Flow soll
 * als ungeprüft dastehen. Der Läufer schlägt an, sobald einer davon auf
 * `FlowNav` migriert ist — dann gehört er nach oben und hier heraus.
 *
 * Leer seit dem 17.08.2026: Die fünf Rechner (PV, Bedarf, Wärmepumpe, Klima,
 * Balkon) nutzen den gemeinsamen Baustein und stehen oben in FLOWS. Die Liste
 * bleibt als Ort für den nächsten Flow bestehen, der ohne ihn gebaut wird.
 */
export const NOCH_OHNE_FLOWNAV: { name: string; pfad: string }[] = [];

/**
 * Deckel gegen Kombinationsexplosion. Wird er erreicht, MELDET der Läufer das —
 * eine stille Kürzung würde „alle Wege geprüft" behaupten, ohne es zu tun.
 *
 * 150 statt 300 seit dem 17.08.2026, gemessen an den migrierten Rechnern:
 * Ein Weg kostet gut zwei Sekunden, weil er von vorn aufgebaut wird. 300 Wege
 * überschreiten damit das Zeitlimit eines Flows, und ein abgelaufener Lauf ist
 * schlechter als ein gedeckelter: Er sagt gar nichts, statt etwas.
 *
 * Was das für die Abdeckung heißt — offen und nicht schöngerechnet:
 *   PV-Rechner            192 mögliche Wege → gedeckelt
 *   Klimaanlage           144 → vollständig
 *   PV-Bedarf              64 → vollständig
 *   Einspeisevergütung     60 → vollständig
 *   Balkonkraftwerk        28 → vollständig
 *   Wärmepumpe          ~1600 (2 × 8 × 5 × 4 × 5) → gedeckelt, knapp 10 %
 *
 * Bei den beiden tiefen Flows prüft der Läufer also einen Ausschnitt. Das ist
 * eine Grenze des „jede Kombination"-Ansatzes, keine Nachlässigkeit: Vollständig
 * wären es bei fünf Schritten tausende Wege. Wer die Abdeckung dort wirklich
 * braucht, muss die Strategie ändern (jede OPTION mindestens einmal statt jeder
 * Kombination) — nicht diesen Deckel hochsetzen, sonst laufen die Tests wieder ab.
 */
export const MAX_WEGE_JE_FLOW = 150;
