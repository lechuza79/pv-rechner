import { expect, type Page } from "@playwright/test";
import { waehle, weiterKlicken, uebrigeFragenBeantworten } from "./flows";

/**
 * Der Ergebnis-Läufer: bedient die ERGEBNIS-Oberfläche der Rechner und prüft,
 * dass sie wirklich reagiert.
 *
 * Anlass (Betreiber, 23.08.2026, nach dem Dachform-Fehler): „die tests sollten
 * klicken wie ein echter nutzer, damit wir fehler im flow finden ohne jede
 * kombination selbst klicken zu müssen."
 *
 * Der Flow-Läufer (e2e/flows.ts) endet, sobald ein Ergebnis erscheint — alles
 * danach war ungeprüft. Und das ist die Fläche, auf der der Nutzer die Zeit
 * verbringt und auf der die Zahlen stehen: Szenario-Reiter, aufklappbare
 * Abschnitte, „rechnet mit"-Schalter, editierbare Werte.
 *
 * KEINE eigenen Testmarker. Diese Bausteine sind längst semantisch beschriftet
 * — `role="switch"` mit `aria-checked`, `role="tab"` mit `aria-selected`,
 * Kopfzeilen mit `aria-expanded`, editierbare Werte mit `aria-label="… bearbeiten"`.
 * Wer wie ein Nutzer bedienen will, greift genau daran an; ein zusätzliches
 * `data-flow-*` wäre eine zweite Wahrheit, die beim nächsten Feld vergessen wird.
 */

export interface ErgebnisUnterTest {
  name: string;
  /** Adresse: entweder ein Deep-Link direkt ins Ergebnis oder der Flow-Einstieg. */
  pfad: string;
  /** Text, der im Ergebnis stehen muss — sonst prüft der Lauf eine leere Seite. */
  enthaelt: string;
  /**
   * Die KERNZAHLEN dieses Ergebnisses — das, was ein Nutzer als Ergebnis liest.
   *
   * Warum das nicht ohne Rechner-Wissen geht: Ein Abdruck über alle Zahlen der
   * Seite ist zu weich. Gemessen am 24.08.2026 mit einem absichtlich
   * wirkungslos gemachten Schalter — der Lauf blieb GRÜN, weil sich die
   * Zusammenfassungszeile des Abschnitts mitbewegte. „Irgendeine Zahl hat sich
   * geändert" ist eben nicht „das Ergebnis hat sich geändert".
   */
  kernzahlen: RegExp[];
  /**
   * Warum dieses Ergebnis NICHT per Adresse erreichbar ist — dann klickt der
   * Lauf sich hin und die Geteilter-Link-Prüfung entfällt mit Begründung.
   * Angemeldet statt verschwiegen: Ein Rechner ohne teilbares Ergebnis ist ein
   * Produktbefund, kein Grund, die Prüfung stillschweigend auszulassen.
   */
  ohneTeilenLink?: string;
}

export const ERGEBNISSE: ErgebnisUnterTest[] = [
  {
    name: "PV-Rechner",
    pfad: "/photovoltaik-rechner?a=1&s=1&p=2&n=1&ht=2&da=0&az=sued",
    enthaelt: "amortisiert sich in",
    kernzahlen: [/amortisiert sich in\s*([\d.,]+)/, /Gewinn[^\n]{0,20}25[^\n]{0,40}?([\d.,]+)\s*€/],
  },
  {
    name: "PV-Bedarf / Empfehlung",
    pfad: "/pv-bedarf-berechnen?view=ergebnis&haus=efh&dach=satteldach&az=sued&personen=4",
    enthaelt: "Die Empfehlung basiert auf",
    kernzahlen: [/([\d.,]+)\s*kWp/, /Amortisation in ca\.\s*([\d.,]+)/, /Gewinn nach 25 Jahren:\s*\+?([\d.,]+)/],
  },
  {
    name: "Wärmepumpen-Rechner",
    pfad: "/waermepumpe-rechner",
    enthaelt: "Deine Wärmepumpen-Prognose",
    kernzahlen: [/⌀ Ersparnis\/Jahr\s*\n?\s*([\d.,]+)\s*€/, /CO₂ 20 J\s*\n?\s*([\d.,]+)\s*t/],
    ohneTeilenLink:
      "Der Wärmepumpen-Rechner kennt keinen Teilen-Link — sein Ergebnis lässt sich weder " +
      "verschicken noch neu laden, es lebt nur im Browser. Das steht als offener Punkt in der " +
      "Roadmap (Arbeitspaket Wärmepumpe: Share-URL und Dashboard-Save). Bis dahin klickt sich " +
      "dieser Lauf hin.",
  },
];

/**
 * Sich bis zum Ergebnis durchklicken — mit der jeweils ersten Option jedes
 * Schritts. Für Rechner ohne Teilen-Link.
 *
 * Nutzt die geteilten Helfer des Flow-Läufers, statt eigene Klicks zu bauen:
 * Ein Klick, der auf eine noch nicht übernommene Seite trifft, verpufft stumm —
 * die Helfer wiederholen ihn und weisen den Zustandswechsel nach.
 */
