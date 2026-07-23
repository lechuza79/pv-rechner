import { describe, it, expect } from "vitest";
import { renderOutreachDraft } from "../kommunen-outreach-draft";

describe("renderOutreachDraft", () => {
  const d = renderOutreachDraft({ name: "Testdorf", kwpAlle: 73_900, population: 133_000 });

  it("nennt die Gemeinde im Betreff und Text", () => {
    expect(d.subject).toContain("Testdorf");
    expect(d.body).toContain("Testdorf");
  });

  it("nutzt Peak-Einheiten (kWp/MWp, Wp je Kopf) — nie bare kW/MW/W", () => {
    expect(d.body).toMatch(/MWp/); // 73,9 MWp
    expect(d.body).toMatch(/Wp je Einwohnerin/);
    // Keine handgeschriebene Nicht-Peak-Einheit an einer Zahl.
    expect(d.body).not.toMatch(/\d\s?kW(?![ph])/);
    expect(d.body).not.toMatch(/\d\s?MW(?!p)/);
    expect(d.body).not.toMatch(/\sW je/);
  });

  it("trägt die Pflicht-Signatur (Klarname + Impressum + Datenschutz)", () => {
    expect(d.body).toContain("Sebastian Schäder");
    expect(d.body).toContain("Betreiber solar-check.io");
    expect(d.body).toContain("solar-check.io/impressum");
    expect(d.body).toContain("solar-check.io/datenschutz");
  });

  it("fällt bei fehlenden Solardaten auf einen sauberen Text zurück (keine 0-kWp-Aussage)", () => {
    const z = renderOutreachDraft({ name: "Leerhausen", kwpAlle: 0, population: 500 });
    expect(z.body).not.toMatch(/0\s?kWp/);
    expect(z.body).toContain("Leerhausen");
    expect(z.body).toContain("Sebastian Schäder");
  });

  it("lässt die Pro-Kopf-Angabe weg, wenn keine Einwohnerzahl da ist", () => {
    const n = renderOutreachDraft({ name: "Ohnedorf", kwpAlle: 5000, population: null });
    expect(n.body).toContain("MWp");
    expect(n.body).not.toMatch(/je Einwohnerin/);
  });
});
