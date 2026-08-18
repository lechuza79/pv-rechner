import { expect, type Page } from "@playwright/test";

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
    pfad: "/balkonkraftwerk-rechner",
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


// ─── Geteilte Schritte durch einen Flow ──────────────────────────────────────
//
// Diese beiden Helfer lagen bis zum 18.08.2026 in flows.spec.ts und standen
// damit nur dem Flow-Läufer zur Verfügung. Genau das ist schiefgegangen: Als der
// Flow-Umbau die Vorauswahl aus jedem Schritt nahm (Betreiber-Vorgabe — kein
// Schritt startet vorbelegt), klickten die älteren Browser-Tests weiter nur
// „Weiter" und blieben am ausgegrauten Knopf hängen. Drei Tests standen
// daraufhin rot auf main, und die Ursache lag nicht in dem, was sie prüfen.
//
// Wer einen Flow durchklickt, nimmt diese Helfer — nicht eine eigene Kopie.

/**
 * Ein Schritt kann MEHRERE Fragen tragen — im PV-Rechner etwa Personenzahl und
 * Nutzungsprofil nebeneinander. Nach der Wahl in der einen Frage bleibt Weiter
 * dann zu Recht gesperrt, weil die andere noch offen ist.
 *
 * Diese Funktion beantwortet die übrigen Fragen des Schritts mit ihrer jeweils
 * ersten Option. Die Fragen unterscheidet sie an `data-flow-group` (OptionCard);
 * ohne das Attribut gehören alle Optionen zur selben Frage und es passiert
 * nichts.
 *
 * BEWUSSTE GRENZE: Variiert wird nur die Frage, aus der die Hauptwahl kam — die
 * übrigen bekommen immer ihre erste Option. Sonst multiplizieren sich die Wege
 * je Schritt (4 Personen × 4 Profile = 16 statt 8), ohne dass die Kombination am
 * Verhalten des Flows etwas ändert; was die Werte inhaltlich ergeben, prüfen die
 * Rechen-Tests.
 */
export async function uebrigeFragenBeantworten(page: Page) {
  const offene = await page.locator("[data-flow-option]:visible").evaluateAll((els) => {
    const beantwortet = new Set(
      els.filter((e) => e.getAttribute("aria-pressed") === "true").map((e) => e.getAttribute("data-flow-group") || ""),
    );
    const ersteJeGruppe = new Map<string, string>();
    for (const e of els) {
      const gruppe = e.getAttribute("data-flow-group") || "";
      if (beantwortet.has(gruppe) || ersteJeGruppe.has(gruppe)) continue;
      ersteJeGruppe.set(gruppe, e.getAttribute("data-flow-option") || "");
    }
    return [...ersteJeGruppe.values()];
  });
  for (const label of offene) await waehle(page, label);
}

/**
 * Wählt eine Option und wartet, bis sie als gewählt markiert ist.
 *
 * Das Warten ist der Kern: Nach dem Seitenaufruf steht das servergerenderte
 * HTML schon da, die React-Handler aber noch nicht. Ein Klick in diesem Fenster
 * verpufft — der Läufer meldete daraufhin „Weiter bleibt gesperrt, obwohl
 * gewählt ist" für Optionen, die von Hand einwandfrei funktionieren. Ein festes
 * Wartezeit-Pflaster wäre auf langsamen Rechnern wieder brüchig; die Rückmeldung
 * der Oberfläche selbst ist das verlässliche Signal.
 */
export async function waehle(page: Page, label: string) {
  const option = page.locator(`[data-flow-option="${label.replace(/"/g, '\\"')}"]:visible`).first();
  await expect(option).toBeEnabled({ timeout: 15_000 });
  // Wiederholen, nicht warten: Der Knopf ist ab dem servergerenderten HTML da
  // und anklickbar, reagiert aber erst, wenn React ihn übernommen hat. Ein
  // einzelner Klick in dieses Fenster ist verloren — längeres Warten danach
  // holt ihn nicht zurück, weil das Ereignis nie einen Empfänger hatte.
  try {
    await expect(async () => {
      // Das Klick-Timeout ist der Kern und nicht Kosmetik — BLOCKER.
      //
      // Ohne eigenes Timeout erbt click() den TEST-Timeout, nicht die 20 s der
      // Wiederhol-Schleife. Wartet Playwright dann auf ein Element, das es für
      // instabil hält (Step-Wechsel animiert 0,3 s, auf einem ausgelasteten
      // Runner länger), frisst der EINE Klick das ganze Budget von toPass — und
      // die Schleife, die genau dafür gebaut wurde, läuft kein einziges Mal an.
      // Gemessen am CI-Lauf vom 18.08.2026: „20 s lang kein aria-pressed=true"
      // bei einem Knopf, der sichtbar und aktiv war und von Hand einwandfrei
      // funktioniert; lokal nicht reproduzierbar, weil dort nichts hängt.
      //
      // Mit kurzem Klick-Timeout wird aus dem einen hängenden Versuch ein halbes
      // Dutzend echter. Ein wirklich blockiertes Element (Overlay davor) fällt
      // weiterhin durch — nur eben nach mehreren Anläufen statt nach einem.
      await option.click({ timeout: 3_000 });
      await expect(option).toHaveAttribute("aria-pressed", "true", { timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
  } catch {
    // Die nackte Meldung von toPass lautet nur „Timeout while waiting on the
    // predicate" — sie sagt weder, WELCHE Option klemmt, noch auf welchem Weg.
    // Bei hunderten Wegen ist das nicht auswertbar, und genau daran hat eine
    // Fehlersuche schon eine Runde verloren.
    const zustand = await option.evaluate((e) => ({
      pressed: e.getAttribute("aria-pressed"),
      sichtbar: (e as HTMLElement).offsetParent !== null,
      deaktiviert: (e as HTMLButtonElement).disabled,
    })).catch(() => null);
    throw new Error(
      `Option „${label}" ließ sich nicht wählen (20 s lang kein aria-pressed=true). ` +
        `Zustand: ${JSON.stringify(zustand)}. ` +
        `Steht dort sichtbar=true und deaktiviert=false, kam der Klick nicht an — ` +
        `dann liegt etwas darüber oder die Seite ist nicht interaktiv geworden.`,
    );
  }
}
