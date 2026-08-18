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
 * Zwei Betriebsarten (Vorgabe des Betreibers, 18.08.2026: möglichst alle
 * Kombinationen testen, bevor ein Nutzer sie trifft):
 *
 *   Standard (jeder Push)         — jede OPTION jedes Schritts und jeder
 *     Zweig, nicht jede Kombination. Schnell und auf dem CI-Runner stabil.
 *   FLOW_ALLE_KOMBINATIONEN=1     — wirklich jede Kombination, ohne die
 *     Erschöpft-Abkürzung. Läuft nächtlich (flows-nightly.yml), wo zwei
 *     Stunden Laufzeit niemanden aufhalten.
 */
export const ALLE_KOMBINATIONEN = !!process.env.FLOW_ALLE_KOMBINATIONEN;

/**
 * Notbremse gegen einen entlaufenen Läufer. Wird sie erreicht, MELDET er das —
 * eine stille Kürzung würde „geprüft" behaupten, ohne es zu tun.
 *
 * Seit dem 18.08.2026 geht der Läufer im Standard-Modus jede OPTION jedes
 * Schritts und jeden Zweig, nicht mehr jede Kombination (Strategiewechsel,
 * begründet in flows.spec.ts an `gehe()`). Damit liegen alle Flows deutlich
 * unter diesem Deckel — er ist kein Abdeckungs-Kompromiss mehr, sondern fängt
 * nur noch den Fall, dass ein künftiger Flow den Läufer in einen Zyklus
 * schickt (etwa ein Schritt, der bei jedem Erreichen andere
 * Optionsbeschriftungen trägt und darum nie als erschöpft erkannt wird).
 *
 * Vorher war er ein echter Abdeckungs-Deckel — und ein irreführender: Die
 * Tiefensuche verbrauchte ihn komplett im ersten Teilbaum, bei der Wärmepumpe
 * (~1600 Kombinationen) wurde so nicht einmal die zweite Option des ERSTEN
 * Schritts je erreicht, während der Lauf „150 Wege geprüft" meldete.
 *
 * Im Alle-Kombinationen-Modus muss er über dem tiefsten Flow liegen
 * (Wärmepumpe ~1600 Kombinationen) — auch dort gilt: erreicht er den Deckel,
 * wird das gemeldet, nicht verschwiegen.
 */
export const MAX_WEGE_JE_FLOW = ALLE_KOMBINATIONEN ? 2500 : 150;


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
/**
 * Klickt Weiter und wartet, bis der Schritt WIRKLICH gewechselt hat.
 *
 * Zwei Arten, wie ein blinder Weiter-Klick verpufft (beide am 18.08.2026 auf
 * ausgelasteten Maschinen gemessen):
 *   - Der Knopf ist noch `aria-disabled` (FlowNav sperrt bewusst so statt mit
 *     `disabled`, damit der Hinweis-Tooltip klickbar bleibt) — der Klick wird
 *     stumm verschluckt. Das passiert, wenn die Freigabe einen React-Commit
 *     später kommt als das aria-pressed der eben gewählten Option.
 *   - Der Klick landet, aber der Läufer prüft nie, ob der Schritt gewechselt
 *     hat, und sucht dann die nächste Option auf dem alten Schritt — die
 *     Fehlermeldung zeigt auf die falsche Stelle.
 *
 * Der Nachweis des Wechsels braucht keine Schritt-Kennung im DOM: Nach der
 * Flow-Konvention startet kein Schritt mit einer Vorauswahl. Der Fingerabdruck
 * aus sichtbaren Optionen UND ihrem Auswahlzustand ändert sich deshalb bei
 * jedem echten Wechsel — selbst wenn zwei Schritte identische Beschriftungen
 * trügen, unterscheidet sie der Auswahlzustand (vorher: eine gewählt, nachher:
 * keine). Verschwindet die Navigation ganz, ist das Ergebnis erreicht — auch
 * ein Wechsel.
 */
export async function weiterKlicken(page: Page) {
  const fingerabdruck = () =>
    page.evaluate(() => {
      const sichtbar = (e: Element) => (e as HTMLElement).offsetParent !== null;
      if (!Array.from(document.querySelectorAll("[data-flow-nav]")).some(sichtbar)) return "kein-flow";
      return Array.from(document.querySelectorAll("[data-flow-option]"))
        .filter(sichtbar)
        .map((e) => `${e.getAttribute("data-flow-option")}=${e.getAttribute("aria-pressed")}`)
        .join("¦");
    });
  const weiter = page.locator("[data-flow-next]:visible").first();
  const vorher = await fingerabdruck();
  try {
    await expect(async () => {
      await expect(weiter).not.toHaveAttribute("aria-disabled", "true", { timeout: 1_000 });
      await weiter.click();
      await expect(async () => {
        expect(await fingerabdruck()).not.toBe(vorher);
      }).toPass({ timeout: 1_500 });
    }).toPass({ timeout: 20_000 });
  } catch {
    const gesperrt = (await weiter.getAttribute("aria-disabled").catch(() => null)) === "true";
    throw new Error(
      `Weiter kam nicht durch: Der Schritt wechselte 20 s lang nicht ` +
        `(Weiter-Knopf ${gesperrt ? "gesperrt (aria-disabled)" : "frei"}).`,
    );
  }
}

export async function waehle(page: Page, label: string) {
  const option = page.locator(`[data-flow-option="${label.replace(/"/g, '\\"')}"]:visible`).first();
  await expect(option).toBeEnabled({ timeout: 15_000 });
  // Wiederholen, nicht warten: Der Knopf ist ab dem servergerenderten HTML da
  // und anklickbar, reagiert aber erst, wenn React ihn übernommen hat. Ein
  // einzelner Klick in dieses Fenster ist verloren — längeres Warten danach
  // holt ihn nicht zurück, weil das Ereignis nie einen Empfänger hatte.
  try {
    await expect(async () => {
      await option.click();
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
        `Zustand: ${JSON.stringify(zustand)}`,
    );
  }
}
