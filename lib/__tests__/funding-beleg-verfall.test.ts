import { describe, it, expect } from "vitest";
import {
  fundingAmount,
  fundingBelegAktuell,
  fundingZaehlt,
  stackFunding,
  fundingStandLabel,
  FOERDER_BESTAETIGUNG_MAX_TAGE,
  FOERDER_NACHPRUEF_FRIST_TAGE,
  type FundingProgram,
} from "../funding-programs";

// ─── Bestätigung statt Verfallsdatum ─────────────────────────────────────────
//
// Erste Fassung (16.08.2026): Ein geprüfter Wert galt 180 Tage. Vom Betreiber
// zurückgewiesen — zu Recht: „das Verfallsdatum von 180 Tagen ist keine Lösung,
// da haben wir ein halbes Jahr einen alten Stand auf der Seite."
//
// Zweite Fassung: Der Seiten-Wächter ruft jede Amtsseite täglich ab. Ist sie
// unverändert, gilt der geprüfte Inhalt weiter — dafür braucht es keine Frist.
// Die Uhr läuft nur, wenn wir NICHT bestätigen können, und dann zwei Wochen:
// nach einer Änderung (Inhalt unbekannt) oder ohne geglückten Abruf (wir wissen
// nicht, ob sie sich geändert hat).

const HEUTE = "2026-08-17";

function vorTagen(n: number): string {
  return new Date(Date.parse(HEUTE) - n * 86_400_000).toISOString().slice(0, 10);
}

const programm = (over: Partial<FundingProgram> = {}): FundingProgram =>
  ({
    id: "test", name: "Testförderung", traeger: "Stadt Test", level: "kommune", region: "Test",
    url: "https://example.org", stand: "August 2026", status: "aktiv", capped: false, verified: true,
    eligibility: ["privat"], coveredCosts: "Zuschuss je kWp", rates: [], conditions: [],
    combinableWith: [], pvPerKwp: 200,
    lastVerified: vorTagen(200), pageSeenAt: HEUTE, ...over,
  }) as FundingProgram;

describe("Eine unveränderte Amtsseite hält den geprüften Wert am Leben", () => {
  it("auch wenn die inhaltliche Prüfung lange her ist", () => {
    // Das ist der Kern der Korrektur: 200 Tage alte Prüfung, aber der Wächter
    // bestätigt täglich, dass sich die Seite nicht bewegt hat.
    expect(fundingZaehlt(programm({ lastVerified: vorTagen(200), pageSeenAt: HEUTE }), HEUTE)).toBe(true);
  });

  it("aber nicht ohne jede inhaltliche Prüfung", () => {
    expect(fundingZaehlt(programm({ lastVerified: undefined }), HEUTE)).toBe(false);
  });
});

describe("Ohne Bestätigung läuft die Uhr — und zwar kurz", () => {
  it("letzter geglückter Abruf genau an der Grenze zählt noch, einen Tag später nicht", () => {
    const grenze = programm({ pageSeenAt: vorTagen(FOERDER_BESTAETIGUNG_MAX_TAGE) });
    expect(fundingBelegAktuell(grenze, HEUTE)).toBe(true);
    const drueber = programm({ pageSeenAt: vorTagen(FOERDER_BESTAETIGUNG_MAX_TAGE + 1) });
    expect(fundingBelegAktuell(drueber, HEUTE)).toBe(false);
  });

  it("die Frist ist zwei Wochen, nicht ein halbes Jahr", () => {
    expect(FOERDER_BESTAETIGUNG_MAX_TAGE).toBeLessThanOrEqual(14);
    expect(FOERDER_NACHPRUEF_FRIST_TAGE).toBeLessThanOrEqual(14);
  });
});

describe("Eine geänderte Amtsseite stellt den geprüften Inhalt in Frage", () => {
  it("kurze Nachprüf-Frist, danach zählt das Programm nicht mehr", () => {
    const frisch = programm({ lastVerified: vorTagen(100), changedSinceIso: vorTagen(3) });
    expect(fundingZaehlt(frisch, HEUTE)).toBe(true);

    const abgelaufen = programm({
      lastVerified: vorTagen(100),
      changedSinceIso: vorTagen(FOERDER_NACHPRUEF_FRIST_TAGE + 1),
    });
    expect(fundingZaehlt(abgelaufen, HEUTE)).toBe(false);
  });

  it("eine Änderung VOR der letzten Prüfung ist abgearbeitet und stört nicht", () => {
    const p = programm({ lastVerified: vorTagen(2), changedSinceIso: vorTagen(30) });
    expect(fundingZaehlt(p, HEUTE)).toBe(true);
  });
});

