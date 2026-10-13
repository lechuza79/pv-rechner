import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { calc, calcEigenverbrauchExakt, calcWeightedFeedIn, estimateCost, batteryReplaceCost } from "../calc";
import { DEFAULT_PRICES } from "../prices-config";
import { DEFAULT_FEED_IN } from "../feedin-config";
import { NATIONAL_AVG_YIELD, SCENARIOS, YEARS } from "../constants";
import { buildFundingExamples } from "../funding-examples";
import { faqAmortisationSpanne, homeFaq, pvSpeicherFaq } from "../faq";
const pvSpeicherFaqTexte = () => pvSpeicherFaq().map(e => (e as { a: string }).a).join("\n");
import { greengasMusterVariants } from "../greengas-muster";
import { klimaSchnellschaetzungKwh } from "../aircon";
import { DEFAULT_AIRCON_CONFIG } from "../aircon-config";
import { heatPumpScenarioAdj } from "../heatpump";

const ROOT = join(__dirname, "..", "..");
const lies = (p: string) => readFileSync(join(ROOT, p), "utf8");

// ─── Rechenmodell-Council 05.09.2026, Prüfer „Text gegen Zahl" ──────────────
//
// Jeder Fall hier ist derselbe Fehlertyp: Die Beschriftung sagt etwas anderes,
// als die Zahl daneben misst — oder zwei Stellen zeigen für dieselbe Rechnung
// verschiedene Zahlen. Keiner war im Browser als Fehler erkennbar.

