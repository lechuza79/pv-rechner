import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ATLAS_CITIES } from "../atlas-cities";
import { FUNDING_PROGRAMS, allFundingPrograms, getFundingProgram, fundingForAgs, fundingAmount, stackFunding, fundingStandLabel, type FundingProgram } from "../funding-programs";

// Integrity checks for the regional funding dataset. These are cheap insurance:
// as cities/programs are added by hand, a typo in a fundingId or combinableWith
// ref would silently break a page or a cross-link. Fail loudly at test time.

describe("funding-programs dataset", () => {
  it("each program's id matches its map key", () => {
    for (const [key, p] of Object.entries(FUNDING_PROGRAMS)) {
      expect(p.id).toBe(key);
    }
  });

  it("every combinableWith reference resolves to a real program", () => {
    for (const p of allFundingPrograms()) {
      for (const ref of p.combinableWith) {
        expect(getFundingProgram(ref), `${p.id} → combinableWith "${ref}"`).toBeDefined();
      }
    }
  });

  it("no program references itself as combinable", () => {
    for (const p of allFundingPrograms()) {
      expect(p.combinableWith).not.toContain(p.id);
    }
  });

  it("structured rates are coherent (percent in 0..1, positive €/kWp & €/kWh)", () => {
    for (const p of allFundingPrograms()) {
      if (p.percentOfCost !== undefined) {
        expect(p.percentOfCost).toBeGreaterThan(0);
        expect(p.percentOfCost).toBeLessThanOrEqual(1);
      }
      if (p.pvPerKwp !== undefined) expect(p.pvPerKwp).toBeGreaterThan(0);
      if (p.speicherPerKwh !== undefined) expect(p.speicherPerKwh).toBeGreaterThan(0);
      if (p.pvCap !== undefined) expect(p.pvCap).toBeGreaterThan(0);
      if (p.speicherCap !== undefined) expect(p.speicherCap).toBeGreaterThan(0);
    }
  });

  it("every program has a non-empty name, source url and at least one rate", () => {
    for (const p of allFundingPrograms()) {
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.url).toMatch(/^https?:\/\//);
      expect(p.rates.length).toBeGreaterThan(0);
    }
  });

  it("every non-bund program has a valid AGS prefix (2/5/8 digits)", () => {
    for (const p of allFundingPrograms()) {
      if (p.level === "bund") continue;
      expect(p.agsCode, `${p.id} needs an agsCode for geo-matching`).toBeDefined();
      expect(p.agsCode!).toMatch(/^\d{2}$|^\d{5}$|^\d{8}$/);
      // prefix length must fit the level: Land=2, Kreis=5, Kommune=8 (or 5 for kreisfreie Städte)
      if (p.level === "land") expect(p.agsCode!.length).toBe(2);
      if (p.level === "landkreis") expect(p.agsCode!.length).toBe(5);
    }
  });
});

describe("fundingForAgs geo-matching", () => {
  it("returns bund programs for any location", () => {
    const result = fundingForAgs("08111000"); // Stuttgart
    expect(result.some((p) => p.level === "bund")).toBe(true);
  });

  it("matches a kreisfreie Stadt by its 5-digit prefix", () => {
    const stuttgart = fundingForAgs("08111000");
    expect(stuttgart.map((p) => p.id)).toContain("stuttgart-solaroffensive");
  });

  it("matches Berlin (Land) for any Berlin AGS", () => {
    const berlin = fundingForAgs("11000000");
    expect(berlin.some((p) => p.bundesland === "Berlin" && p.level === "land")).toBe(true);
  });

  it("matches a kommune by its 8-digit prefix", () => {
    const badHomburg = fundingForAgs("06434003");
    expect(badHomburg.map((p) => p.id)).toContain("badhomburg-energiespar");
  });

  it("does not bleed funding across city borders", () => {
    // Flensburg (01001000, Schleswig-Holstein) has no own program → only bund
    const flensburg = fundingForAgs("01001000");
    expect(flensburg.every((p) => p.level === "bund")).toBe(true);
  });

  it("orders results broadest-first (bund → land → kreis → kommune)", () => {
    const order = { bund: 0, land: 1, landkreis: 2, kommune: 3 } as const;
    const result = fundingForAgs("08111000");
    const levels = result.map((p) => order[p.level]);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });
});