export async function bisZumErgebnis(page: Page) {
  for (let schritt = 0; schritt < 12; schritt++) {
    if ((await page.locator("[data-flow-nav]:visible").count()) === 0) return;
    const erste = await page.locator("[data-flow-option]:visible").first().getAttribute("data-flow-option").catch(() => null);
    if (erste) await waehle(page, erste);
    await uebrigeFragenBeantworten(page);
    await weiterKlicken(page);
  }
}

/**
 * Der Fingerabdruck eines Ergebnisses: alle Zahlen des Seiteninhalts.
 *
 * Bewusst NUR Zahlen und bewusst OHNE Kopf- und Fußbereich. Die Kopfzeile trägt
 * die aktuelle Sonnenleistung, die sich von selbst ändert — sie im Abdruck zu
 * führen hieße, dass ein Lauf zufällig rot wird, weil eine Wolke vorbeizog.
 * Und Zahlen statt Volltext, weil es hier um die RECHNUNG geht: Ein Schalter,
 * der nur eine Beschriftung umstellt, aber keine Zahl bewegt, ist genau der
 * Befund, den dieser Lauf sucht.
 */
export async function ergebnisFingerabdruck(page: Page): Promise<string> {
  return page.evaluate(() => {
    const wurzel = document.body.cloneNode(true) as HTMLElement;
    for (const weg of wurzel.querySelectorAll("header, footer, nav, script, style")) weg.remove();
    const text = (wurzel as HTMLElement).innerText || "";
    return (text.match(/\d[\d.,]*/g) ?? []).join("¦");
  });
}

/**
 * Wartet, bis das Ergebnis wirklich steht — sonst misst der Abdruck den Aufbau.
 *
 * ZWEI Bedingungen, und die erste ist die wichtige: Die Marktpreise kommen
 * NACHGELADEN. Bis sie da sind, rechnet die Seite mit dem Rückfallwert im Code
 * und zeigt trotzdem ein vollständiges, plausibles Ergebnis. Genau daran ist
 * der erste Lauf in der Cloud gescheitert (24.08.2026): Vor dem Neuladen stand
 * ein Anlagenpreis von 14.000 €, danach der live geholte von 13.500 € — der
 * Vergleich meldete einen Unterschied, den kein Nutzer je sieht. Lokal fiel es
 * nicht auf, weil die Antwort dort in Millisekunden da ist.
 *
 * Deshalb: erst auf die Preis-Antwort warten (weich — kommt sie aus dem
 * Zwischenspeicher, gibt es gar keine Anfrage), dann auf einen Abdruck, der
 * sich eine Sekunde lang nicht mehr bewegt.
 */
const RUHIGE_PROBEN = 4;

export async function ergebnisBereit(page: Page, enthaelt: string) {
  await page
    .waitForResponse((r) => r.url().includes("/api/prices"), { timeout: 8_000 })
    .catch(() => null);
  await expect(page.getByText(enthaelt, { exact: false }).first()).toBeVisible({ timeout: 30_000 });
  // Der Preis ist die bekannte Ursache, aber nicht die einzige nachgeladene
  // Größe (der PV-Rechner holt auch seinen Standort-Ertrag). Ein zusätzlicher
  // Halt, bis überhaupt nichts mehr unterwegs ist, kostet auf einer fertigen
  // Seite nichts und deckt die übrigen ab.
  await page.waitForLoadState("networkidle").catch(() => {});
  let vorher = await ergebnisFingerabdruck(page);
  let ruhig = 0;
  await expect(async () => {
    await page.waitForTimeout(300);
    const jetzt = await ergebnisFingerabdruck(page);
    // Der Merker wird IMMER fortgeschrieben, auch wenn die Prüfung gleich
    // scheitert. Vorher stand er ERST NACH dem `expect` — das wirft, also blieb
    // er für immer auf dem allerersten Abdruck stehen, während die Seite längst
    // auf ihrem zweiten stand: Jede Wiederholung verglich dieselben zwei
    // verschiedenen Stände, und der Lauf konnte nicht mehr grün werden. Genau
    // EIN Wechsel ist hier aber der Normalfall — auf ihn zu warten ist der
    // Zweck dieser Funktion. Alle neun Fehlschläge vom 24.08.2026 trugen
    // deshalb zeichengleiche Werte und meldeten „Zeitlimit überschritten".
    ruhig = jetzt === vorher ? ruhig + 1 : 0;
    vorher = jetzt;
    expect(jetzt.length).toBeGreaterThan(0);
    // MEHRERE ruhige Proben, nicht eine: Eine einzelne beweist nur, dass sich
    // in ihrem Fenster nichts bewegt hat — und so sieht eine Seite auch aus,
    // während ein Abruf noch unterwegs ist.
    expect(ruhig, `Ergebnis bewegt sich noch: ${jetzt}`).toBeGreaterThanOrEqual(RUHIGE_PROBEN);
  }).toPass({ timeout: 30_000 });
}

/** Die Ein/Aus-Schalter des Ergebnisses, mit Beschriftung und Stellung. */
export async function schalter(page: Page) {
  return page.locator('[role="switch"]:visible').evaluateAll((els) =>
    els.map((e) => ({
      label: e.getAttribute("aria-label") ?? "",
      an: e.getAttribute("aria-checked") === "true",
    })),
  );
}

