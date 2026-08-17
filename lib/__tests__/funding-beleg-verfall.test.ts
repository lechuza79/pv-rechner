import { describe, it, expect } from "vitest";
import {
  fundingAmount,
  fundingBelegAktuell,
  fundingZaehlt,
  stackFunding,
  FOERDER_MAX_ALTER_TAGE,
  type FundingProgram,
} from "../funding-programs";

// ─── Vertrauen verfällt ──────────────────────────────────────────────────────
//
// Ein Förderbetrag wurde bis zum 16.08.2026 abgezogen, solange `status: "aktiv"`
// im Datensatz stand — unbefristet, und nur durch das AUSBLEIBEN eines Widerrufs
// gedeckt. Der Widerruf hing an Wächtern, die nur laufen, wenn der Rechner des
// Betreibers an ist; in der Urlaubswoche lief fünf Tage keiner.
//
// Diese Tests halten die Umkehr fest: Abgezogen wird nur, was frisch an der
// Amtsquelle belegt ist. Fällt die Prüfung aus, verfällt der Abzug von selbst.

const HEUTE = "2026-08-16";

function vorTagen(n: number): string {
  return new Date(Date.parse(HEUTE) - n * 86_400_000).toISOString().slice(0, 10);
}

const programm = (over: Partial<FundingProgram> = {}): FundingProgram =>
  ({
    id: "test", name: "Testförderung", traeger: "Stadt Test", level: "kommune", region: "Test",
    url: "https://example.org", stand: "August 2026", status: "aktiv", capped: false, verified: true,
    eligibility: ["privat"], coveredCosts: "Zuschuss je kWp", rates: [], conditions: [],
    combinableWith: [], pvPerKwp: 200, lastVerified: HEUTE, ...over,
  }) as FundingProgram;

describe("Frische des Quellenbelegs", () => {
  it("frisch geprüft zählt", () => {
    expect(fundingBelegAktuell({ lastVerified: vorTagen(10) }, HEUTE)).toBe(true);
  });

  it("genau an der Frist zählt noch, einen Tag danach nicht mehr", () => {
    expect(fundingBelegAktuell({ lastVerified: vorTagen(FOERDER_MAX_ALTER_TAGE) }, HEUTE)).toBe(true);
    expect(fundingBelegAktuell({ lastVerified: vorTagen(FOERDER_MAX_ALTER_TAGE + 1) }, HEUTE)).toBe(false);
  });

  it("ohne Prüfdatum gilt nichts als belegt — auch nicht 'wahrscheinlich noch aktiv'", () => {
    expect(fundingBelegAktuell({ lastVerified: undefined }, HEUTE)).toBe(false);
    expect(fundingZaehlt(programm({ lastVerified: undefined }), HEUTE)).toBe(false);
  });

  it("ein unlesbares Datum zählt als nicht belegt, nicht als belegt", () => {
    expect(fundingBelegAktuell({ lastVerified: "demnächst" }, HEUTE)).toBe(false);
  });
});

describe("Was in eine Rechnung einfließen darf", () => {
  it("aktiv + frisch belegt → wird abgezogen", () => {
    const a = fundingAmount(programm(), 10, 0, 20000, HEUTE);
    expect(a.active).toBe(true);
    expect(a.total).toBe(2000);
  });

  it("aktiv, aber Beleg abgelaufen → Betrag bleibt berechenbar, zählt aber nicht", () => {
    const a = fundingAmount(programm({ lastVerified: vorTagen(400) }), 10, 0, 20000, HEUTE);
    expect(a.computable).toBe(true);
    expect(a.active).toBe(false);
  });

  it("abgelaufener Beleg zieht in der Summe keinen Euro ab", () => {
    const frisch = stackFunding([programm()], 10, 0, 20000, HEUTE);
    const alt = stackFunding([programm({ lastVerified: vorTagen(400) })], 10, 0, 20000, HEUTE);
    expect(frisch.total).toBe(2000);
    expect(alt.total).toBe(0);
    expect(alt.applied).toHaveLength(0);
  });

  it("ein frischer Beleg rettet kein eingestelltes Programm", () => {
    for (const status of ["eingestellt", "ausgeschoepft", "pausiert", "unsicher"] as const) {
      expect(fundingZaehlt(programm({ status }), HEUTE)).toBe(false);
    }
  });

  it("die Regel wirkt ohne dass irgendein Wächter läuft — allein durch Zeitablauf", () => {
    const p = programm({ lastVerified: HEUTE });
    expect(fundingZaehlt(p, HEUTE)).toBe(true);
    // Derselbe Datensatz, unverändert, ein halbes Jahr später:
    expect(fundingZaehlt(p, "2027-08-16")).toBe(false);
  });
});