describe("fundingAmount math", () => {
  it("returns non-computable for undefined or free-text-only programs", () => {
    expect(fundingAmount(undefined, { technik: "pv", kwp: 10, speicherKwh: 5, kosten: 20000 }).computable).toBe(false);
  });

  it("applies €/kWp with socket and cap", () => {
    // Düsseldorf: 1000 € Sockel + 200 €/kWp, Cap 10.000 €
    const p = getFundingProgram("duesseldorf-klimafreundlich")!;
    const r = fundingAmount(p, { technik: "pv", kwp: 10, speicherKwh: 0, kosten: 20000 });
    expect(r.computable).toBe(true);
    expect(r.total).toBe(1000 + 10 * 200); // 3000, well under cap
  });

  it("caps the PV grant at pvCap", () => {
    const p = getFundingProgram("duesseldorf-klimafreundlich")!;
    const r = fundingAmount(p, { technik: "pv", kwp: 100, speicherKwh: 0, kosten: 200000 }); // huge system → cap bites
    expect(r.total).toBe(10000);
  });

  it("applies percent-of-cost programs against the gross cost", () => {
    const p = getFundingProgram("frankfurt-klimabonus")!; // 20 %
    const r = fundingAmount(p, { technik: "pv", kwp: 10, speicherKwh: 5, kosten: 25000 });
    expect(r.total).toBe(5000);
  });

  it("respects a storage minimum (no grant below speicherMin)", () => {
    const p = getFundingProgram("koeln-pv")!; // tiered, speicherMin set
    const withTiny = fundingAmount(p, { technik: "pv", kwp: 10, speicherKwh: 1, kosten: 20000 });
    const withReal = fundingAmount(p, { technik: "pv", kwp: 10, speicherKwh: 10, kosten: 20000 });
    expect(withReal.total).toBeGreaterThan(withTiny.total);
  });

  it("respects speicherMin in the per-kWh branch too (not only tiers)", () => {
    const p = allFundingPrograms().find(f => f.speicherPerKwh && (f.speicherMin ?? 0) > 0);
    expect(p).toBeTruthy();
    const min = p!.speicherMin!;
    const noStorage = fundingAmount(p, { technik: "pv", kwp: 10, speicherKwh: 0, kosten: 20000 }).total;
    const below = fundingAmount(p, { technik: "pv", kwp: 10, speicherKwh: min - 1, kosten: 20000 }).total;
    const atMin = fundingAmount(p, { technik: "pv", kwp: 10, speicherKwh: min, kosten: 20000 }).total;
    expect(below).toBe(noStorage);        // under the minimum → no storage grant
    expect(atMin).toBeGreaterThan(below);  // at the minimum → per-kWh grant applies
  });
});

describe("stackFunding", () => {
  // Der Code-Seed trägt KEIN Prüfdatum — `lastVerified` kommt ausschließlich aus
  // der Datenbank (lib/funding-data.ts). Seit dem Beleg-Verfall (16.08.2026)
  // zieht ein Programm ohne frischen Quellenbeleg nichts mehr ab, also müssen
  // Rechen-Tests den Beleg mitliefern. Genau das simuliert diese Hilfe: den
  // Normalfall im Betrieb, in dem die Datenbank das Prüfdatum liefert.
  const HEUTE = "2026-08-16";
  const belegt = (ps: FundingProgram[]) => ps.map((p) => ({ ...p, lastVerified: HEUTE }));

  it("only counts active+computable programs and caps at gross cost", () => {
    const programs = belegt(fundingForAgs("06412000")); // Frankfurt (aktiv, 20%)
    const { total, applied } = stackFunding(programs, { technik: "pv", kwp: 10, speicherKwh: 5, kosten: 25000 }, HEUTE);
    expect(total).toBe(5000);
    expect(applied.map((a) => a.program.id)).toContain("frankfurt-klimabonus");
  });

  it("ohne Quellenbeleg zieht derselbe Datensatz nichts ab — der Seed allein reicht nicht", () => {
    // Betriebsfall dahinter: Ist die Datenbank nicht erreichbar, fällt der Lader
    // auf den Code-Seed zurück. Der kennt keine Prüfdaten, also wird in diesem
    // Zustand KEINE Förderung eingerechnet. Bewusst so: Wir können die
    // Aktualität dann nicht belegen, und eine versprochene Förderung, die es
    // nicht mehr gibt, ist teurer als eine verschwiegene, die es noch gibt.
    const ohneBeleg = fundingForAgs("06412000");
    expect(stackFunding(ohneBeleg, { technik: "pv", kwp: 10, speicherKwh: 5, kosten: 25000 }, HEUTE).total).toBe(0);
  });

  it("yields zero where no active computable program applies", () => {
    const programs = fundingForAgs("09162000"); // Munich → only bund (no € rule)
    expect(stackFunding(programs, { technik: "pv", kwp: 10, speicherKwh: 5, kosten: 25000 }).total).toBe(0);
  });

  it("never exceeds the gross cost", () => {
    const programs = fundingForAgs("06412000");
    const { total } = stackFunding(programs, { technik: "pv", kwp: 5, speicherKwh: 0, kosten: 1000 }); // tiny brutto
    expect(total).toBeLessThanOrEqual(1000);
  });

  // Regression: Würzburg's rate (150 €/kWp, max 1.500 €) is still confirmed by two
  // sources, but the Council-Prüfung (Juli 2026, 2:1) found the program was rebuilt
  // to "KlimaStadt Würzburg" (25.04.2026) and current application acceptance is
  // unconfirmed. Encoding: keep status "aktiv" (the overall programme runs, page
  // stays live) but drop the structured rate → non-computable, no auto-deduction.
  it("Würzburg (aktiv, but non-computable after 2026 rebuild) is not auto-deducted", () => {
    const p = getFundingProgram("wuerzburg-klimastadt")!;
    expect(p.status).toBe("aktiv");
    expect(p.pvPerKwp).toBeUndefined();
    expect(fundingAmount(p, { technik: "pv", kwp: 8, speicherKwh: 0, kosten: 16000 }).computable).toBe(false);
    expect(stackFunding(fundingForAgs("09663000"), { technik: "pv", kwp: 10, speicherKwh: 5, kosten: 20000 }).total).toBe(0);
  });

  // Regression: Bad Homburg amounts are correct but the program is not reliably
  // accepting applications → status "unsicher" must NOT be auto-deducted.
  it("Bad Homburg (status unsicher) is not auto-applied", () => {
    const p = getFundingProgram("badhomburg-energiespar")!;
    expect(p.status).toBe("unsicher");
    const a = fundingAmount(p, { technik: "pv", kwp: 10, speicherKwh: 5, kosten: 20000 });
    expect(a.computable).toBe(true);
    expect(a.active).toBe(false); // computable, but not active → no deduction
    expect(stackFunding(fundingForAgs("06434003"), { technik: "pv", kwp: 10, speicherKwh: 5, kosten: 20000 }).total).toBe(0);
  });
});

