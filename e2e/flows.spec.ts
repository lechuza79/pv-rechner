import { test, expect, type Page } from "@playwright/test";
import { FLOWS, NOCH_OHNE_FLOWNAV, NOCH_NICHT_BEDIENBAR, MAX_WEGE_JE_FLOW } from "./flows";

/**
 * Der Flow-Läufer: klickt JEDEN Weg durch jeden Flow und stellt sicher, dass
 * alle funktionieren.
 *
 * Er kennt keinen einzelnen Flow. Er erkennt an den geteilten Bausteinen, was
 * ein Schritt ist (`data-flow-option`), wo es weitergeht (`data-flow-next`) und
 * wann ein Weg zu Ende ist (keine Navigation mehr da). Ein neuer Flow, der die
 * Bausteine benutzt, wird damit ohne eine Zeile Testcode mitgeprüft.
 *
 * Geprüft wird je Weg:
 *   1. Der Weiter-Knopf ist gesperrt, solange nichts gewählt ist, und wird
 *      danach frei (die Flow-Konvention selbst).
 *   2. Der Weg erreicht ein Ergebnis — kein Schritt führt ins Leere.
 *   3. Kein Konsolenfehler, keine nicht abgefangene Ausnahme unterwegs.
 *
 * Warum das nötig war: Beim Bau des Förder-Checks steckten zwei Fehler in
 * genau diesen Zwischenzuständen — ein Schritt, dessen Weiter-Knopf trotz
 * sichtbarem Wert gesperrt blieb, und eine Auswahl, die ein Programm falsch
 * ausschloss. Beide waren nur durch Durchklicken zu finden, und niemand kann
 * jeden Weg jedes Flows von Hand gehen.
 */

/** Platzhalter im Pfad für einen Schritt, der keine Auswahl hat (Eingabefeld
 *  mit Vorbelegung) — beim Nachstellen wird dort nur Weiter geklickt. */
const VORBELEGT = "(Vorbelegung übernommen)";

interface LaufErgebnis {
  wege: number;
  gedeckelt: boolean;
  fehler: string[];
  /** Bereits fotografierte Zustände — je Zustand genau ein Bild, nicht je Weg. */
  bilder: Set<string>;
}

/**
 * Mit `FLOW_BILDER=<verzeichnis>` legt der Lauf von jedem Zustand ein Bild ab.
 *
 * Anlass (Betreiber, 13.08.2026): „ich kann unmöglich alles permanent
 * durchklicken." Der Läufer klickt ohnehin jeden Zustand an — die Bilder
 * fallen dabei ab. Damit lässt sich das Aussehen nach einer Änderung
 * durchblättern, statt es zu erklicken. Ohne die Variable kostet es nichts.
 */
const BILDER_ORDNER = process.env.FLOW_BILDER;

async function bildAblegen(page: Page, flowName: string, zustand: string, erg: LaufErgebnis) {
  if (!BILDER_ORDNER || erg.bilder.has(zustand)) return;
  erg.bilder.add(zustand);
  const datei = `${flowName}--${zustand || "start"}`.replace(/[^a-zA-Z0-9äöüÄÖÜß-]+/g, "_").slice(0, 120);
  await page.screenshot({ path: `${BILDER_ORDNER}/${datei}.png`, fullPage: false });
}

/**
 * Beschriftungen der wählbaren Optionen im aktuellen Schritt.
 *
 * Gelesen aus dem Attribut, NICHT aus dem sichtbaren Text: Viele Karten führen
 * ein Emoji als erste Zeile, und der Läufer hätte damit „☀️" als Bezeichnung
 * einer Option geführt — nicht wiederfindbar und in Fehlermeldungen wertlos.
 */
