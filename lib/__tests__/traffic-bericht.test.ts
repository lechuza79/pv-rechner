import { describe, expect, it } from "vitest";
import { bewegungen, chancen } from "../traffic-bericht";

describe("bewegungen", () => {
  it("reports real growth and drops, ignores small noise and the Others bucket", () => {
    const r = bewegungen(
      [{ schluessel: "/balkonkraftwerk/rechner", besucher: 60 }, { schluessel: "/a", besucher: 3 }, { schluessel: "Others", besucher: 99 }],
      [{ schluessel: "/balkonkraftwerk/rechner", besucher: 20 }, { schluessel: "/a", besucher: 1 }, { schluessel: "/weg", besucher: 12 }],
    );
    expect(r.steigt.map((x) => x.schluessel)).toEqual(["/balkonkraftwerk/rechner"]);
    expect(r.faellt).toEqual([{ schluessel: "/weg", jetzt: 0, vorher: 12, delta: -12 }]);
  });
});

describe("chancen", () => {
  const basis = { clicks: 0, impressions: 50 };
  it("skips queries we already win and ones far behind", () => {
    expect(chancen([{ ...basis, query: "pv rechner", page: "https://solar-check.io/photovoltaik-rechner", position: 2 }])).toEqual([]);
    expect(chancen([{ ...basis, query: "pv rechner", page: "https://solar-check.io/photovoltaik-rechner", position: 45 }])).toEqual([]);
  });
  it("flags a question landing on a municipality page as a candidate for own content", () => {
    const [c] = chancen([{ ...basis, query: "lohnt sich balkonkraftwerk", page: "https://solar-check.io/solar-atlas/hessen/x/nidda", position: 12 }]);
    expect(c.art).toBe("neuer-inhalt");
  });
  it("flags a fitting page on page 1–3 as one to sharpen", () => {
    const [c] = chancen([{ ...basis, query: "balkonkraftwerk rechner", page: "https://solar-check.io/balkonkraftwerk/rechner", position: 9 }]);
    expect(c.art).toBe("nachschaerfen");
  });
  it("ignores thin impressions", () => {
    expect(chancen([{ clicks: 0, impressions: 5, query: "x", page: "https://solar-check.io/", position: 8 }])).toEqual([]);
  });
});