describe("Das Teilen-Vorschaubild rechnet wie die Seite", () => {
  const og = lies("app/api/og/route.tsx");
  // Seit 12.09.2026 steht die Rechnung des Bildes in lib/og-rechnung.ts, und sie
  // folgt dem Szenario-Reiter des Links statt fest „realistisch" (Council
  // 12.09.2026; Verhalten geprüft in og-rechnung.test.ts).
  const ogRechnungQuelle = lies("lib/og-rechnung.ts");
  it("nimmt den Strompreis-Anstieg aus dem Szenario, nicht getippt", () => {
    expect(og + ogRechnungQuelle).not.toMatch(/stromSteigerung:\s*0\.0\d/);
    expect(ogRechnungQuelle).toMatch(/stromSteigerung: szenario\.strom/);
  });
  it("average savings includes investment, while the result labels its first-year value", () => {
    // Seite: (total + kosten) / YEARS. Im Bild stand total / 25 — um die
    // Investition zu klein, Faktor 2 im Standardfall.
    expect(ogRechnungQuelle).toMatch(/\(result\.total \+ kosten\) \/ YEARS/);
    expect(lies("app/(site)/photovoltaik-rechner/_components/PvResultOverview.tsx")).toMatch(/label="Vorteil im 1. Jahr" value=\{Math.round\(result.years\[1\].j\)/);
    expect(og).toContain("Ø ERSPARNIS / JAHR");
  });
  it("beschriftet den Euro-Betrag als Gewinn", () => {
    expect(og).not.toMatch(/RENDITE 25 J/);
    expect(og).toMatch(/GEWINN 25 J/);
  });
});

describe("Die gespeicherte Berechnung trägt den Stand nach 25 Jahren", () => {
  it("speichert total, nicht den Stand nach 24 Jahren", () => {
    const seite = lies("app/(site)/photovoltaik-rechner/rechner.tsx");
    expect(seite).not.toMatch(/rendite25j: Math\.round\(sel\.data\.years\[YEARS - 1\]/);
    expect(seite.match(/rendite25j: Math\.round\(sel\.data\.total\)/g)?.length).toBe(2);
  });
  it("und die beiden Stände unterscheiden sich wirklich", () => {
    const r = calc({ kwp: 10, kosten: 14000, strompreis: 0.312, eigenverbrauch: 30, einspeisung: 7.7, stromSteigerung: 0.02, ertragKwp: 1050, monthly: null });
    expect(r.years[YEARS - 1].kum).not.toBe(r.total);
    expect(r.years[YEARS].kum).toBe(r.total);
  });
});

describe("Die Szenario-Reiter nennen, was sie ändern", () => {
  it("jeder Reiter mit Eigenverbrauchs-Sprung sagt das im Text", () => {
    for (const s of SCENARIOS) {
      if (s.evDelta !== 0) expect(s.explain, s.id).toMatch(/Prozentpunkte/);
    }
  });
});

describe("Monatsbalken zeigen das gerechnete Dach", () => {
  it("skalieren mit dem Verhältnis Dachertrag zu Optimum", () => {
    const seite = lies("app/(site)/photovoltaik-rechner/rechner.tsx");
    expect(seite).toMatch(/const balkenFaktor = oErtrag > 0 \? effErtrag \/ oErtrag : 1;/);
    expect(seite).toMatch(/Math\.round\(m \* kwp \* balkenFaktor\)/);
  });
});

describe("Wärmepumpen-Block im PV-Ergebnis: Gas folgt dem Szenario gegenläufig", () => {
  it("reicht den Gas-Anstieg des Szenarios durch statt fester 2 %", () => {
    const stats = lies("components/HeatPumpRunningComparison.tsx");
    expect(stats).toMatch(/inflation: gasSteigerung,/);
    expect(stats).not.toMatch(/inflation: 0\.02,/);
    expect(lies("components/PvConsumerComparison.tsx")).toMatch(/gasSteigerung=\{inflation.gasInflation\}/);
    expect(lies("components/PvConsumerComparison.tsx")).toContain("heatPumpScenarioAdj(scenario)");
  });

  // Council 13.10.2026: the heat-pump scenario ids mean the opposite for
  // electricity ("pessimistic" = +4.4 %/a there, +0.4 %/a in the PV calculator).
  // Passing the PV id through made the same result page price household
  // electricity at +0.4 %/a and heat-pump electricity on the same meter at +4.4 %/a.
  it("Heizstrom am Hauszähler steigt wie der Hausstrom des PV-Szenarios", () => {
    const src = lies("components/PvConsumerComparison.tsx");
    expect(src).not.toMatch(/stromSteigerung=\{inflation\.stromInflation\}/);
    expect(src).toMatch(/SCENARIOS\.find\(s=>s\.id===scenario\)/);
    expect(src).toMatch(/stromSteigerung=\{householdRate\}/);
    // The opposition is real, so the guard is not vacuous.
    expect(heatPumpScenarioAdj("pessimistic").stromInflation)
      .toBeGreaterThan(SCENARIOS.find(s => s.id === "pessimistic")!.strom + 0.02);
  });
});

describe("Förderseiten-Beispiele rechnen wie der Rechner", () => {
  it("ziehen den Akkutausch ab", () => {
    const [, mitSpeicher] = buildFundingExamples(1050);
    expect(mitSpeicher.spKwh).toBeGreaterThan(0);
    const ev = calcEigenverbrauchExakt({ personenIdx: 2, nutzungIdx: 1, speicherKwh: mitSpeicher.spKwh, wp: "nein", ea: "nein", eaKm: 15000, kwp: mitSpeicher.kwp, ertragKwp: 1050 });
    const einsp = calcWeightedFeedIn(mitSpeicher.kwp, DEFAULT_FEED_IN.teilUnder10, DEFAULT_FEED_IN.teilOver10);
    const basis = { kwp: mitSpeicher.kwp, kosten: mitSpeicher.netto, strompreis: DEFAULT_PRICES.electricityPrice, eigenverbrauch: ev, einspeisung: einsp, stromSteigerung: DEFAULT_PRICES.electricityIncrease, ertragKwp: 1050, monthly: null };
    const ohne = calc(basis).total;
    const mit = calc({ ...basis, batteryReplace: batteryReplaceCost(mitSpeicher.spKwh) }).total;
    expect(mit).toBeLessThan(ohne);
    expect(mitSpeicher.total).toBe(mit);
  });
});

describe("Die FAQ-Spannen sind gerechnet", () => {
  it("die Startseiten-FAQ nennt die gerechnete Amortisation, keine getippte", () => {
    const s = faqAmortisationSpanne(10);
    expect(s.min).toBeGreaterThan(0);
    expect(s.max).toBeGreaterThanOrEqual(s.standard);
    expect(s.standard).toBeGreaterThanOrEqual(s.min);
    const faq = homeFaq();
    expect(faq[0].a).toContain(`in etwa ${s.standard} Jahren`);
    expect(faq[1].a).toContain(`zwischen ${s.min} und ${s.max} Jahren`);
    expect(faq[0].a).not.toMatch(/9–12/);
    expect(faq[1].a).not.toMatch(/8 und 14/);
  });
  it("der Standardfall der FAQ ist der Standardfall des Rechners", () => {
    // 10 kWp, kein Speicher, 2 Personen (Index 1), „teils zuhause" (Index 1).
    const ev = calcEigenverbrauchExakt({ personenIdx: 1, nutzungIdx: 1, speicherKwh: 0, wp: "nein", ea: "nein", eaKm: 15000, kwp: 10, ertragKwp: NATIONAL_AVG_YIELD });
    const r = calc({ kwp: 10, kosten: estimateCost(10, 0), strompreis: DEFAULT_PRICES.electricityPrice, eigenverbrauch: ev, einspeisung: calcWeightedFeedIn(10, DEFAULT_FEED_IN.teilUnder10, DEFAULT_FEED_IN.teilOver10), stromSteigerung: DEFAULT_PRICES.electricityIncrease, ertragKwp: NATIONAL_AVG_YIELD, monthly: null });
    expect(faqAmortisationSpanne(10).standard).toBe(r.be!.i);
  });
});

describe("Kleine Beschriftungen", () => {
  it("Muster-Haus nennt Megawattstunden mit Komma", () => {
    for (const h of greengasMusterVariants()) expect(h.sub).not.toMatch(/\d\.\d MWh/);
    expect(greengasMusterVariants().some((h) => /\d,\d MWh/.test(h.sub))).toBe(true);
  });
  it("kein Ratgeber stempelt die Renderzeit als Aktualisierungsdatum", () => {
    for (const p of ["lohnt-sich-pv-mit-speicher", "lohnt-sich-pv-ohne-einspeiseverguetung"]) {
      expect(lies(`app/(site)/ratgeber/${p}/page.tsx`)).not.toMatch(/Zuletzt aktualisiert: \{new Date\(\)/);
    }
  });
  it("KfW-Karte zählt Zusagen, keine Heizungen", () => {
    expect(lies("components/KfwFoerderpraxis.tsx")).not.toMatch(/Heizungen einen Zuschuss zugesagt/);
  });
  it("Speicher-Ratgeber zählt die Fragen des Rechners richtig", () => {
    const steps = lies("app/(site)/photovoltaik-rechner/rechner.tsx").match(/const STEPS = \[([^\]]*)\]/)![1].split('",').length;
    expect(steps).toBe(5);
    expect(lies("app/(site)/ratgeber/lohnt-sich-pv-mit-speicher/page.tsx")).toMatch(/Fünf Fragen/);
  });
  it("die Klima-Schnellschätzung ist eine Funktion für Rechner und Empfehlung", () => {
    const kwh = klimaSchnellschaetzungKwh({ rooms: 2, stromPrice: 0.3 });
    expect(kwh).toBeGreaterThan(50);
    expect(klimaSchnellschaetzungKwh({ rooms: 2, cdh: DEFAULT_AIRCON_CONFIG.cdhNational, stromPrice: 0.3 })).toBe(kwh);
    expect(lies("lib/recommend.ts")).toMatch(/klimaSchnellschaetzungKwh/);
    expect(lies("app/(site)/photovoltaik-rechner/rechner.tsx")).toMatch(/klimaSchnellschaetzungKwh\(\{ rooms: klimaRooms/);
  });
});

// Council 13.10.2026 — four labels that said something the number does not measure.
describe("Council 13.10.2026: Beschriftung folgt der Rechnung", () => {
  it("PV- und Balkon-Ergebnis nennen die Summe nach Abzug der Anschaffung Gewinn, nicht Einsparungen", () => {
    const src = lies("components/calculator/ResultOverview.tsx");
    expect(src).not.toMatch(/"Einsparungen"/);
    expect(src).toMatch(/"Gewinn" : "Verlust"\} nach \{years\} Jahren/);
  });
  it("die FAQ behauptet nicht, ohne Speicher rechne sich die Anlage besser", () => {
    // Measured: for small households every storage case yields MORE profit; the
    // recommendation leaves it out by a sizing rule, not by a profit comparison.
    const text = pvSpeicherFaqTexte();
    expect(text).not.toMatch(/ohne Speicher besser/);
    expect(text).not.toMatch(/wirtschaftlich sinnvolle Kombination/);
  });
  it("der Ratgeber sagt nicht „kaum“, wenn es kein Amortisationsjahr gibt, und nennt Minus nicht Gewinn", () => {
    const src = lies("app/(site)/ratgeber/lohnt-sich-pv-ohne-einspeiseverguetung/page.tsx");
    expect(src).not.toMatch(/kaum im Zeitraum/);
    expect(src).toMatch(/ohneRealGewinn >= 0 \?/);
  });
  it("das JAZ-Feld erlaubt keinen Wert, den die Rechnung still auf 4,8 deckelt", () => {
    const calcCap = lies("lib/heatpump.ts").match(/const jaz = Math\.min\(([\d.]+),/)?.[1];
    const fieldMax = lies("app/(site)/waermepumpe-rechner/waermepumpe.tsx").match(/onCommit=\{v => updateSettings\(\{ oJaz: v \}\)\}[^>]*max=\{([\d.]+)\}/)?.[1];
    expect(calcCap).toBeDefined();
    expect(fieldMax).toBe(calcCap);
  });
});
