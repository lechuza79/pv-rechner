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
  it("der Deckel ist keine Einheit", () => {
    // 88 von 201 Sätzen tragen ihren Höchstbetrag im selben String. Landete er
    // in der Einheit, wurde diese zu lang für die Zeile und rutschte unter die
    // Zahl — oben stand dann eine blanke „100".
    const z = zerlegeSatz("100 €/kWp, max. 1.000 €");
    expect(z.zahl).toBe("100");
    expect(z.einheit).toBe("€/kWp");
    expect(z.kurzeEinheit).toBe(true);
    expect(z.zusatz).toBe("max. 1.000 €");
  });

  it("das Symbol bleibt bei der Zahl, die Erläuterung nicht", () => {
    // Der Fall aus dem Screenshot: „50" ohne Prozentzeichen ist keine
    // schwächere Angabe, sondern eine andere — Euro oder Prozent?
    const z = zerlegeSatz("50 % der Kosten, max. 200 €");
    expect(z.zahl).toBe("50");
    expect(z.einheit).toBe("%");
    expect(z.kurzeEinheit).toBe(true);
    expect(z.zusatz).toBe("der Kosten, max. 200 €");
  });

  it("kennt Kurzzeichen ohne Symbol", () => {
    // „ct" trägt kein Sonderzeichen und ist trotzdem ein Kurzzeichen. Die alte
    // Regel maß die LÄNGE (≤ 3) — daran scheiterten „€/kWp" und „€/kWh", die
    // mit fünf Zeichen als ausgeschriebene Wörter galten, obwohl sie das
    // Gegenteil sind.
    const z = zerlegeSatz("85 ct je Watt Wechselrichterleistung, max. 85 %");
    expect(z.zahl).toBe("85");
    expect(z.einheit).toBe("ct");
    expect(z.kurzeEinheit).toBe(true);
  });

  it("lässt ein echtes Wort unten stehen", () => {
    // Gegenrichtung: „Prozentpunkte" ist eine ausgeschriebene Einheit und
    // gehört unter die Zahl — dort hängt auch ihr Erklär-Tooltip.
    const z = zerlegeSatz("+5 Prozentpunkte");
    expect(z.einheit).toBe("Prozentpunkte");
    expect(z.kurzeEinheit).toBe(false);
  });

  it("KEINE Zahl im Katalog steht ohne ihre Einheit", () => {
    // Die schärfste Prüfung, und die einzige, die den ursprünglichen Fehler
    // gefunden hätte: Eine Zahl, deren Einheit unter ihr steht statt neben ihr,
    // ist in der Kachel-Optik eine Zahl ohne Angabe. 88 Sätze waren betroffen.
    const nackt: string[] = [];
    for (const p of Object.values(FUNDING_PROGRAMS)) {
      for (const r of p.rates) {
        const z = zerlegeSatz(r.value);
        if (!z.kurzeEinheit && /^[\d.,+−-]+$/.test(z.zahl) && z.einheit !== "Prozentpunkte") {
          nackt.push(`${p.id}: „${r.value}" zeigt oben nur „${z.zahl}"`);
        }
      }
    }
    expect(nackt, nackt.join("\n")).toEqual([]);
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
