import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";

// Breiter Rundgang: jede Seite einmal aufrufen und auf Laufzeitfehler prüfen.
//
// Warum es diesen Test zusätzlich zu den Flow-Tests gibt:
//
// 1. Ein kaputtes Client-Bauteil liefert weiterhin HTTP 200. Der Gesundheits-
//    check misst Statuscode und Antwortzeit — beide bleiben grün, während im
//    Browser eine leere Fläche oder eine Fehlergrenze steht. Sichtbar ist das
//    nur an der Fehlerkonsole. Beim Sprung auf React 19 (Juli 2026) war das die
//    wahrscheinlichste Bruchstelle, und nichts hätte sie gefunden.
//
// 2. Die vier Flow-Tests decken sechs Adressen ab. Ungedeckt waren: alle
//    Embed-Widgets — also ausgerechnet das, was wir an Kommunen verteilen —,
//    beide Atlas-Routen, die Förder-, Ratgeber-, Klima- und Balkonseiten.
//
// Bewusst flach: Der Rundgang klickt nichts durch (dafür sind die Flow-Tests
// da), er stellt nur die Frage „läuft diese Seite überhaupt sauber an?". Damit
// bleibt er schnell genug, um bei jedem Push mitzulaufen.

// Der Rundgang öffnet gut 30 Adressen, die der Entwicklungsserver einzeln erst
// beim ersten Aufruf übersetzt. Das dauert pro Route mehrere Sekunden und hat
// nichts mit der Seite zu tun — mit dem Standard-Zeitlimit fallen deshalb
// Seiten durch, die völlig in Ordnung sind. Das Limit gilt bewusst nur für
// diese Datei; die Flow-Tests bleiben streng.
test.describe.configure({ timeout: 90_000 });

/** Fehler, die nichts über unseren Code aussagen. Bewusst eng gehalten —
 *  eine großzügige Liste macht den Test wertlos, ohne dass es auffällt. */
const IGNORIEREN = [
  /favicon/i,
  // Externe Datenquellen (Energy-Charts, Open-Meteo, PVGIS) sind im Testlauf
  // nicht garantiert erreichbar und antworten unter Last mit 429. Das ist ein
  // Befund über den Anbieter, nicht über uns — die Seiten müssen einen
  // Ladezustand zeigen und genau das prüfen die Flow-Tests.
  /energy-charts|open-meteo|pvgis|re\.jrc\.ec\.europa\.eu/i,
  /Failed to load resource: the server responded with a status of (429|5\d\d)/i,
  // Vercel Analytics meldet im Entwicklungsmodus, dass es nichts sendet.
  /Vercel Web Analytics/i,
];
// Bewusst NICHT ignoriert: Supabase-Fehler. Die Werkbank hat echte
// Zugangsdaten (ci.yml), also ist ein Datenbankfehler hier ein echter Befund —
// ihn wegzufiltern hätte genau die Klasse verdeckt, für die es den Rundgang gibt.

function istEchterFehler(msg: ConsoleMessage): boolean {
  if (msg.type() !== "error") return false;
  const text = msg.text();
  return !IGNORIEREN.some((re) => re.test(text));
}

/** Ruft eine Seite auf und gibt zurück, was dabei schiefging. */
async function rundgang(page: Page, pfad: string) {
  const fehler: string[] = [];
  page.on("console", (msg) => {
    if (istEchterFehler(msg)) fehler.push(`Konsole: ${msg.text()}`);
  });
  // Nicht abgefangene Ausnahmen erscheinen NICHT zwingend als Konsolenfehler —
  // ohne diesen Zweig würde ein harter Absturz im Browser durchrutschen.
  page.on("pageerror", (err) => fehler.push(`Absturz: ${err.message}`));

  const antwort = await page.goto(pfad, { waitUntil: "domcontentloaded" });
  expect(antwort?.status(), `${pfad} antwortet nicht mit 200`).toBe(200);

  // Kurz laufen lassen: die meisten Client-Bauteile rendern erst nach dem
  // ersten Datenabruf, und genau dort bricht ein Versionssprung.
  await page.waitForTimeout(1200);
  return fehler;
}

