import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Der Auslöser (12.09.2026): Der Wellen-Monitor sollte die Rollentrennung
// zwischen Atlas- und Förderseiten messen — "wie viele Förder-Anfragen tragen
// kein Geld-Wort". Er rief die Anfragen-Sicht zweimal auf, einmal mit
// prefix=/solar-atlas und einmal mit prefix=/photovoltaik-foerderung, und bekam
// ZWEIMAL DIESELBE domainweite Liste: 669 Anfragen, Wert für Wert identisch.
//
// Der Filter wurde still ignoriert. Keine Fehlermeldung, keine leere Antwort —
// zwei plausible Zahlenreihen, aus denen sich eine Rollentrennung "ablesen"
// ließ, die die Messung nie belegt hat. Dieselbe Fehlerklasse wie ein Test, der
// den Fehler mit sich selbst vergleicht.
//
// Die Gegenrichtung ist die gefährlichere und steht deshalb mit im Test: Die
// Route hat für prefix einen Vorgabewert (/solar-atlas). Würde der bei der
// Anfragen-Sicht greifen, verengte er zwei bestehende Läufe (Release-Messung
// und Kreisfrei-Messung, beide ohne prefix) still auf den Atlas — ihre Zahlen
// blieben plausibel und wären falsch.

const zeilen = [
  {
    keys: ["photovoltaik osnabrück", "https://solar-check.io/photovoltaik-foerderung/niedersachsen/osnabrueck"],
    clicks: 0,
    impressions: 1,
    ctr: 0,
    position: 3,
  },
  { keys: ["solaratlas bayern", "https://solar-check.io/solar-atlas/bayern"], clicks: 0, impressions: 62, ctr: 0, position: 18.9 },
  { keys: ["pv rechner", "https://solar-check.io/photovoltaik-rechner"], clicks: 2, impressions: 40, ctr: 0.05, position: 9 },
  {
    keys: ["förderung bonn", "https://www.solar-check.io/photovoltaik-foerderung/nordrhein-westfalen/bonn"],
    clicks: 0,
    impressions: 5,
    ctr: 0,
    position: 7,
  },
];

vi.mock("../google-auth", () => ({
  getServiceAccountCredentials: () => ({ client_email: "t@t", private_key: "k" }),
  getGoogleAccessToken: async () => "token",
}));
vi.mock("../gsc-site", () => ({
  GSC_API_BASE: "https://example.invalid",
  resolveGscSiteUrl: async () => "sc-domain:solar-check.io",
}));

let gesendet: Record<string, unknown> = {};

beforeEach(() => {
  gesendet = {};
  vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => {
    gesendet = JSON.parse(init.body);
    return { ok: true, json: async () => ({ rows: zeilen }) } as unknown as Response;
  });
});
afterEach(() => vi.unstubAllGlobals());

async function anfragen(opts: Record<string, unknown>) {
  const { querySearchAnalyticsByQuery } = await import("../gsc-search-analytics");
  return querySearchAnalyticsByQuery({ startDate: "2026-08-12", endDate: "2026-09-09", ...opts });
}

describe("Anfragen-Sicht: Präfix-Filter", () => {
  it("ohne Filter kommt die ganze Domain zurück", async () => {
    expect(await anfragen({})).toHaveLength(4);
  });

  it("filtert auf eine Seitenfamilie — und liefert NICHT dieselbe Menge wie ohne Filter", async () => {
    const foerder = await anfragen({
      urlPrefixFilter: [
        "https://solar-check.io/photovoltaik-foerderung",
        "https://www.solar-check.io/photovoltaik-foerderung",
      ],
    });
    const atlas = await anfragen({ urlPrefixFilter: ["https://solar-check.io/solar-atlas"] });

    expect(foerder.map((r) => r.query).sort()).toEqual(["förderung bonn", "photovoltaik osnabrück"]);
    expect(atlas.map((r) => r.query)).toEqual(["solaratlas bayern"]);

    // Der eigentliche Befund war, dass beide Abrufe GLEICH aussahen.
    expect(foerder).not.toEqual(atlas);
    expect(foerder.length + atlas.length).toBeLessThan(zeilen.length);
  });

  it("nimmt die www-Schreibweise mit", async () => {
    const r = await anfragen({ urlPrefixFilter: ["https://www.solar-check.io/photovoltaik-foerderung"] });
    expect(r.map((x) => x.query)).toEqual(["förderung bonn"]);
  });

  it("ein leeres Präfix-Feld filtert nicht (sonst wäre jede Antwort leer)", async () => {
    expect(await anfragen({ urlPrefixFilter: [] })).toHaveLength(4);
  });

  it("der Präfix wird NICHT an GSC geschickt — GSC kennt keinen Präfix-Filter", async () => {
    await anfragen({ urlPrefixFilter: ["https://solar-check.io/solar-atlas"] });
    expect(gesendet.dimensionFilterGroups).toBeUndefined();
    // Die Seiten-Dimension muss dabei sein, sonst gibt es nichts zu filtern.
    expect(gesendet.dimensions).toEqual(["query", "page"]);
  });
});

describe("Die Route reicht nur ein AUSDRÜCKLICH gesetztes Präfix durch", () => {
  const quelle = () => readFileSync(join(__dirname, "..", "..", "app", "api", "seo", "gsc", "route.ts"), "utf8");

  it("benutzt den Rohwert, nicht den mit Vorgabewert belegten", () => {
    const s = quelle();
    // Der Zweig wird an seinen SYNTAKTISCHEN Enden abgegrenzt, nicht über ein
    // Zeilen- oder Zeichenfenster: Ein Fenster reicht in den Mengen-Zweig
    // hinein, wo prefixPath zu Recht steht, und der Test wird dann rot, ohne
    // dass etwas kaputt ist.
    const ab = s.indexOf('=== "query"');
    const bis = s.indexOf("querySearchAnalyticsByPage(", ab);
    expect(ab).toBeGreaterThan(-1);
    expect(bis).toBeGreaterThan(ab);
    const zweig = s.slice(ab, bis);

    expect(zweig).toMatch(/urlPrefixFilter:\s*prefixRaw/);
    // prefixPath trägt den Vorgabewert /solar-atlas und darf hier NICHT stehen.
    expect(zweig).not.toContain("prefixPath");
  });

  it("der Vorgabewert bleibt der Mengen-Sicht vorbehalten", () => {
    const s = quelle();
    expect(s).toMatch(/const prefixPath = prefixRaw \|\| "\/solar-atlas"/);
    expect(s).toMatch(/urlPrefixFilter: \[`\$\{BASE\}\$\{prefixPath\}`/);
  });
});
