import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

  // GSC KÖNNTE das serverseitig (INCLUDING_REGEX auf der PAGE-Dimension) — der
  // frühere Kommentar im Modul behauptete das Gegenteil und war widerlegt. Wir
  // filtern trotzdem hier, weil EIN Abruf mehrere Präfixe bedient. Der Test
  // hält also eine ENTSCHEIDUNG fest, keine Unmöglichkeit: Wer umstellt, muss
  // ihn bewusst anfassen und kann es nicht nebenbei tun.
  it("filtert im Code, nicht serverseitig — und zieht dafür die Seiten-Dimension mit", async () => {
    await anfragen({ urlPrefixFilter: ["https://solar-check.io/solar-atlas"] });
    expect(gesendet.dimensionFilterGroups).toBeUndefined();
    // Ohne die Seiten-Dimension gäbe es nichts zu filtern.
    expect(gesendet.dimensions).toEqual(["query", "page"]);
  });
});

// Die Route wird BEDIENT, nicht gelesen. Die erste Fassung dieses Blocks
// verglich den Quelltext als Text und prüfte, ob im Anfragen-Zweig `prefixRaw`
// statt `prefixPath` steht. Ein adversarialer Prüfer hat sie gegen zehn
// Fassungen laufen lassen: Sie blieb GRÜN, wenn man die beiden Variablen wieder
// zu einer mit Vorgabewert zusammenzieht — also unter genau der Regression,
// gegen die sie geschrieben war — und wurde ROT bei vier folgenlosen
// Umformatierungen (einfache Anführungszeichen, ein Prettier-Umbruch, ein
// Kommentar mit dem Wort darin, eine Umbenennung). Ein Wächter, der das
// Gegenteil von dem tut, was er soll, ist schlimmer als keiner.
describe("Die Route reicht nur ein AUSDRÜCKLICH gesetztes Präfix durch", () => {
  const uebergeben: Record<string, unknown>[] = [];

  async function ruf(qs: string) {
    uebergeben.length = 0;
    vi.resetModules();
    process.env.CRON_SECRET = "geheim";
    vi.doMock("../../lib/gsc-search-analytics", () => ({
      gscConfigured: () => true,
      querySearchAnalyticsByQuery: async (o: Record<string, unknown>) => {
        uebergeben.push(o);
        return [];
      },
      querySearchAnalyticsByPage: async (o: Record<string, unknown>) => {
        uebergeben.push(o);
        return [];
      },
    }));
    const { GET } = await import("../../app/api/seo/gsc/route");
    const res = await GET(
      new Request(`https://solar-check.io/api/seo/gsc?${qs}`, {
        headers: { authorization: "Bearer geheim" },
      }),
    );
    expect(res.status).toBe(200);
    return uebergeben[0] ?? {};
  }

  it("ohne prefix filtert die Anfragen-Sicht NICHT — sonst verengt der Vorgabewert zwei bestehende Läufe", async () => {
    const o = await ruf("dim=query&days=90");
    expect(o.urlPrefixFilter).toBeUndefined();
  });

  it("mit prefix filtert sie auf genau diese Familie", async () => {
    const o = await ruf("dim=query&days=28&prefix=/photovoltaik-foerderung");
    expect(o.urlPrefixFilter).toEqual([
      "https://solar-check.io/photovoltaik-foerderung",
      "https://www.solar-check.io/photovoltaik-foerderung",
    ]);
  });

  it("ein leeres prefix zählt als nicht gesetzt", async () => {
    const o = await ruf("dim=query&days=28&prefix=");
    expect(o.urlPrefixFilter).toBeUndefined();
  });

  it("die MENGEN-Sicht behält ihren Vorgabewert /solar-atlas", async () => {
    const o = await ruf("days=28");
    expect(o.urlPrefixFilter).toEqual([
      "https://solar-check.io/solar-atlas",
      "https://www.solar-check.io/solar-atlas",
    ]);
  });
});
