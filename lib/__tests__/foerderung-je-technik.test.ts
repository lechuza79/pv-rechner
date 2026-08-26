import { describe, it, expect } from "vitest";
import {
  FUNDING_PROGRAMS, bedingungenFuer, saetzeFuer, bedingungText,
  type FundingTechnik,
} from "../funding-programs";

/**
 * Eine Bedingung am falschen Ort ist eine falsche Auskunft, nicht bloß eine
 * überflüssige.
 *
 * Gemessen an Niddas Karte (26.08.2026): Sie zeigte neun Bedingungen in einer
 * Liste, darunter „mindestens 4 kWp" und „höchstens zwei Module je Haushalt".
 * Jede für sich stimmt; nebeneinander schließen sie einander aus. Wer sein
 * Balkonkraftwerk plante, las eine Mindestgröße, die ihn gar nicht betrifft.
 */

const nidda = FUNDING_PROGRAMS["nidda-solar"];

describe("Bedingungen und Sätze je Technik", () => {
  it("ohne Technik-Angabe kommt alles zurück", () => {
    // Der Fall der Übersichtsseiten, die ein Programm als Ganzes zeigen.
    expect(bedingungenFuer(nidda.conditions)).toHaveLength(nidda.conditions.length);
    expect(saetzeFuer(nidda.rates)).toHaveLength(nidda.rates.length);
  });

  it("die Dach-Mindestgröße erscheint nicht beim Balkonkraftwerk", () => {
    const balkon = bedingungenFuer(nidda.conditions, "balkon").join(" ");
    expect(balkon).not.toContain("4 kWp");
    expect(balkon).toContain("Hauptwohnsitz");
  });

  it("die Modul-Obergrenze erscheint nicht bei der Dachanlage", () => {
    const pv = bedingungenFuer(nidda.conditions, "pv").join(" ");
    expect(pv).not.toContain("zwei Module");
    expect(pv).toContain("4 kWp");
  });

  it("was für alle gilt, steht in beiden", () => {
    // Der Normalfall und der Grund, warum ein blanker String nicht markiert
    // werden muss: Antragsfrist, Haltedauer und Rechtsanspruch gelten immer.
    for (const t of ["pv", "balkon"] as FundingTechnik[]) {
      const texte = bedingungenFuer(nidda.conditions, t).join(" ");
      expect(texte, t).toContain("binnen vier Wochen");
      expect(texte, t).toContain("Haltedauer zehn Jahre");
    }
  });

  it("jeder Reiter zeigt genau seine Sätze", () => {
    expect(saetzeFuer(nidda.rates, "balkon").map((r) => r.label)).toEqual(["Balkonkraftwerk"]);
    expect(saetzeFuer(nidda.rates, "pv").map((r) => r.label)).toEqual(["Dachanlage (auch Fassade)", "Stromspeicher"]);
  });

  it("kein Reiter bleibt leer", () => {
    // Ein Reiter ohne Sätze wäre eine Einladung ins Nichts. Geprüft für jedes
    // Programm, das seine Zeilen überhaupt auf Techniken aufteilt.
    const leer: string[] = [];
    for (const p of Object.values(FUNDING_PROGRAMS)) {
      if (!p.rates.some((r) => r.nur)) continue;
      for (const t of (p.foerdert ?? ["pv"]) as FundingTechnik[]) {
        if (saetzeFuer(p.rates, t).length === 0) leer.push(`${p.id}: Reiter „${t}" ohne Satz`);
      }
    }
    expect(leer, leer.join("\n")).toEqual([]);
  });

  it("eine eingegrenzte Bedingung nennt nur Techniken, die das Programm fördert", () => {
    // Sonst versteckt die Eingrenzung den Satz vollständig — er stünde in
    // keinem Reiter, und niemand sähe, dass er fehlt.
    const falsch: string[] = [];
    for (const p of Object.values(FUNDING_PROGRAMS)) {
      const gefoerdert = new Set((p.foerdert ?? ["pv"]) as FundingTechnik[]);
      for (const c of p.conditions) {
        if (typeof c === "string") continue;
        for (const t of c.nur) {
          if (!gefoerdert.has(t)) falsch.push(`${p.id}: „${bedingungText(c)}" zeigt auf „${t}"`);
        }
      }
      for (const r of p.rates) {
        for (const t of r.nur ?? []) {
          if (!gefoerdert.has(t)) falsch.push(`${p.id}: Satz „${r.label}" zeigt auf „${t}"`);
        }
      }
    }
    expect(falsch, falsch.join("\n")).toEqual([]);
  });
});
