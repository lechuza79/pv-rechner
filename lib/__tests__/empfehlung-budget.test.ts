import { describe, it, expect } from "vitest";
import { recommend } from "../recommend";

/**
 * Was passiert, wenn das angegebene Budget nicht reicht.
 *
 * Gefunden beim Rechner-Audit am 24.08.2026: Wer 1.000 € Budget angibt, bekommt
 * eine 3-kWp-Anlage empfohlen — die rund 4.000 € kostet. Die Empfehlung liegt
 * also ÜBER dem selbst gesetzten Limit, und die Oberfläche schrieb dazu
 * „Budget-begrenzt — ohne Limit wäre mehr möglich". Formal richtig, in der Sache
 * irreführend: Sie verschweigt genau das, was der Nutzer wissen muss.
 *
 * Der Rechenkern kannte den Unterschied gar nicht — beide Fälle setzten dasselbe
 * Flag. Seitdem gibt es zwei, und dieser Test hält sie auseinander.
 */
const basis = {
  personen: 2, nutzung: 1, wp: "nein", ea: "nein", eaKm: 15000,
  haustyp: 2, dachart: 0,
} as const;

describe("Empfehlung bei knappem Budget", () => {
  it("meldet ein Budget, das nicht einmal für die kleinste Anlage reicht", () => {
    const r = recommend({ ...basis, budgetLimit: 1000 } as never);
    expect(r.reasoning.budgetZuKnapp).toBe(true);
    // Die Empfehlung liegt dann bewusst über dem Limit — sonst gäbe es keine.
    expect(r.reasoning.investition).toBeGreaterThan(1000);
  });

  it("unterscheidet das von einem Budget, das die Größe nur begrenzt", () => {
    // 8.000 € reichen für eine kleinere Anlage, aber nicht für die beste.
    const r = recommend({ ...basis, budgetLimit: 8000 } as never);
    expect(r.reasoning.budgetZuKnapp).toBe(false);
    expect(r.reasoning.investition).toBeLessThanOrEqual(8000);
  });

  it("meldet ohne Budgetgrenze keinen der beiden Fälle", () => {
    const r = recommend({ ...basis, budgetLimit: null } as never);
    expect(r.reasoning.budgetZuKnapp).toBe(false);
    expect(r.reasoning.budgetConstrained).toBe(false);
  });

  it("bleibt bei einem zu knappen Budget trotzdem eine vollständige Empfehlung", () => {
    // Kein halber Fall: Wer eine Empfehlung bekommt, bekommt sie ganz — mit
    // Größe, Investition und Wirtschaftlichkeit.
    const r = recommend({ ...basis, budgetLimit: 500 } as never);
    expect(r.kwp).toBeGreaterThan(0);
    expect(Number.isFinite(r.reasoning.investition)).toBe(true);
    expect(Number.isFinite(r.reasoning.npv25)).toBe(true);
  });
});
