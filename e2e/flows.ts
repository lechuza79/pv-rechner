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
}

export const FLOWS: FlowUnterTest[] = [
  {
    name: "Förder-Check Frankfurt",
    pfad: "/photovoltaik-foerderung/hessen/frankfurt",
    ergebnisEnthaelt: "Das gilt für dich",
  },
];

/**
 * Flows, die der Automatismus zwar erkennt, aber noch nicht zu Ende bedienen
 * kann — mit dem Grund und dem, was dafür fehlt.
 *
 * Bewusst hier statt stillschweigend ausgelassen: Ein Flow, der nicht geprüft
 * wird, soll als ungeprüft dastehen.
 */
export const NOCH_NICHT_BEDIENBAR: { name: string; pfad: string; grund: string }[] = [
  {
    name: "Einspeisevergütungs-Rechner",
    pfad: "/einspeiseverguetung-rechner",
    grund:
      "Die Auswahlfelder (Monat/Jahr der Inbetriebnahme) bedient der Automatismus " +
      "inzwischen. Es hängt am Schritt „Wer verbraucht den Strom?“: Der Verbrauch " +
      "steht dort als Klick-zum-Ändern-Wert und die Freigabe des Weiter-Knopfes " +
      "hängt an Bedienelementen, die weder Auswahlkarte noch Auswahlfeld sind. " +
      "Nötig: Diesen Schritt auf die geteilten Bausteine umstellen — dieselbe " +
      "Migration, die für PV, Wärmepumpe, Klima und Balkon ohnehin ansteht.",
  },
];

/**
 * Flows, die den gemeinsamen Navigations-Baustein noch NICHT nutzen und
 * deshalb vom Läufer nicht erfasst werden.
 *
 * Bewusst als sichtbare Liste, nicht als Schweigen: Ein ungeprüfter Flow soll
 * als ungeprüft dastehen. Der Läufer schlägt an, sobald einer davon auf
 * `FlowNav` migriert ist — dann gehört er nach oben und hier heraus. Die
 * Migration steht ohnehin an (CLAUDE.md, „Flow-Schritte").
 */
export const NOCH_OHNE_FLOWNAV: { name: string; pfad: string }[] = [
  { name: "PV-Rechner", pfad: "/photovoltaik-rechner" },
  { name: "PV-Bedarf / Empfehlung", pfad: "/pv-bedarf-berechnen" },
  { name: "Wärmepumpen-Rechner", pfad: "/waermepumpe-rechner" },
  { name: "Klimaanlagen-Rechner", pfad: "/klimaanlage-stromkosten" },
  { name: "Balkonkraftwerk-Rechner", pfad: "/balkonkraftwerk-rechner" },
];

/** Deckel gegen Kombinationsexplosion. Wird er erreicht, MELDET der Läufer das —
 *  eine stille Kürzung würde „alle Wege geprüft" behaupten, ohne es zu tun. */
export const MAX_WEGE_JE_FLOW = 300;
