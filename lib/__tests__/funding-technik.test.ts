import { describe, it, expect } from "vitest";
import {
  fundingAmount, stackFunding, technikenVon, foerdertTechnik, programmeFuerTechnik,
  allFundingPrograms, getFundingProgram,
  type FundingProgram, type FundingTechnik,
} from "../funding-programs";

// Der Katalog trägt seit 18.08.2026 drei Techniken statt einer. Diese Datei
// nagelt fest, was daran schiefgehen KANN — und das ist fast alles dasselbe:
// dass Geld in einer Technik abgezogen wird, in der es niemand bekommt.

const basis = {
  id: "t", name: "T", traeger: "T", level: "kommune", region: "T",
  url: "https://example.invalid", stand: "August 2026", status: "aktiv",
  capped: false, verified: true, eligibility: ["privat"],
  coveredCosts: "", rates: [], conditions: [], combinableWith: [],
  // Frischer Beleg, damit `active` nicht an der Bestätigungsfrist scheitert —
  // die hat ihren eigenen Test (funding-beleg-verfall).
  lastVerified: "2026-08-18", pageSeenAt: "2026-08-18",
} as const;

function prog(extra: Partial<FundingProgram>): FundingProgram {
  return { ...basis, ...extra } as FundingProgram;
}
const HEUTE = "2026-08-18";

const PV = { technik: "pv", kwp: 10, speicherKwh: 5, kosten: 20000 } as const;
const BALKON = { technik: "balkon", wattPeak: 800, kosten: 600 } as const;
const WP = { technik: "waermepumpe", kosten: 30000 } as const;

describe("Voreinstellung: ohne Angabe ist ein Programm ein PV-Programm", () => {
  it("technikenVon liefert pv, wenn foerdert fehlt", () => {
    expect(technikenVon({ foerdert: undefined })).toEqual(["pv"]);
    expect(technikenVon({ foerdert: [] })).toEqual(["pv"]);
  });

  it("ein Altbestand ohne foerdert taucht NICHT im Balkon- oder WP-Rechner auf", () => {
    // Das ist der Kern der Voreinstellung: Sie ist eng, nicht großzügig. Ein
    // Programm, das noch niemand auf Steckersolar hin gelesen hat, darf dort
    // nicht erscheinen — sonst behauptet die Seite eine Prüfung, die fehlt.
    const p = prog({ pvPerKwp: 200 });
    expect(foerdertTechnik(p, "pv")).toBe(true);
    expect(foerdertTechnik(p, "balkon")).toBe(false);
    expect(foerdertTechnik(p, "waermepumpe")).toBe(false);
  });
});

describe("Geld nur in der Technik, die das Programm fördert", () => {
  it("ein reines Dach-PV-Programm zieht im Balkon-Rechner nichts ab", () => {
    // Die teuerste denkbare Verwechslung: 200 €/kWp auf ein 0,8-kWp-Balkonset
    // angewandt wären 160 € Förderung, die kein Programm je zahlt.
    const p = prog({ pvPerKwp: 200 });
    const r = fundingAmount(p, BALKON, HEUTE);
    expect(r.computable).toBe(false);
    expect(r.total).toBe(0);
  });

  it("ein reines Balkon-Programm zieht im PV-Rechner nichts ab", () => {
    const p = prog({ foerdert: ["balkon"], balkonPauschale: 200 });
    const r = fundingAmount(p, PV, HEUTE);
    expect(r.computable).toBe(false);
    expect(r.total).toBe(0);
  });

  it("ein Programm für beide Techniken rechnet je Technik seinen eigenen Satz", () => {
    const p = prog({ foerdert: ["pv", "balkon"], pvPerKwp: 200, balkonPauschale: 100 });
    expect(fundingAmount(p, PV, HEUTE).total).toBe(2000);
    expect(fundingAmount(p, BALKON, HEUTE).total).toBe(100);
  });

  it("fördert es die Technik, hat aber dafür keinen Satz, ist es nicht computable", () => {
    // Der beabsichtigte Fall „informiert, zieht aber nichts ab": eine Bauform,
    // die das Modell nicht ausdrücken kann (Spanne, Staffel ohne Regel). Lieber
    // keine Zahl als eine falsche.
    const p = prog({ foerdert: ["pv", "balkon"], pvPerKwp: 200 });
    const r = fundingAmount(p, BALKON, HEUTE);
    expect(r.computable).toBe(false);
    expect(r.total).toBe(0);
  });
});