// Batch Juni 2026, Teil 2 — verified against official sources.
describe("funding batch 2 (Juni 2026)", () => {
  it("Potsdam funds roof PV (200 €/kWp, cap 1.200) and a flat storage grant", () => {
    const p = getFundingProgram("potsdam-klimaschutz")!;
    expect(p.status).toBe("aktiv");
    expect(fundingAmount(p, { technik: "pv", kwp: 5, speicherKwh: 0, kosten: 12000 }).total).toBe(5 * 200);
    expect(fundingAmount(p, { technik: "pv", kwp: 10, speicherKwh: 0, kosten: 20000 }).total).toBe(1200);
    expect(fundingAmount(p, { technik: "pv", kwp: 10, speicherKwh: 8, kosten: 25000 }).total).toBe(1200 + 1000);
    expect(fundingAmount(p, { technik: "pv", kwp: 10, speicherKwh: 3, kosten: 25000 }).total).toBe(1200);
    // Mit Quellenbeleg (im Betrieb aus der Datenbank) — siehe Beleg-Verfall.
    const belegt = fundingForAgs("12054000").map((x) => ({ ...x, lastVerified: "2026-08-16" }));
    expect(stackFunding(belegt, { technik: "pv", kwp: 10, speicherKwh: 8, kosten: 25000 }, "2026-08-16").total).toBe(2200);
  });
  it("Hannover proKlima is info-only (not auto-deducted) — it covers only 6 of the ~21 Kreis municipalities", () => {
    const p = getFundingProgram("hannover-proklima")!;
    expect(p.status).toBe("aktiv");
    // Deliberately no structured € rule: the Kreis-AGS 03241 would prefix-match
    // non-eligible towns (e.g. Burgdorf) and wrongly deduct 100 €/kWp. So it is
    // shown as a hint but never computed/subtracted until a precise 8-digit AGS
    // allowlist of the 6 eligible municipalities exists.
    expect(fundingAmount(p, { technik: "pv", kwp: 15, speicherKwh: 0, kosten: 25000 }).computable).toBe(false);
    expect(fundingAmount(p, { technik: "pv", kwp: 15, speicherKwh: 0, kosten: 25000 }).total).toBe(0);
  });
  it("Dortmund (ausgeschoepft) and Essen (eingestellt) are not auto-applied", () => {
    expect(getFundingProgram("dortmund-pv")!.status).toBe("ausgeschoepft");
    // Council-Prüfung Juli 2026: Essen zum 03.07.2025 gestoppt → eingestellt.
    expect(getFundingProgram("essen-solar")!.status).toBe("eingestellt");
    expect(stackFunding(fundingForAgs("05913000"), { technik: "pv", kwp: 10, speicherKwh: 5, kosten: 20000 }).total).toBe(0);
    expect(stackFunding(fundingForAgs("05113000"), { technik: "pv", kwp: 10, speicherKwh: 5, kosten: 20000 }).total).toBe(0);
  });
});

