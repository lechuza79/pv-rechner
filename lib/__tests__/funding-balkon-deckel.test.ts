import { describe, it, expect } from "vitest";
import { fundingAmount, getFundingProgram, allFundingPrograms, type FundingProgram } from "../funding-programs";
import { DEFAULT_BALKON_CONFIG } from "../balkon-config";

// Ein Zuschuss darf nie mehr sein als der Kaufpreis — BLOCKER (04.09.2026).
//
// Gefunden beim ersten Quellen-Lauf über das Landesprogramm
// Mecklenburg-Vorpommerns: Es zahlt 500 € je Anlage, das billigste Set unseres
// Rechners kostet 300 €. Ohne Deckel rechnete der Balkon-Rechner einem Mieter
// dort eine Anlage aus, die nichts kostet und sich am ersten Tag amortisiert
// hat. Die Richtlinie selbst zieht die Grenze („maximal in Höhe der
// zuwendungsfähigen Ausgaben, sofern diese unter 500 EUR liegen") — unser Modell
// kannte sie nur nicht.
//
// Der Fehler war jahrelang unsichtbar, weil jede andere Pauschale des Katalogs
// (50 bis 200 €) unter dem billigsten Set liegt. Genau deshalb steht der Deckel
// an der Rechenstelle und nicht am Programm: Er soll den NÄCHSTEN Fall fangen,
// nicht diesen.

const basis = {
  id: "t", name: "T", traeger: "T", level: "kommune", region: "T",
  url: "https://example.invalid", stand: "September 2026", status: "aktiv",
  capped: false, verified: true, eligibility: ["privat"],
  coveredCosts: "", rates: [], conditions: [], combinableWith: [],
  foerdert: ["balkon"],
  lastVerified: "2026-09-04", pageSeenAt: "2026-09-04",
} as const;
const prog = (extra: Partial<FundingProgram>): FundingProgram => ({ ...basis, ...extra }) as FundingProgram;
const HEUTE = "2026-09-04";

const guenstigstesSet = Math.min(...DEFAULT_BALKON_CONFIG.sets.map((s) => s.price));

describe("Kein Balkon-Zuschuss über dem Kaufpreis", () => {
  it("die Pauschale wird am Kaufpreis gekappt", () => {
    const p = prog({ balkonPauschale: 500 });
    expect(fundingAmount(p, { technik: "balkon", wattPeak: 500, kosten: 300 }, HEUTE).total).toBe(300);
    expect(fundingAmount(p, { technik: "balkon", wattPeak: 960, kosten: 800 }, HEUTE).total).toBe(500);
  });

  it("auch Staffel und Satz je Wattpeak werden gekappt", () => {
    const staffel = prog({ balkonTiers: [{ upTo: 2000, amount: 500 }] });
    expect(fundingAmount(staffel, { technik: "balkon", wattPeak: 500, kosten: 300 }, HEUTE).total).toBe(300);

    const jeWp = prog({ balkonProWp: 1 });
    expect(fundingAmount(jeWp, { technik: "balkon", wattPeak: 500, kosten: 300 }, HEUTE).total).toBe(300);
  });

  it("gekappt heißt weiterhin berechenbar — nicht „kein Satz“", () => {
    // Sonst verschwände die Zeile aus der Karte, statt einen kleineren Betrag zu
    // zeigen: „lässt sich nicht berechnen" wäre hier eine falsche Auskunft.
    const a = fundingAmount(prog({ balkonPauschale: 500 }), { technik: "balkon", wattPeak: 500, kosten: 300 }, HEUTE);
    expect(a.computable).toBe(true);
  });

  it("für jedes Programm des Katalogs bleibt der Deckel am billigsten Set wirkungslos — außer bei M-V", () => {
    // Die Gegenprobe zur Regel: Sie ändert heute genau einen Betrag. Wächst der
    // Katalog um eine weitere hohe Pauschale, wird dieser Test rot und zwingt
    // dazu, den Fall anzusehen statt ihn stillschweigend zu kappen.
    const gekappt = allFundingPrograms()
      .filter((p) => (p.balkonPauschale ?? 0) > guenstigstesSet)
      .map((p) => p.id);
    expect(gekappt).toEqual(["mv-mini-solaranlagen"]);
  });
});

describe("Mecklenburg-Vorpommern: der Fall, der den Deckel ausgelöst hat", () => {
  const mv = getFundingProgram("mv-mini-solaranlagen");

  it("das Programm steht mit 500 € im Katalog und gilt nur für Mieter", () => {
    expect(mv?.balkonPauschale).toBe(500);
    expect(mv?.nurWohnform).toBe("mieter");
  });

  it("ein Mieter mit dem billigsten Set bekommt den Kaufpreis, nicht 500 €", () => {
    const a = fundingAmount(mv, { technik: "balkon", wattPeak: 500, kosten: guenstigstesSet, wohnform: "mieter" }, HEUTE);
    expect(a.total).toBe(guenstigstesSet);
    expect(a.total).toBeLessThan(500);
  });
});