describe("Balkon-Sätze", () => {
  it("Pauschale je Gerät — unabhängig von Leistung und Preis", () => {
    const p = prog({ foerdert: ["balkon"], balkonPauschale: 75 });
    expect(fundingAmount(p, BALKON, HEUTE).total).toBe(75);
    expect(fundingAmount(p, { technik: "balkon", wattPeak: 2000, kosten: 1500 }, HEUTE).total).toBe(75);
  });

  it("€/Wp greift auf die Modulleistung und respektiert den Deckel", () => {
    const p = prog({ foerdert: ["balkon"], balkonProWp: 0.4, balkonCap: 320 });
    expect(fundingAmount(p, { technik: "balkon", wattPeak: 600, kosten: 500 }, HEUTE).total).toBe(240);
    expect(fundingAmount(p, { technik: "balkon", wattPeak: 1000, kosten: 800 }, HEUTE).total).toBe(320);
  });

  it("Staffel nach Modulleistung — erste passende Stufe gewinnt", () => {
    // Real (Mühlhausen an der Sulz): 100 € ab 340 Wp, 150 € ab 680 Wp, 200 € ab
    // 1.020 Wp. Über einen €/Wp-Satz wäre das nicht abzubilden.
    const p = prog({
      foerdert: ["balkon"],
      balkonTiers: [{ upTo: 680, amount: 100 }, { upTo: 1020, amount: 150 }, { upTo: 99999, amount: 200 }],
    });
    const bei = (wp: number) => fundingAmount(p, { technik: "balkon", wattPeak: wp, kosten: 600 }, HEUTE).total;
    expect(bei(600)).toBe(100);
    expect(bei(800)).toBe(150);
    expect(bei(2000)).toBe(200);
  });

  it("Prozentsatz greift auf den Kaufpreis und respektiert den Deckel", () => {
    const p = prog({ foerdert: ["balkon"], balkonPercentOfCost: 0.3, balkonCap: 200 });
    expect(fundingAmount(p, { technik: "balkon", wattPeak: 800, kosten: 500 }, HEUTE).total).toBe(150);
    expect(fundingAmount(p, { technik: "balkon", wattPeak: 800, kosten: 900 }, HEUTE).total).toBe(200);
  });
});

describe("Wärmepumpen-Sätze", () => {
  it("Pauschale je Anlage", () => {
    const p = prog({ foerdert: ["waermepumpe"], wpPauschale: 1000 });
    expect(fundingAmount(p, WP, HEUTE).total).toBe(1000);
  });

  it("Prozentsatz mit Deckel", () => {
    const p = prog({ foerdert: ["waermepumpe"], wpPercentOfCost: 0.1, wpCap: 2000 });
    expect(fundingAmount(p, { technik: "waermepumpe", kosten: 15000 }, HEUTE).total).toBe(1500);
    expect(fundingAmount(p, WP, HEUTE).total).toBe(2000);
  });
});

describe("stackFunding über mehrere Programme", () => {
  it("summiert nur die Programme, die diese Technik fördern", () => {
    const dach = prog({ id: "a", pvPerKwp: 200 });
    const balkon = prog({ id: "b", foerdert: ["balkon"], balkonPauschale: 100 });
    const beides = prog({ id: "c", foerdert: ["pv", "balkon"], balkonPauschale: 50, pvPerKwp: 100 });
    const s = stackFunding([dach, balkon, beides], BALKON, HEUTE);
    expect(s.total).toBe(150);
    expect(s.applied.map((a) => a.program.id).sort()).toEqual(["b", "c"]);
  });

  it("deckelt die Summe an den Kosten der Maßnahme", () => {
    // Ein Zuschuss, der über dem Kaufpreis liegt, ist keine Förderung, sondern
    // ein Rechenfehler — bei Balkon-Sets mit 400 € Kaufpreis und zwei
    // stapelbaren Pauschalen liegt das näher als bei einer Dachanlage.
    const a = prog({ id: "a", foerdert: ["balkon"], balkonPauschale: 300 });
    const b = prog({ id: "b", foerdert: ["balkon"], balkonPauschale: 300 });
    expect(stackFunding([a, b], { technik: "balkon", wattPeak: 800, kosten: 400 }, HEUTE).total).toBe(400);
  });
});

describe("Realitäts-Anker am echten Katalog", () => {
  it("München fördert nur noch Steckersolar und steht deshalb nicht in der PV-Liste", () => {
    // Belegt im Eintrag selbst: „Dach-PV seit Dez. 2024 nicht mehr förderfähig".
    const m = getFundingProgram("muenchen-fkg")!;
    expect(technikenVon(m)).toEqual(["balkon"]);
    expect(programmeFuerTechnik(allFundingPrograms(), "pv").map((p) => p.id)).not.toContain("muenchen-fkg");
    expect(programmeFuerTechnik(allFundingPrograms(), "balkon").map((p) => p.id)).toContain("muenchen-fkg");
  });

  it("jeder strukturierte Satz steht in einem Programm, das diese Technik auch führt", () => {
    // Die Fehlerklasse, die dieser Test verhindert: Jemand trägt einen
    // Balkon-Betrag ein und vergisst `foerdert` — dann rechnet das Programm
    // nirgends, obwohl die Zahl dasteht. Still, und niemandem fällt es auf.
    for (const p of allFundingPrograms()) {
      const t = technikenVon(p);
      if (p.balkonPauschale || p.balkonProWp || p.balkonPercentOfCost || p.balkonTiers) {
        expect(t, `${p.id} trägt einen Balkon-Satz`).toContain("balkon");
      }
      if (p.wpPauschale || p.wpPercentOfCost) {
        expect(t, `${p.id} trägt einen Wärmepumpen-Satz`).toContain("waermepumpe");
      }
      if (p.pvPerKwp || p.pvTiers || p.speicherPerKwh || p.speicherTiers) {
        expect(t, `${p.id} trägt einen PV-Satz`).toContain("pv");
      }
    }
  });

  it("kein Programm nennt eine Technik doppelt oder eine unbekannte", () => {
    const bekannt: FundingTechnik[] = ["pv", "balkon", "waermepumpe"];
    for (const p of allFundingPrograms()) {
      const t = technikenVon(p);
      expect(new Set(t).size, `${p.id}`).toBe(t.length);
      for (const x of t) expect(bekannt, `${p.id}`).toContain(x);
    }
  });
});