describe("Was in eine Rechnung einfließen darf", () => {
  it("bestätigt → wird abgezogen", () => {
    const a = fundingAmount(programm(), 10, 0, 20000, HEUTE);
    expect(a.active).toBe(true);
    expect(a.total).toBe(2000);
  });

  it("unbestätigt → Betrag bleibt berechenbar, zählt aber nicht", () => {
    const a = fundingAmount(programm({ pageSeenAt: vorTagen(60) }), 10, 0, 20000, HEUTE);
    expect(a.computable).toBe(true);
    expect(a.active).toBe(false);
  });

  it("unbestätigt zieht in der Summe keinen Euro ab", () => {
    expect(stackFunding([programm()], 10, 0, 20000, HEUTE).total).toBe(2000);
    expect(stackFunding([programm({ pageSeenAt: vorTagen(60) })], 10, 0, 20000, HEUTE).total).toBe(0);
  });

  it("eine frische Bestätigung rettet kein eingestelltes Programm", () => {
    for (const status of ["eingestellt", "ausgeschoepft", "pausiert", "unsicher"] as const) {
      expect(fundingZaehlt(programm({ status }), HEUTE)).toBe(false);
    }
  });

  it("fehlt nur die Bestätigungs-Spalte, zählt ersatzweise die inhaltliche Prüfung", () => {
    // Fall: Der Code ist ausgeliefert, /api/funding/setup hat die Spalten aber
    // noch nicht angelegt. Der Lader liest dann schmal weiter, pageSeenAt fehlt.
    const frisch = programm({ lastVerified: vorTagen(3), pageSeenAt: undefined });
    expect(fundingZaehlt(frisch, HEUTE)).toBe(true);
    const alt = programm({ lastVerified: vorTagen(90), pageSeenAt: undefined });
    expect(fundingZaehlt(alt, HEUTE)).toBe(false);
  });

  it("beim reinen Code-Seed (Datenbank ganz weg) wird NICHTS abgezogen", () => {
    // Der Seed trägt kein lastVerified — das ist die ehrliche Aussage über den
    // Datenbankausfall. Frühere Fassung von Kommentar und Test behauptete einen
    // sanften Rückfall, den es nie gab.
    const ausSeed = { ...programm(), lastVerified: undefined, pageSeenAt: undefined };
    expect(fundingZaehlt(ausSeed, HEUTE)).toBe(false);
  });
});

describe("Was das Prüfdatum auf der Seite sagt", () => {
  it("nennt es ausdrücklich, wenn die Förderung gerade nicht eingerechnet wird", () => {
    const abgelaufen = programm({ lastVerified: vorTagen(40), pageSeenAt: vorTagen(40) });
    const text = fundingStandLabel(abgelaufen, HEUTE);
    expect(fundingZaehlt(abgelaufen, HEUTE)).toBe(false);
    expect(text).toContain("nicht eingerechnet");
  });

  it("schweigt darüber, solange gerechnet wird", () => {
    expect(fundingStandLabel(programm(), HEUTE)).not.toContain("nicht eingerechnet");
  });

  it("hängt den Hinweis nicht an Programme ohne eigenen Betrag (z. B. 0 % MwSt des Bundes)", () => {
    const ohneSatz = { ...programm({ pageSeenAt: vorTagen(40) }), pvPerKwp: undefined };
    expect(fundingStandLabel(ohneSatz, HEUTE)).not.toContain("nicht eingerechnet");
  });

  it("hängt den Hinweis nicht an Programme, die aus anderen Gründen nicht zählen", () => {
    // "ausgeschöpft" erklärt sich selbst — ein zusätzliches "nicht bestätigt"
    // wäre irreführend, denn bestätigt ist die Seite ja.
    const topfLeer = programm({ status: "ausgeschoepft", pageSeenAt: vorTagen(40) });
    expect(fundingStandLabel(topfLeer, HEUTE)).not.toContain("nicht eingerechnet");
  });
});

describe("Prozentualer Zuschuss mit Höchstbetrag", () => {
  // Die häufigste Bauform kommunaler Zuschüsse: "20 % der Kosten, höchstens
  // 300 €". Bis 18.08.2026 rechnete der Prozent-Zweig ungedeckelt, solche
  // Programme mussten deshalb ohne Betrag aufgenommen werden.
  const prozent = (over: Partial<FundingProgram> = {}) =>
    ({ ...programm(), pvPerKwp: undefined, percentOfCost: 0.2, ...over }) as FundingProgram;

  it("deckelt, sobald der Prozentsatz den Höchstbetrag übersteigt", () => {
    expect(fundingAmount(prozent({ pvCap: 300 }), 10, 0, 20000, HEUTE).total).toBe(300);
  });

  it("rechnet unterhalb des Deckels weiter prozentual", () => {
    expect(fundingAmount(prozent({ pvCap: 300 }), 10, 0, 1000, HEUTE).total).toBe(200);
  });

  it("ohne Deckel bleibt es beim reinen Prozentsatz", () => {
    expect(fundingAmount(prozent(), 10, 0, 20000, HEUTE).total).toBe(4000);
  });
});