// Batch Juni 2026, Teil 3 — Katalog-Vervollständigung.
// Council-Korrekturen Juli 2026 (Quartals-Vollprüfung, 3 Programme gegengeprüft):
//  - Schweinfurt: offizielle Seite auf 2024 eingefroren + offline → status eingestellt.
//  - Würzburg: Programm zum 25.04.2026 umgebaut, Annahme unbestätigt → aktiv ohne Abzug.
//  - Mannheim: Neustart 11.03.2026, aber nur MFH/Gründach/Denkmal → aktiv ohne €/kWp-Abzug.
describe("funding batch 3 (Katalog) — Council-Korrekturen", () => {
  it("Schweinfurt: Programm eingestellt → kein Auto-Abzug", () => {
    const p = getFundingProgram("schweinfurt-pv")!;
    expect(p.status).toBe("eingestellt");
    // Rate-Mathematik dokumentiert das historische Programm — wird aber nicht angerechnet:
    expect(fundingAmount(p, { technik: "pv", kwp: 8, speicherKwh: 0, kosten: 16000 }).total).toBe(800);
    expect(fundingAmount(p, { technik: "pv", kwp: 8, speicherKwh: 0, kosten: 16000 }).active).toBe(false);
    expect(stackFunding(fundingForAgs("09662000"), { technik: "pv", kwp: 10, speicherKwh: 6, kosten: 22000 }).total).toBe(0);
  });
  it("Mannheim: aktiv (Neustart 03/2026), aber ohne pauschalen €/kWp-Abzug", () => {
    const p = getFundingProgram("mannheim-solarbonus")!;
    expect(p.status).toBe("aktiv");
    expect(p.pvPerKwp).toBeUndefined();
    expect(fundingAmount(p, { technik: "pv", kwp: 10, speicherKwh: 5, kosten: 20000 }).computable).toBe(false);
    expect(stackFunding(fundingForAgs("08222000"), { technik: "pv", kwp: 10, speicherKwh: 5, kosten: 20000 }).total).toBe(0);
  });
  // Am 07.08.2026 aus der Förderrichtlinie selbst abgeschrieben (Gemeinderatsbeschluss
  // vom 11.03.2026, docs/quellen/Mannheim_SolarBonus_Foerderrichtlinie_2026-03-11.pdf).
  // Vorher stand hier eine Spanne "250–300 €/kWp" ganz OHNE Höchstbetrag für zwei
  // Bausteine, die in der Richtlinie getrennt und je gedeckelt sind — und zwei
  // Bausteine fehlten. Eine Spanne ohne Deckel ist genau die Sorte Angabe, die einen
  // Antragsteller mit einer zu hohen Erwartung losschickt.
  it("Mannheim: jeder Baustein nennt seinen Höchstbetrag, keine Spanne ohne Deckel", () => {
    const p = getFundingProgram("mannheim-solarbonus")!;
    for (const r of p.rates) {
      expect(r.value, `${r.label} ohne Höchstbetrag`).toMatch(/max\./);
      expect(r.value, `${r.label} nennt eine Spanne statt eines Satzes`).not.toMatch(/–\s*\d/);
    }
    // Die vier €/kWp-Sätze der Richtlinie, zellgleich (Nr. 3.3.1–3.3.3, 3.4, 3.5):
    const wert = (teil: string) => p.rates.find((r) => r.label.includes(teil))!.value;
    expect(wert("Mehrfamilienhaus ab 3")).toBe("120 €/kWp, max. 2.400 €");
    expect(wert("Dachbegrünung")).toBe("260 €/kWp, max. 4.000 €");
    expect(wert("denkmalgeschütztem")).toBe("300 €/kWp, max. 4.500 €");
    expect(wert("Fassaden-PV")).toBe("250 €/kWp, max. 3.000 €");
    expect(wert("gemeinnütziger Vereine")).toBe("140 €/kWp, max. 4.200 €");
  });
  // Nr. 1.1 der Richtlinie schließt Neubauten komplett aus (Bauantrag vor dem
  // 01.05.2022). Das ist die Bedingung, an der die meisten Interessenten scheitern —
  // sie stand bei uns nirgends, während wir das Programm als aktiv angezeigt haben.
  it("Mannheim: die Stichtags-Bedingung für Bestandsgebäude steht sichtbar dabei", () => {
    const p = getFundingProgram("mannheim-solarbonus")!;
    expect(p.conditions.join(" ")).toMatch(/01\.05\.2022/);
    expect(p.coveredCosts).toMatch(/01\.05\.2022/);
  });
  it("Wolfsburg (pausiert) and Bottrop (ausgeschoepft) are not auto-applied", () => {
    expect(getFundingProgram("wolfsburg-pv")!.status).toBe("pausiert");
    expect(stackFunding(fundingForAgs("03103000"), { technik: "pv", kwp: 10, speicherKwh: 5, kosten: 20000 }).total).toBe(0);
    expect(stackFunding(fundingForAgs("05512000"), { technik: "pv", kwp: 10, speicherKwh: 5, kosten: 20000 }).total).toBe(0); // Bottrop
  });

  // Frankfurt: the Mini-PV (Balkonkraftwerk) pot has been empty since 2025-06-03
  // while the rest of the Klimabonus keeps running. Promising a balcony rate here
  // would send people into applications that cannot be granted — the roof-PV rate
  // is verified and must stay. Council 3/3, foerder-news-waechter 2026-07-27.
  it("Frankfurt promises no balcony rate while the Mini-PV pot is empty", () => {
    const p = getFundingProgram("frankfurt-klimabonus")!;
    const balkon = p.rates?.find((r) => /balkon/i.test(r.label));
    expect(balkon).toBeDefined();
    expect(balkon!.value).not.toMatch(/\d\s*%/); // no percentage = no money promise
    expect(p.status).toBe("aktiv"); // roof PV keeps running
    expect(p.percentOfCost).toBe(0.2);
  });

  // Kreis Bergstraße: die hinterlegte Programmseite ist beim Umbau der Kreis-Site
  // verschwunden (404, am 28.07.2026 im Browser geprüft — auch die übergeordnete
  // Förderprogramm-Rubrik gibt es nicht mehr). Ein 404 als Quelle unter einem
  // Förderbetrag ist schlimmer als keine Quelle: Die Beträge stammen aus der
  // 2024er-Runde, 2025 gab es kein Programm, 2026 ist keines aufgelegt.
  it("Bergstraße: tote Quelle ersetzt, Speicher-Satz zieht weiterhin nicht ab", () => {
    const p = getFundingProgram("bergstrasse-speicher")!;
    expect(p.status).toBe("ausgeschoepft");
    expect(p.url).not.toMatch(/foerderprogramme\/2024-pv-stromspeicher/);
    expect(p.url).toMatch(/^https:\/\/www\.kreis-bergstrasse\.de\//);
    // Die Rate bleibt dokumentiert, wird aber nicht angerechnet.
    expect(fundingAmount(p, { technik: "pv", kwp: 10, speicherKwh: 10, kosten: 25000 }).total).toBe(1800);
    expect(fundingAmount(p, { technik: "pv", kwp: 10, speicherKwh: 10, kosten: 25000 }).active).toBe(false);
    expect(stackFunding(fundingForAgs("06431000"), { technik: "pv", kwp: 10, speicherKwh: 10, kosten: 25000 }).total).toBe(0);
    // Keine abgelaufene Terminzusage mehr im Fließtext ("ab Mitte Juli").
    expect(p.conditions.join(" ")).not.toMatch(/Mitte Juli/);
  });

  // Heidelberg: Der Eintrag stand als "unsicher" da, weil zwei städtische Seiten
  // sich zu widersprechen schienen. Der Widerspruch war ein Förderstopp-Kasten,
  // der drei ANDERE Programme meint. Die Richtlinie 2026 (gültig für Anträge nach
  // dem 30.06.2026, docs/quellen/Heidelberg_Rationelle-Energieverwendung_
  // Richtlinie_ab-2026-07-01.pdf, am 14.08.2026 im Volltext gelesen) trägt die
  // Werte wörtlich. Der 10.000-€-Deckel je Objekt fehlte bei uns komplett —
  // ein Satz je kWp ohne Deckel schickt Interessenten mit zu hoher Erwartung los.
  it("Heidelberg: aktiv nach Richtlinie 2026, jeder Satz mit Deckel, kein Abzug", () => {
    const p = getFundingProgram("heidelberg-rev")!;
    expect(p.status).toBe("aktiv");
    expect(p.verified).toBe(true);
    // Kein automatischer Abzug: der Zuschuss hängt am Anteil über der PV-Pflicht
    // und der Topf ist geteilt — ein gerechneter Betrag wäre ein Geldversprechen.
    expect(p.pvPerKwp).toBeUndefined();
    expect(fundingAmount(p, { technik: "pv", kwp: 10, speicherKwh: 5, kosten: 20000 }).computable).toBe(false);
    expect(stackFunding(fundingForAgs("08221000"), { technik: "pv", kwp: 10, speicherKwh: 5, kosten: 20000 }).total).toBe(0);
    // Beide €/kWp-Sätze nennen ihren Höchstbetrag, zellgleich zur Richtlinie.
    const wert = (teil: string) => p.rates.find((r) => r.label.includes(teil))!.value;
    expect(wert("Dach-PV")).toBe("100 €/kWp, max. 10.000 €");
    expect(wert("Fassade")).toBe("200 €/kWp, max. 10.000 €");
    expect(wert("Mieterstrom")).toBe("50 % der investiven Kosten, max. 2.500 €");
    for (const r of p.rates) expect(r.value, `${r.label} ohne Höchstbetrag`).toMatch(/max\./);
    // Die zwei Bedingungen, an denen es real scheitert: PV-Pflicht-Abzug und Topf.
    const bed = p.conditions.join(" ");
    expect(bed).toMatch(/PV-Pflicht Baden-Württemberg/);
    expect(bed).toMatch(/kein Rechtsanspruch/);
    // Speicher und Balkonkraftwerk sind ausdrücklich ausgeschlossen.
    expect(bed).toMatch(/steckerfertige/);
    expect(p.speicherPerKwh).toBeUndefined();
    // Der alte Unsicherheits-Hinweis ist weg, nicht bloß umformuliert.
    expect(bed).not.toMatch(/Stand unsicher/);
  });

  // Regensburg hat NIE Batteriespeicher gefördert. Die hinterlegten 150 €/kWh
  // waren eine Vermischung: Die amtliche Richtlinie vom 01.01.2026 (PDF in
  // docs/quellen/, am 03.08.2026 gelesen) kennt in Tabelle 1 genau zwei
  // Positionen — 100 €/kWp bis 1.500 € und 200 € für Denkmal oder Fassade.
  // "Speicher", "Batterie" und "kWh" kommen im ganzen Richtlinientext nicht vor.
  // Der Rechner hat Regensburgern damit bis zu 1.500 € zu viel versprochen;
  // dieser Test hält die Null fest.
  it("Regensburg: kein Speicher-Zuschuss, PV-Satz unverändert", () => {
    const p = getFundingProgram("regensburg-effizient")!;
    expect(p.speicherPerKwh).toBeUndefined();
    expect(p.speicherCap).toBeUndefined();
    expect(p.speicherMin).toBeUndefined();
    expect(p.rates.map((r) => r.label).join(" ")).not.toMatch(/Speicher|Batterie/i);
    // "Gründach" stand nur in unserem Eintrag, nicht in der Richtlinie.
    expect(p.rates.map((r) => r.label).join(" ")).not.toMatch(/Gründach/);
    // Die tote Domain greendeal-regensburg.de löst nicht mehr auf.
    expect(p.url).not.toMatch(/greendeal-regensburg\.de/);
    // Ein 10-kWp-Fall bekommt den PV-Zuschuss, aber nichts für 10 kWh Speicher.
    expect(fundingAmount(p, { technik: "pv", kwp: 10, speicherKwh: 10, kosten: 25000 }).total).toBe(1000);
    expect(fundingAmount(p, { technik: "pv", kwp: 30, speicherKwh: 10, kosten: 60000 }).total).toBe(1500); // Deckel greift
  });

  // Memmingen: Die Trägerseite bittet am 03.08.2026 wörtlich darum, keine Anträge
  // mehr zu stellen ("Fördertopf für 2026 ... ist ausgeschöpft"). Der Jahrestopf
  // umfasste 12.000 € für alle Maßnahmen zusammen. Die Lokalpresse meldete Mitte
  // Juli noch die Fortführung des Programms — deshalb hält dieser Test fest, dass
  // die Trägerseite zählt und nicht die Presse.
  it("Memmingen: Fördertopf 2026 leer, Programm zieht nicht mehr ab", () => {
    const p = getFundingProgram("memmingen-ee")!;
    expect(p.status).toBe("ausgeschoepft");
    // Die Startseite als Quellenangabe war kein Beleg — es muss die Förderseite sein.
    expect(p.url).toMatch(/memmingen\.de\/.+foerderung/);
    expect(stackFunding(fundingForAgs("09764000"), { technik: "pv", kwp: 10, speicherKwh: 10, kosten: 25000 }).total).toBe(0);
    // Dach-PV war hier nie förderfähig — das darf beim Statuswechsel nicht kippen.
    expect(p.pvPerKwp).toBeUndefined();
  });

  // Freiburg: Die Stadt hat den Jahrestopf 2026 am 14.07.2026 für leer erklärt
  // ("Neue Anträge können ab sofort nicht mehr gestellt werden", Pressemitteilung
  // freiburg.de/pb/2626054.html; die Programmseite nennt Baustein 3 ausdrücklich).
  // Wir zogen bis zum 16.08.2026 weiter 150 €/kWp ab. Zwei Fallen hält dieser Test
  // fest: Die Einzelseiten im Service-A-Z tragen den Stopp bis heute nicht (Stand
  // 2023) — wer dort nachsieht, hält das Programm für offen. Und das Balkonmodul
  // ist Ziffer 3.5 DESSELBEN Bausteins, also mitgestoppt, nicht ein eigener Topf.
  it("Freiburg: Jahrestopf 2026 leer, kein Abzug mehr — Programm bleibt bestehen", () => {
    const p = getFundingProgram("freiburg-stromerzeugung")!;
    expect(p.status).toBe("ausgeschoepft");
    expect(p.pvPerKwp).toBeUndefined();
    expect(p.pvCap).toBeUndefined();
    expect(stackFunding(fundingForAgs("08311000"), { technik: "pv", kwp: 10, speicherKwh: 10, kosten: 25000 }).total).toBe(0);
    // Die Sätze bleiben stehen: gestoppt ist das Geld, nicht die Richtlinie.
    expect(p.rates.length).toBeGreaterThanOrEqual(3);
    // Der Grund samt Stichtag steht sichtbar dabei, sonst wirkt die leere Kachel
    // wie ein Datenfehler statt wie eine Tatsache.
    expect(p.conditions.join(" ")).toMatch(/14\.07\.2026/);
    expect(p.conditions.join(" ")).toMatch(/Balkonmodul/i);
  });

  // Eine Startseiten-URL ist als Quellenangabe unter einem Förderbetrag wertlos:
  // Sie sieht aus wie ein Beleg, führt aber nirgendwo hin. Aufgefallen bei
  // Bergstraße und Memmingen, danach für alle aktiven Programme festgehalten.
  it("aktive Programme belegen ihren Satz mit einer Programmseite, nicht der Startseite", () => {
    for (const p of Object.values(FUNDING_PROGRAMS)) {
      if (p.status !== "aktiv" || p.level === "bund") continue;
      const pfad = p.url.replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "");
      expect(pfad, `${p.id} verweist nur auf die Startseite: ${p.url}`).not.toBe("");
    }
  });

  // Würzburg fördert seit dem Umbau zu "KlimaStadt Würzburg" NUR vier Sonderfälle:
  // Gebäudeversorgung im Mehrfamilienhaus, Fassade, PVT und PV über einer
  // Dachbegrünung. Eine gewöhnliche Dachanlage bekommt nichts. Wir haben trotzdem
  // "Dach-PV (Vollbelegung) 150 €/kWp" und einen Denkmalschutz-Baustein angezeigt —
  // beides steht weder auf der Förderseite noch in der Übersicht (beide wuerzburg.de,
  // am 05.08.2026 gelesen). Derselbe Fehlertyp wie bei Regensburgs Speicher.
  it("Würzburg: verspricht keine gewöhnliche Dach-PV und keinen Denkmal-Baustein", () => {
    const p = getFundingProgram("wuerzburg-klimastadt")!;
    const labels = p.rates.map((r) => r.label).join(" ");
    expect(labels).not.toMatch(/Denkmal/i);
    // "Dach" darf nur im Zusammenhang mit der Dachbegrünung vorkommen.
    for (const r of p.rates) {
      if (/Dach/i.test(r.label)) expect(r.label, r.label).toMatch(/begrünung/i);
    }
    expect(p.rates).toHaveLength(4);
    // Kein automatischer Abzug — die vier Bausteine treffen den Standardfall nicht.
    expect(p.pvPerKwp).toBeUndefined();
    expect(stackFunding(fundingForAgs("09663000"), { technik: "pv", kwp: 10, speicherKwh: 10, kosten: 25000 }).total).toBe(0);
  });

  // Stuttgart: Sätze und Deckel aus der Förderrichtlinie vom 1. Mai 2026 (PDF in
  // docs/quellen/). Vorher standen zwei Ungewissheiten als Anzeigetext da
  // ("Satz 2026 neu justiert", "ggf. eingestellt"); die Richtlinie beantwortet beide.
  it("Stuttgart: Speichersatz und Deckel stehen beziffert da", () => {
    const p = getFundingProgram("stuttgart-solaroffensive")!;
    const werte = p.rates.map((r) => r.value).join(" | ");
    expect(werte).toMatch(/100 €\/kWh/);
    expect(werte).toMatch(/15\.000 €/); // Speicher-Deckel je Antrag
    expect(werte).toMatch(/30\.000 €/); // PV-Deckel je Antrag
    // Die Module selbst bleiben ausgeschlossen — das ist der Kern dieses Programms.
    expect(p.conditions.join(" ")).toMatch(/Module.*nicht förderfähig/);
    // Weiterhin kein pauschaler Abzug: gefördert werden nur Begleitkosten.
    expect(p.pvPerKwp).toBeUndefined();
  });

  // Potsdam: die abgezogenen Werte stehen zellgleich in der Klimaschutzförder-
  // richtlinie vom 26.03.2026 (PDF in docs/quellen/). Dieser Test hält sie fest und
  // dazu die Steckersolar-Grenze, die wir mit 0,6 kWp zu eng angegeben hatten.
  it("Potsdam: Sätze aus der Richtlinie, Steckersolar-Grenze korrekt", () => {
    const p = getFundingProgram("potsdam-klimaschutz")!;
    expect(p.pvPerKwp).toBe(200);
    expect(p.pvCap).toBe(1200);
    expect(fundingAmount(p, { technik: "pv", kwp: 10, speicherKwh: 10, kosten: 25000 }).total).toBe(2200); // 1.200 PV + 1.000 Speicher
    expect(fundingAmount(p, { technik: "pv", kwp: 10, speicherKwh: 4, kosten: 25000 }).total).toBe(1200); // unter 5 kWh kein Speichergeld
    const stecker = p.rates.find((r) => /steckersolar/i.test(r.label))!;
    expect(stecker.label).not.toMatch(/0,6/);
    expect(stecker.label).toMatch(/0,8 kW/);
  });

  // Ein Anzeigetext, der selbst zugibt, dass er unsicher ist, ist kein Fördersatz —
  // er sieht nur aus wie einer. Aufgefallen bei Stuttgart ("Satz 2026 neu justiert",
  // "Förderung 2026 ggf. eingestellt"): Beides ließ sich in derselben Minute an der
  // Richtlinie klären. Wer eine Zahl nicht belegen kann, lässt die Zeile weg.
  it("aktive Programme zeigen keine Ungewissheit als Fördersatz an", () => {
    const floskel = /\bggf\.|vermutlich|unbestätigt|vor Antrag .*prüfen|neu justiert|unklar/i;
    for (const p of Object.values(FUNDING_PROGRAMS)) {
      if (p.status !== "aktiv") continue;
      for (const r of p.rates) {
        expect(r.value, `${p.id} → "${r.label}": ${r.value}`).not.toMatch(floskel);
      }
    }
  });
});

