import { describe, it, expect } from "vitest";
import { zerlegeSatz } from "../../components/FundingProgramParts";
import { FUNDING_PROGRAMS } from "../funding-programs";

/**
 * Die Zerlegung eines Fördersatzes in Zahl, Einheit und Zusatz stand bis zum
 * 26.08.2026 inline im JSX — Logik mit Randfällen an einer Stelle, die kein
 * Test erreicht. Der Fehler, der sie herausgeholt hat, war entsprechend
 * unsichtbar: Er fiel erst beim Ansehen der fertigen Seite auf.
 */

describe("Zahl, Einheit und Zusatz eines Fördersatzes", () => {
  it("trennt den einfachen Fall", () => {
    const z = zerlegeSatz("100 €/kWp, max. 1.000 €");
    expect(z.zahl).toBe("100");
    expect(z.einheit).toBe("€/kWp, max. 1.000 €");
    expect(z.zusatz).toBeNull();
  });

  it("holt den Zusatz aus der Klammer", () => {
    const z = zerlegeSatz("20 % (30 % als Solar-Gründach)");
    expect(z.zahl).toBe("20");
    expect(z.einheit).toBe("%");
    expect(z.zusatz).toBe("30 % als Solar-Gründach");
    expect(z.kurzeEinheit).toBe(true);
  });

  it("lässt keine Klammer stehen, wenn dahinter noch Text folgt", () => {
    // Der gemessene Fehler: Niddas Höchstbetrag erschien als
    // „1.500 € Anlage + Speicher), Mini-PV max. 200 €".
    const z = zerlegeSatz("1.500 € (Anlage + Speicher), Mini-PV max. 200 €");
    expect(z.zahl).toBe("1.500");
    expect(z.zusatz).toBe("Anlage + Speicher, Mini-PV max. 200 €");
    expect(z.zusatz).not.toContain(")");
    expect(z.zusatz).not.toContain("(");
  });

  it("kommt mit einer nie geschlossenen Klammer zurecht", () => {
    // Ein Tippfehler im Katalog soll die Zeile nicht zerreißen.
    const z = zerlegeSatz("500 € (nur mit Speicher");
    expect(z.zahl).toBe("500");
    expect(z.zusatz).toBe("nur mit Speicher");
  });

  it("KEIN Satz im Katalog rendert eine verwaiste Klammer", () => {
    // Die Gegenprobe über den ganzen Bestand — das ist die eigentliche
    // Absicherung. Ein einzelner Beispielwert hätte den Fehler nie gefunden:
    // Er trat nur bei den Sätzen auf, die hinter der Klammer weitergehen.
    const fehler: string[] = [];
    for (const p of Object.values(FUNDING_PROGRAMS)) {
      const werte = [...p.rates.map((r) => r.value), p.maxFoerderung].filter(
        (w): w is string => typeof w === "string",
      );
      for (const w of werte) {
        const z = zerlegeSatz(w);
        const gerendert = [z.zahl, z.einheit, z.zusatz].filter(Boolean).join(" ");
        const auf = (gerendert.match(/\(/g) ?? []).length;
        const zu = (gerendert.match(/\)/g) ?? []).length;
        if (auf !== zu) fehler.push(`${p.id}: „${w}" wird zu „${gerendert}"`);
      }
    }
    expect(fehler, fehler.join("\n")).toEqual([]);
  });
});
