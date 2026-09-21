import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { selbstabrufe, ohneKommentare, eigeneAdressBezeichner } from "../selbstabruf-pruefung";

/**
 * KEINE ROUTE RUFT UNSERE EIGENE ÖFFENTLICHE ADRESSE ÜBER HTTP AB.
 *
 * Dreimal in diesem Repo passiert, jedes Mal von außen unsichtbar:
 *  · 08.09.2026 — das Vorschaubild holte seine Schrift so; vierzehn Stunden
 *    lang war jede geteilte Adresse ein leeres Bild, ausgeliefert mit HTTP 200
 *    und einem Jahr Zwischenspeicherung.
 *  · 20.09.2026 — die Startseiten-Erzeugung holte ihre Daten so; sieben
 *    Serverfehler zwischen 07:30 und 08:57, gemeldet als
 *    `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`.
 *  · latent — die Ausgabenbremse meldete so, also ausgerechnet das, was nach
 *    dem Bauplan ihrer Datei nie stumm ausfallen darf.
 *
 * Die Regel stand danach an zwei Stellen und erzwang nichts: als Kommentar in
 * der Szenendaten-Route und als Prüfung für GENAU EINE Datei im
 * Vorschaubild-Test. Deshalb hier über alle Routen — dieselbe Bauart wie der
 * Einheiten- und der Schriftgrößen-Wächter.
 *
 * Geprüft wird die VERWENDUNG (ein Abruf, dessen ZIEL aus unserer eigenen
 * Adresse gebaut ist), nicht das Vorkommen einer Domain: Die große Mehrheit
 * der Treffer auf „solar-check.io" sind Links in Mails, Anzeigen und
 * Weiterleitungen, und die sind völlig in Ordnung. Die Regex aufzuweichen ist
 * nie die Lösung; eine Ausnahme kommt mit ausgeschriebenem Grund hierher.
 */

/** Ausnahmen mit Grund. Leer — und das soll so bleiben. */
const AUSNAHMEN: Record<string, string> = {};

function routenDateien(): string[] {
  const wurzel = join(process.cwd(), "app");
  const gefunden: string[] = [];
  const lauf = (d: string) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) lauf(p);
      else if (/^route\.tsx?$/.test(e)) gefunden.push(p);
    }
  };
  lauf(wurzel);
  return gefunden;
}

describe("Kein Abruf der eigenen Adresse aus einer Route", () => {
  const dateien = routenDateien();

  it("findet überhaupt Routen — sonst prüft der Wächter nichts", () => {
    // Ohne diese Zeile wäre ein kaputter Verzeichnisdurchlauf ein GRÜNER Lauf.
    expect(dateien.length).toBeGreaterThan(50);
  });

  it("keine Route holt sich über HTTP von uns selbst", () => {
    const funde: string[] = [];
    for (const f of dateien) {
      const kurz = f.slice(f.indexOf("/app/") + 1);
      if (AUSNAHMEN[kurz]) continue;
      for (const s of selbstabrufe(readFileSync(f, "utf8"))) {
        funde.push(`${kurz}:${s.zeile} → ${s.text}`);
      }
    }
    expect(
      funde,
      `Abruf der eigenen Adresse aus einer Route — der Bot-Schutz beantwortet ihn mit HTML:\n${funde.join("\n")}`,
    ).toEqual([]);
  });
});