describe("atlas-cities registry", () => {
  it("every city fundingId resolves to a real program", () => {
    for (const c of ATLAS_CITIES) {
      if (c.fundingId) {
        expect(getFundingProgram(c.fundingId), `${c.slug} → fundingId "${c.fundingId}"`).toBeDefined();
      }
    }
  });

  it("city slugs are unique and url-safe", () => {
    const slugs = ATLAS_CITIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });

  it("MaStR region ids (AGS) are unique 5-digit codes", () => {
    const ags = ATLAS_CITIES.map((c) => c.ags);
    expect(new Set(ags).size).toBe(ags.length);
    for (const a of ags) expect(a).toMatch(/^\d{5}$/);
  });

  it("yields are in a plausible German range (900–1200 kWh/kWp)", () => {
    for (const c of ATLAS_CITIES) {
      expect(c.yieldKwhKwp).toBeGreaterThanOrEqual(900);
      expect(c.yieldKwhKwp).toBeLessThanOrEqual(1200);
    }
  });
});

// ─── „Zuletzt geprüft" darf nur eine echte Prüfung behaupten ─────────────────
//
// Bis 16.08.2026 setzte lib/funding-data.ts `lastVerified` auf
// `last_verified ?? updated_at`. `updated_at` ist aber die letzte SCHREIBUNG der
// Zeile — ein Resync, bei dem niemand etwas geprüft hat. 19 der 38 Programme
// hatten nie ein echtes Prüfdatum und trugen trotzdem "Zuletzt geprüft: …" auf
// ihrer Regionsseite, mit einem Datum, das jeder Resync auffrischte. Das Datum
// ist das Vertrauenssignal, auf dem die Förderseiten aufbauen; ein falsches ist
// die schwerste Fehlerklasse dieses Projekts (CLAUDE.md, "Zahlen und Einheiten").
describe("Herkunft des Prüfdatums", () => {
  it("ohne echtes Prüfdatum steht der redaktionelle Stand da, keine behauptete Prüfung", () => {
    const p = { ...FUNDING_PROGRAMS["bund-nullsteuer"], stand: "Juni 2026", verified: true, lastVerified: undefined };
    expect(fundingStandLabel(p)).toBe("Stand: Juni 2026");
    expect(fundingStandLabel(p)).not.toContain("geprüft");
  });

  it("mit echtem Prüfdatum steht die Prüfung da", () => {
    const p = { ...FUNDING_PROGRAMS["bund-nullsteuer"], verified: true, lastVerified: "2026-08-16" };
    expect(fundingStandLabel(p)).toBe("Zuletzt geprüft: 16.08.2026");
  });

  it("der Lader zieht updated_at nicht als Ersatz heran", () => {
    const quelle = readFileSync(new URL("../funding-data.ts", import.meta.url), "utf8");
    const code = quelle
      .split("\n")
      .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
      .join("\n");
    expect(code).not.toMatch(/updated_at/);
  });
});