/** Die Fehlergrenze fängt Abstürze ab und zeigt eine Ersatzfläche — die Seite
 *  ist dann formal in Ordnung und inhaltlich kaputt. */
async function zeigtFehlergrenze(page: Page): Promise<boolean> {
  const treffer = page.getByText(/etwas ist schiefgelaufen|ein fehler ist aufgetreten|application error/i);
  return (await treffer.count()) > 0;
}

// ─── Datenbank verfügbar? ────────────────────────────────────────────────────
//
// Fast jede Seite mit Zahlen liest Supabase — nicht nur die offensichtlichen
// (Atlas, Förderseiten), sondern auch Ratgeber, Datenstand, Zubau und die
// Erzeugungs-Widgets. Der erste Versuch, das je Seite zu markieren, lag prompt
// daneben. Deshalb gilt die Frage für den GANZEN Rundgang: ohne Datenbank hat
// er keine Aussagekraft und wird geschlossen übersprungen, statt ein Dutzend
// irreführender Fehlschläge zu erzeugen.
//
// Die Werkbank bekommt dieselben Zugangsdaten, die der Gesundheitscheck dort
// längst benutzt (ci.yml) — der Rundgang läuft also bei jedem Push vollständig.
// Der Übersprung ist reines Sicherheitsnetz für den Fall, dass die Geheimnisse
// fehlen; er meldet sich dann laut, weil ein grüner Lauf, der nichts geprüft
// hat, schlimmer ist als ein roter.
//
// Bewusst zur Laufzeit gefragt statt über eine Umgebungsvariable: Der
// Testprozess sieht .env.local gar nicht, eine Env-Prüfung würde also auch
// lokal überspringen und wäre damit wertlos.
let datenbankDa: boolean | null = null;

async function datenbankVerfuegbar(page: Page): Promise<boolean> {
  if (datenbankDa !== null) return datenbankDa;
  // Mehrere Versuche, bevor „keine Datenbank" feststeht: Der Entwicklungsserver
  // übersetzt die Route beim ersten Aufruf und antwortet dann noch nicht. Ein
  // einzelner Fehlversuch würde stillschweigend ALLE datenbankgestützten Seiten
  // überspringen — ein grüner Lauf, der nichts geprüft hat, ist schlimmer als
  // ein roter.
  for (let versuch = 0; versuch < 3; versuch++) {
    try {
      const res = await page.request.get("/api/atlas/gemeinde?plz=97204", { timeout: 30_000 });
      const json = (await res.json()) as { hits?: unknown[] };
      if (res.ok() && Array.isArray(json.hits) && json.hits.length > 0) {
        datenbankDa = true;
        return true;
      }
    } catch {
      // nächster Versuch
    }
    await page.waitForTimeout(2000);
  }
  datenbankDa = false;
  // Sichtbar machen: ein Überspringen darf nicht unbemerkt zur Gewohnheit werden.
  console.log("[Rundgang] Keine Datenbank erreichbar — datenbankgestützte Seiten werden übersprungen.");
  return false;
}

const SEITEN: { pfad: string; erwartet: RegExp }[] = [
  // Rechner, die kein Flow-Test abdeckt
  { pfad: "/klimaanlage-stromkosten", erwartet: /klima|kühl/i },
  { pfad: "/balkonkraftwerk-rechner", erwartet: /balkon/i },
  // Atlas — beide Routen, inkl. einer echten Gemeindeseite
  { pfad: "/solar-atlas", erwartet: /atlas|solaranlagen/i },
  { pfad: "/solar-atlas/bayern", erwartet: /bayern/i },
  { pfad: "/solar-atlas/bayern/landkreis-wuerzburg/hoechberg", erwartet: /höchberg/i },
  // Förderseiten, beide Ebenen
  { pfad: "/photovoltaik-foerderung", erwartet: /förder/i },
  { pfad: "/photovoltaik-foerderung/bayern", erwartet: /bayern/i },
  { pfad: "/photovoltaik-foerderung/bayern/wuerzburg", erwartet: /würzburg/i },
  // Ratgeber — die Seiten, die live gerechnete Beispiele enthalten
  { pfad: "/ratgeber", erwartet: /ratgeber/i },
  { pfad: "/ratgeber/lohnt-sich-pv-mit-speicher", erwartet: /speicher/i },
  { pfad: "/ratgeber/gasheizung-oder-waermepumpe", erwartet: /wärmepumpe|gasheizung/i },
  { pfad: "/ratgeber/waermepumpe-foerderung-2026", erwartet: /wärmepumpe/i },
  // Datenseiten
  { pfad: "/photovoltaik-zubau-deutschland", erwartet: /zubau/i },
  { pfad: "/atomstrom-import", erwartet: /atomstrom|kernstrom/i },
  { pfad: "/langzeit-strommix", erwartet: /strommix/i },
  { pfad: "/datenstand", erwartet: /stand|daten/i },
];