// ─── Sockel plus Satz beim Speicher ─────────────────────────────────────────
//
// Die Bauform „Grundbetrag für die ersten n kWh, danach je weiterer kWh" kam
// bis zum 19.08.2026 nicht ins Modell; Schwebheim stand deshalb ohne Rechenwert
// im Katalog. Diese Tests halten fest, warum die naheliegende Abkürzung —
// `speicherTiers` — falsch war, und rechnen die Richtlinie unabhängig nach.
describe("Speicher: Sockel plus Satz", () => {
  const sockelProgramm = {
    ...basis, id: "sockel", foerdert: ["pv"],
    speicherMin: 3, speicherSockel: 400, speicherPerKwh: 75, speicherCap: 1000,
  } as unknown as FundingProgram;

  const betrag = (kwh: number) =>
    fundingAmount(sockelProgramm, { technik: "pv", kwp: 10, speicherKwh: kwh, kosten: 20000 }, "2026-08-19").total;

  it("rechnet den Sockel einmal und den Satz nur auf die weiteren kWh", () => {
    // Unabhängig nachgerechnet nach dem Wortlaut der Richtlinie:
    // „Für ein Batteriespeichersystem mit 3 kWh beträgt die Förderung 400,00 €,
    //  für jede weitere kWh Speicherkapazität beträgt die Förderung zusätzlich 75 €."
    expect(betrag(3)).toBe(400);
    expect(betrag(4)).toBe(475);
    expect(betrag(5)).toBe(550);
    expect(betrag(10)).toBe(925);
  });

  it("rundet auf volle kWh ab — der Grund, warum Stufen hier falsch wären", () => {
    // „Die förderfähigen kWh werden auf volle kWh abgerundet." 7,5 kWh ist eine
    // der sechs Standardgrößen in SPEICHER (lib/constants.ts), der Fall also
    // nicht theoretisch. Mit speicherTiers käme 775 € heraus.
    expect(betrag(7.5)).toBe(700);
    expect(betrag(12.5)).toBe(1000);
  });

  it("hält den Deckel ein, statt über 11 kWh weiterzuzählen", () => {
    // „Hat das geförderte Speichersystem mehr als 11 kWh Speicherkapazität, ist
    //  dies zwar förderunschädlich, die Förderung beträgt dennoch max. 1.000 €."
    expect(betrag(11)).toBe(1000);
    expect(betrag(20)).toBe(1000);
  });

  it("zahlt unterhalb der Mindestkapazität nichts", () => {
    expect(betrag(2)).toBe(0);
    expect(betrag(0)).toBe(0);
  });

  it("lässt den Satz ohne Sockel unverändert — kein Programm ändert sich still", () => {
    // Der neue Zweig darf die bestehenden Speicher-Programme nicht anfassen.
    const ohneSockel = { ...basis, id: "o", foerdert: ["pv"], speicherPerKwh: 100, speicherMin: 3 } as unknown as FundingProgram;
    const t = (kwh: number) =>
      fundingAmount(ohneSockel, { technik: "pv", kwp: 10, speicherKwh: kwh, kosten: 20000 }, "2026-08-19").total;
    expect(t(5)).toBe(500);
    expect(t(7.5)).toBe(750);
  });

  it("Schwebheim rechnet, was die Richtlinie sagt", () => {
    const p = getFundingProgram("schwebheim-batteriespeicher")!;
    expect(p.speicherSockel).toBe(400);
    expect(p.speicherPerKwh).toBe(75);
    expect(p.speicherMin).toBe(3);
    expect(p.speicherCap).toBe(1000);
  });

  it("ein Sockel ohne Mindestkapazität wäre unbestimmt", () => {
    // Ohne speicherMin ist nicht festgelegt, ab wann der Sockel anfällt — dann
    // zahlte das Modell ihn schon bei 0,1 kWh. Der Katalog darf das nicht führen.
    for (const p of allFundingPrograms()) {
      if (p.speicherSockel !== undefined) {
        expect(p.speicherMin, `${p.id}: speicherSockel ohne speicherMin`).toBeGreaterThan(0);
        expect(p.speicherPerKwh, `${p.id}: speicherSockel ohne speicherPerKwh`).toBeGreaterThan(0);
      }
    }
  });
});