/**
 * Die Szenario-Reiter, mit Beschriftung und Stellung.
 *
 * Angesprochen werden sie über ihre POSITION, nicht über den Namen: Die
 * Beschriftung steht im Stylesheet auf Großbuchstaben, der sichtbare Text ist
 * also „PESSIMISTISCH", der zugängliche Name „Pessimistisch +1 %/Jahr". Wer
 * nach dem sichtbaren Text sucht, findet nichts — der erste Lauf hing genau
 * daran drei Minuten an einem Reiter, der die ganze Zeit dastand.
 */
export async function reiter(page: Page) {
  return page.locator('[role="tab"]:visible').evaluateAll((els) =>
    els.map((e) => ({
      label: (e as HTMLElement).innerText.trim().split("\n")[0],
      aktiv: e.getAttribute("aria-selected") === "true",
    })),
  );
}

/**
 * Die aufklappbaren Abschnitte des INHALTS, mit Überschrift und Zustand.
 *
 * Kopf- und Fußbereich bleiben außen vor: Dort klappen ebenfalls Dinge auf
 * (Menü, Sonnenanzeige), und der erste Lauf meldete prompt einen „Abschnitt
 * 13%" — das war die Sonnenleistung in der Kopfzeile. Ein Läufer, der die
 * Navigation für Ergebnis-Inhalt hält, produziert Befunde über sich selbst.
 */
export async function abschnitte(page: Page) {
  return page.locator("button[aria-expanded]:visible").evaluateAll((els) =>
    els
      .filter((e) => !e.closest("header, footer, nav"))
      .map((e) => ({
        titel: (e as HTMLElement).innerText.trim().split("\n")[0],
        offen: e.getAttribute("aria-expanded") === "true",
      })),
  );
}

/**
 * Die Kernzahlen des Ergebnisses — das, was ein Nutzer als Ergebnis liest.
 *
 * Der schärfere Maßstab neben dem Fingerabdruck über die ganze Seite: Für die
 * Frage „bewirkt dieser Schalter etwas?" zählt nur, ob sich das ERGEBNIS
 * bewegt. Findet ein Muster nichts, steht dort ausdrücklich „fehlt" — eine
 * verschwundene Kernzahl ist ein Befund, kein Grund zum Stillschweigen.
 */
export async function kernzahlen(page: Page, muster: RegExp[]): Promise<string> {
  const text = await page.evaluate(() => {
    const wurzel = document.body.cloneNode(true) as HTMLElement;
    for (const weg of wurzel.querySelectorAll("header, footer, nav, script, style")) weg.remove();
    return (wurzel as HTMLElement).innerText || "";
  });
  const treffer = muster.map((m) => text.match(m)?.[1] ?? null);
  // Eine Kernzahl, die das Muster nicht findet, ist ein BEFUND — und zwar ein
  // gefährlicher: Fehlen sie alle, vergleicht jede Prüfung „fehlt" mit „fehlt"
  // und meldet Gleichstand, wo in Wahrheit gar nichts gemessen wurde. Genau so
  // lief die Wärmepumpen-Prüfung am 25.08.2026 ins Leere (das Muster suchte
  // eine Formulierung, die es auf der Seite nie gab).
  if (treffer.every((t) => t === null)) {
    throw new Error(
      `Keines der Kernzahl-Muster trifft auf dieses Ergebnis zu — dann misst der Lauf nichts. ` +
        `Entweder heißt die Zahl inzwischen anders, oder sie steht nicht mehr da.`,
    );
  }
  return treffer.map((t) => t ?? "fehlt").join("¦");
}

/**
 * Die editierbaren Werte des Ergebnisses — Zahlen, die ein Nutzer mit eigenen
 * Annahmen überschreiben kann (Anschaffungskosten, Strompreis, Eigenverbrauch …).
 *
 * Erkannt an ihrer Beschriftung („… bearbeiten"), nicht an einem Testmarker:
 * Das ist derselbe Griff, mit dem ein Screenreader sie findet.
 */
export async function editierbareWerte(page: Page) {
  return page.locator('[role="button"][aria-label$="bearbeiten"]:visible').evaluateAll((els) =>
    els
      .filter((e) => !e.closest("header, footer, nav"))
      .map((e) => ({ label: e.getAttribute("aria-label") ?? "", text: (e as HTMLElement).innerText.trim() })),
  );
}

/**
 * Einen editierbaren Wert überschreiben — anklicken, tippen, mit Enter
 * bestätigen. Genau der Weg, den die Bedienung vorsieht.
 */
export async function wertSetzen(page: Page, label: string, wert: string) {
  const feld = page.locator(`[role="button"][aria-label="${label.replace(/"/g, '\\"')}"]:visible`).first();
  await feld.click();
  const eingabe = page.locator("input[inputmode='decimal']:visible").first();
  await expect(eingabe).toBeVisible({ timeout: 5_000 });
  await eingabe.fill(wert);
  await eingabe.press("Enter");
}