describe("Die Erkennung selbst", () => {
  // Ohne diese Richtung wäre nicht zu unterscheiden, ob oben nichts DA ist
  // oder ob die Erkennung nichts SIEHT.
  it("erkennt den Fehler vom 20.09.2026 im Wortlaut", () => {
    const alt = `export async function GET(req: NextRequest) {
      const r = await fetch(req.nextUrl.origin + "/api/energy/generation", { signal: AbortSignal.timeout(8000) });
    }`;
    expect(selbstabrufe(alt)).toHaveLength(1);
  });

  it("erkennt den Fehler vom 08.09.2026 (Schrift über die eigene Adresse)", () => {
    expect(selbstabrufe(`const f = await fetch(new URL("/fonts/x.ttf", req.nextUrl.origin));`)).toHaveLength(1);
  });

  it("erkennt eine Adresse, die oben als Konstante steht und unten nur benannt wird", () => {
    const q = `const ALERT_URL = "https://solar-check.io/api/alert";
      const res = await fetch(ALERT_URL, { method: "POST" });`;
    expect(selbstabrufe(q)).toHaveLength(1);
  });

  it("erkennt sie auch über die Umgebungsvariable der Basis-Adresse", () => {
    const q = `const basis = process.env.NEXT_PUBLIC_BASE_URL || "https://x.invalid";
      await fetch(basis + "/api/y");`;
    expect(selbstabrufe(q)).toHaveLength(1);
  });

  it("hält einen LINK auf unsere Adresse für keinen Abruf", () => {
    // Der häufigste Fall im Repo: Mail-Texte, Anzeigen, Weiterleitungen.
    const q = `const BASE = "https://solar-check.io"; const seite = \`\${BASE}\${slug}\`;`;
    expect(selbstabrufe(q)).toEqual([]);
  });

  it("hält unsere Adresse im RUMPF eines fremden Abrufs für keinen Abruf", () => {
    const q = `await fetch(fremdeApi, { body: JSON.stringify({ zurueck: "https://solar-check.io/x" }) });`;
    expect(selbstabrufe(q)).toEqual([]);
  });

  it("hält einen Kommentar, der den Fehler beschreibt, für keinen Fehler", () => {
    expect(selbstabrufe(`// nie fetch(req.nextUrl.origin + "/x")\nconst a = 1;`)).toEqual([]);
    expect(ohneKommentare(`/* fetch(req.nextUrl.origin) */ const a = 1;`)).not.toMatch(/fetch/);
  });

  it("verwechselt eine fremde Adresse nicht mit unserer", () => {
    expect(selbstabrufe(`await fetch("https://api.energy-charts.info/public_power");`)).toEqual([]);
    expect(eigeneAdressBezeichner(`const X = "https://api.energy-charts.info";`)).toEqual([]);
  });
});

describe("Die Startseiten-Erzeugung ruft den Handler auf, statt sich selbst", () => {
  afterEach(() => { vi.resetModules(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("macht keinen einzigen HTTP-Abruf und liefert die Daten des Handlers", async () => {
    // Die Strukturprüfung oben sagt, dass im Quelltext kein Selbstabruf STEHT.
    // Diese hier sagt, dass zur Laufzeit auch wirklich keiner PASSIERT — und
    // dass der Alias dabei die Daten des Handlers durchreicht statt leer zu
    // laufen. Eine der beiden allein hätte den Fehler nicht gefangen.
    const handler = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ ts: "x" }], source: "Fraunhofer ISE / Energy-Charts" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.doMock("../../app/api/energy/generation/route", () => ({ GET: handler }));
    const netz = vi.fn();
    vi.stubGlobal("fetch", netz);

    const { GET } = await import("../../app/homepage-energy/route");
    const { NextRequest } = await import("next/server");
    const antwort = await GET(new NextRequest("https://solar-check.io/homepage-energy"));

    expect(netz, "die Route hat einen HTTP-Abruf gemacht").not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(antwort.status).toBe(200);
    expect((await antwort.json()).source).toBe("Fraunhofer ISE / Energy-Charts");
    expect(antwort.headers.get("cache-control")).toContain("s-maxage=300");
  });

  it("reicht den Abfrageteil NICHT an den Handler weiter", async () => {
    // Der alte Abruf holte den nackten Pfad, die Startseite bekam also immer
    // dieselbe eine Antwort. Würde hier die eingehende Anfrage durchgereicht,
    // wäre aus dem Alias eine zweite, ungewollte Parameterfläche geworden.
    const gesehen: string[] = [];
    vi.doMock("../../app/api/energy/generation/route", () => ({
      GET: async (r: { nextUrl: URL }) => {
        gesehen.push(r.nextUrl.search);
        return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
      },
    }));
    vi.stubGlobal("fetch", vi.fn());

    const { GET } = await import("../../app/homepage-energy/route");
    const { NextRequest } = await import("next/server");
    await GET(new NextRequest("https://solar-check.io/homepage-energy?hours=1&country=fr"));

    expect(gesehen).toEqual([""]);
  });

  it("antwortet mit 502, wenn der Handler nicht liefert", async () => {
    vi.doMock("../../app/api/energy/generation/route", () => ({
      GET: async () => new Response("nope", { status: 503 }),
    }));
    vi.stubGlobal("fetch", vi.fn());
    const { GET } = await import("../../app/homepage-energy/route");
    const { NextRequest } = await import("next/server");
    const antwort = await GET(new NextRequest("https://solar-check.io/homepage-energy"));
    expect(antwort.status).toBe(502);
  });
});