async function optionen(page: Page): Promise<string[]> {
  return page.locator("[data-flow-option]:visible").evaluateAll((els) =>
    els.map((e) => e.getAttribute("data-flow-option") || ""),
  );
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
async function waehle(page: Page, label: string) {
  const option = page.locator(`[data-flow-option="${label.replace(/"/g, '\\"')}"]:visible`).first();
  await expect(option).toBeEnabled({ timeout: 15_000 });
  // Wiederholen, nicht warten: Der Knopf ist ab dem servergerenderten HTML da
  // und anklickbar, reagiert aber erst, wenn React ihn übernommen hat. Ein
  // einzelner Klick in dieses Fenster ist verloren — längeres Warten danach
  // holt ihn nicht zurück, weil das Ereignis nie einen Empfänger hatte.
  await expect(async () => {
    await option.click();
    await expect(option).toHaveAttribute("aria-pressed", "true", { timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
}

async function imFlow(page: Page): Promise<boolean> {
  return (await page.locator("[data-flow-nav]:visible").count()) > 0;
}

/**
 * Geht rekursiv jeden Weg ab dem aktuellen Zustand. `pfad` dient nur der
 * Fehlermeldung — sie muss sagen, WELCHER Weg gebrochen ist, sonst ist ein
 * roter Lauf über hunderte Wege nicht auswertbar.
 */
async function gehe(
  page: Page,
  flowName: string,
  flowPfad: string,
  ergebnisEnthaelt: string,
  pfad: string[],
  erg: LaufErgebnis,
): Promise<void> {
  if (erg.wege >= MAX_WEGE_JE_FLOW) {
    erg.gedeckelt = true;
    return;
  }

  const wahlen = await optionen(page);

  // Kein Schritt mehr: Der Weg muss in einem Ergebnis angekommen sein.
  if (!(await imFlow(page))) {
    erg.wege++;
    await bildAblegen(page, flowName, `ergebnis__${pfad.join("__")}`, erg);
    const text = await page.locator("body").innerText();
    if (!text.includes(ergebnisEnthaelt)) {
      erg.fehler.push(`[${pfad.join(" → ")}] endet ohne Ergebnis (erwartet: "${ergebnisEnthaelt}")`);
    }
    return;
  }

  if (wahlen.length === 0) {
    // Schritte ohne Auswahlkarten gibt es wirklich — etwa eine Datums- oder
    // Größenangabe mit sinnvoller Vorbelegung. Sie sind gültig, solange der
    // Weiter-Knopf offen ist: Genau so geht ein Besucher hindurch, der die
    // Vorbelegung übernimmt. Bleibt er gesperrt, kommt hier niemand weiter —
    // das ist dann ein echter Befund und keine Lücke des Automatismus.
    const weiterHier = page.locator("[data-flow-next]:visible").first();
    if ((await weiterHier.getAttribute("aria-disabled")) === "true") {
      erg.fehler.push(
        `[${pfad.join(" → ")}] Schritt ohne Auswahl UND mit gesperrtem Weiter — hier kommt niemand durch`,
      );
      erg.wege++;
      return;
    }
    await weiterHier.click();
    await page.waitForTimeout(120);
    await gehe(page, flowName, flowPfad, ergebnisEnthaelt, [...pfad, VORBELEGT], erg);
    return;
  }

  const weiter = page.locator("[data-flow-next]:visible").first();

  // Die Flow-Konvention selbst: ohne Auswahl kein Weitergehen.
  if (pfad.length === 0 || wahlen.length > 0) {
    const gesperrt = await weiter.getAttribute("aria-disabled");
    if (gesperrt !== "true") {
      const schonGewaehlt = await page.locator('[data-flow-option][aria-pressed="true"]:visible').count();
      if (schonGewaehlt === 0) {
        erg.fehler.push(`[${pfad.join(" → ")}] Weiter ist frei, obwohl nichts gewählt ist`);
      }
    }
  }

  for (const wahl of wahlen) {
    if (erg.wege >= MAX_WEGE_JE_FLOW) {
      erg.gedeckelt = true;
      return;
    }

    // Jeder Weg beginnt neu von vorn: Zurück-Knöpfe stellen den Zustand nicht
    // zuverlässig wieder her, und ein Läufer, der auf halb aufgeräumten
    // Zuständen weiterläuft, prüft etwas, das kein Nutzer je sieht.
    await page.goto(flowPfad, { waitUntil: "domcontentloaded" });
    for (const vorher of pfad) {
      if (vorher !== VORBELEGT) await waehle(page, vorher);
      await page.locator("[data-flow-next]:visible").first().click();
      await page.waitForTimeout(60);
    }

    await waehle(page, wahl);

    const weiterJetzt = page.locator("[data-flow-next]:visible").first();
    if ((await weiterJetzt.getAttribute("aria-disabled")) === "true") {
      erg.fehler.push(`[${[...pfad, wahl].join(" → ")}] Weiter bleibt gesperrt, obwohl "${wahl}" gewählt ist`);
      erg.wege++;
      continue;
    }

    await weiterJetzt.click();
    await page.waitForTimeout(120);
    await bildAblegen(page, flowName, [...pfad, wahl].join("__"), erg);
    await gehe(page, flowName, flowPfad, ergebnisEnthaelt, [...pfad, wahl], erg);
  }
}

for (const flow of FLOWS) {
  test(`Flow „${flow.name}": jeder Weg führt zu einem Ergebnis`, async ({ page }) => {
    // Erschöpfendes Durchklicken braucht Zeit: Jeder Weg wird von vorn
    // aufgebaut, und im Dev-Server kommt die erste Übersetzung jeder Route
    // dazu. Der Standard von 30 s reicht dafür nicht — er hat den Läufer
    // beim ersten Lauf mitten im Baum abgebrochen.
    test.setTimeout(300_000);
    const konsolenFehler: string[] = [];
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      // Eng gefasste Ausnahme: Next lädt verlinkte Seiten im Voraus. Im
      // Testbuild antwortet die Login-Route darauf nicht, was je Seitenaufruf
      // eine Fehlermeldung erzeugt — bei 72 Wegen über 200 Stück, alle über
      // dieselbe Route und ohne Bezug zum Flow. Die Liste bewusst nicht
      // weiter aufmachen: Ein großzügiger Filter macht die Prüfung wertlos,
      // ohne dass es auffällt.
      if (m.text().includes("Failed to fetch RSC payload")) return;
      // Ebenso das Besucherzähl-Skript: Es wird erst auf Vercel ausgeliefert,
      // lokal antwortet die Adresse mit 404. Betrifft keine Seitenfunktion.
      if (m.text().includes("_vercel/insights")) return;
      if (m.text().includes("Failed to load resource") && m.location().url.includes("_vercel/")) return;
      konsolenFehler.push(m.text());
    });
    page.on("pageerror", (e) => konsolenFehler.push(`Ausnahme: ${e.message}`));

    await page.goto(flow.pfad, { waitUntil: "domcontentloaded" });
    // Flows liegen teils weiter unten auf der Seite — erst prüfen, ob es hier
    // überhaupt einen gibt, sonst schlägt der Test aus dem falschen Grund fehl.
    await expect(page.locator("[data-flow-nav]").first()).toBeVisible({ timeout: 15000 });

    const erg: LaufErgebnis = { wege: 0, gedeckelt: false, fehler: [], bilder: new Set() };
    await bildAblegen(page, flow.name, "01-start", erg);
    await gehe(page, flow.name, flow.pfad, flow.ergebnisEnthaelt, [], erg);

    // Deckel laut wird gemeldet, nicht still hingenommen.
    if (erg.gedeckelt) {
      console.warn(
        `⚠ ${flow.name}: Deckel von ${MAX_WEGE_JE_FLOW} Wegen erreicht — NICHT alle Wege geprüft.`,
      );
    }
    console.log(`  ${flow.name}: ${erg.wege} Wege geprüft`);

    expect(erg.wege, `${flow.name}: kein einziger Weg durchlaufen`).toBeGreaterThan(0);
    expect(erg.fehler, `Gebrochene Wege in „${flow.name}"`).toEqual([]);
    expect(konsolenFehler, `Konsolenfehler in „${flow.name}"`).toEqual([]);
  });
}

test("noch nicht bedienbare Flows sind benannt, nicht verschwiegen", async () => {
  for (const f of NOCH_NICHT_BEDIENBAR) {
    console.warn(`⚠ ${f.name} wird NICHT geprüft: ${f.grund}`);
    expect(f.grund.length, `${f.name}: ohne Begründung ausgetragen`).toBeGreaterThan(40);
  }
});

test("ungeprüfte Flows stehen als ungeprüft da", async ({ page }) => {
  // Sobald ein alter Flow auf den gemeinsamen Navigations-Baustein migriert
  // ist, wird er prüfbar — und muss dann auch geprüft werden. Dieser Test
  // schlägt an, sobald das passiert, damit die Migration nicht dazu führt,
  // dass ein Flow zwar prüfbar wäre, aber niemand ihn in die Liste holt.
  test.setTimeout(120_000);
  const uebersehen: string[] = [];
  const nichtErreichbar: string[] = [];
  for (const f of NOCH_OHNE_FLOWNAV) {
    try {
      await page.goto(f.pfad, { waitUntil: "domcontentloaded", timeout: 20_000 });
    } catch {
      // Eine Seite, die nicht lädt, ist ein Befund des Rundgangs, nicht dieses
      // Tests — hier würde sie nur verschleiern, worum es geht.
      nichtErreichbar.push(f.name);
      continue;
    }
    if ((await page.locator("[data-flow-nav]").count()) > 0) {
      uebersehen.push(`${f.name} (${f.pfad})`);
    }
  }
  if (nichtErreichbar.length > 0) {
    console.warn(`⚠ nicht geladen, daher hier nicht bewertet: ${nichtErreichbar.join(", ")}`);
  }
  expect(
    uebersehen,
    "Diese Flows nutzen den gemeinsamen Baustein inzwischen und gehören in FLOWS " +
      "(e2e/flows.ts), statt weiter als ungeprüft geführt zu werden",
  ).toEqual([]);
});