// Die Embed-Widgets sind das Produkt, das wir an Kommunen verteilen — sie
// laufen fremd eingebettet, wo wir keine Fehlermeldung mehr sehen.
const EMBEDS: { pfad: string }[] = [
  { pfad: "/embed/strommix-anteil" },
  { pfad: "/embed/erzeugung" },
  { pfad: "/embed/erzeugung-mini" },
  { pfad: "/embed/kennzahl?metric=leistung" },
  { pfad: "/embed/gemeinde-solar?ags=09679147" },
  { pfad: "/embed/gemeinde-erneuerbare?ags=09679147" },
  { pfad: "/embed/gemeinde-solarleistung?ags=09679147" },
  { pfad: "/embed/region-anlagentyp?bl=13" },
  { pfad: "/embed/region-solarleistung?bl=13" },
  { pfad: "/embed/simulation?plz=10115" },
  { pfad: "/embed/pv-zubau-deutschland" },
  { pfad: "/embed/ee-ampel" },
  { pfad: "/embed/karte" },
  { pfad: "/embed/foerder-check" },
  { pfad: "/embed/gruengas-heizkosten" },
  { pfad: "/embed/zubau-erneuerbare-atom" },
  { pfad: "/embed/strommix" },
];

test.describe("Rundgang: Seiten laufen ohne Laufzeitfehler an", () => {
  for (const { pfad, erwartet } of SEITEN) {
    test(`Seite ${pfad}`, async ({ page }) => {
      test.skip(!(await datenbankVerfuegbar(page)), "Ohne Datenbank hat der Rundgang keine Aussagekraft.");
      const fehler = await rundgang(page, pfad);
      expect(await zeigtFehlergrenze(page), `${pfad} zeigt die Fehlergrenze statt Inhalt`).toBe(false);
      await expect(page.locator("body")).toContainText(erwartet);
      expect(fehler, `${pfad} meldet Laufzeitfehler`).toEqual([]);
    });
  }
});

test.describe("Rundgang: Embed-Widgets laufen ohne Laufzeitfehler an", () => {
  for (const { pfad } of EMBEDS) {
    test(`Widget ${pfad}`, async ({ page }) => {
      test.skip(!(await datenbankVerfuegbar(page)), "Ohne Datenbank hat der Rundgang keine Aussagekraft.");
      const fehler = await rundgang(page, pfad);
      expect(await zeigtFehlergrenze(page), `${pfad} zeigt die Fehlergrenze statt Inhalt`).toBe(false);
      // Widgets haben keine gemeinsame Überschrift — geprüft wird, dass
      // überhaupt etwas gezeichnet wurde und die Fläche nicht leer bleibt.
      // Warten statt fester Pause: Die Erzeugungs-Widgets holen ihre Zahlen
      // live und sind nach einer Sekunde noch leer — eine feste Pause hätte
      // hier einen Fehler gemeldet, wo keiner ist.
      await expect(page.locator("body"), `${pfad} rendert eine leere Fläche`).not.toHaveText("", {
        timeout: 20_000,
      });
      expect(fehler, `${pfad} meldet Laufzeitfehler`).toEqual([]);
    });
  }
});
