import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
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

// ── Wächter: wer ein Programm zeigt, sagt für WELCHE Technik ─────────────────

const ROOT = join(__dirname, "..", "..");

/**
 * Oberflächen, die ein Programm bewusst ALS GANZES zeigen — dort gibt es keine
 * Technik, auf die man eingrenzen könnte.
 *
 * Jede Ausnahme mit Grund, nicht als stille Lücke: Die Übersichten listen alle
 * Programme einer Ebene nebeneinander; der Leser sucht dort das Programm, nicht
 * seine eigene Anlage.
 */
const OHNE_TECHNIK_MIT_GRUND: Record<string, string> = {
  "app/(site)/photovoltaik-foerderung/page.tsx":
    "Bundesweite Übersicht: zeigt jedes Programm als Ganzes, kein Anlagenbezug.",
  "app/(site)/photovoltaik-foerderung/[bundesland]/page.tsx":
    "Bundesland-Übersicht: dieselbe Rolle wie die bundesweite Liste.",
};

function dateienUnter(rel: string): string[] {
  const abs = join(ROOT, rel);
  const treffer: string[] = [];
  for (const eintrag of readdirSync(abs)) {
    const pfad = join(abs, eintrag);
    if (statSync(pfad).isDirectory()) treffer.push(...dateienUnter(join(rel, eintrag)));
    else if (/\.tsx$/.test(eintrag)) treffer.push(join(rel, eintrag));
  }
  return treffer;
}

describe("Wer ein Programm zeigt, nennt seine Technik", () => {
  it("jede Verwendung von FundingConditions/FundingRates trägt eine Technik", () => {
    // WARUM ALS WÄCHTER (27.08.2026): Die Trennung nach Technik kam am 26.08.
    // auf die Stadtseite — und das Detail-Fenster im Rechner wurde dabei
    // übersehen. Dort las man im PV-Rechner bei Nidda „Höchstens zwei Module je
    // Haushalt", eine Bedingung des Balkonkraftwerks, die jede Dachanlage
    // ausschließt. Von außen unsichtbar: Die Seite funktioniert, die Auskunft
    // ist falsch. Der nächste Aufrufer würde denselben Fehler machen.
    //
    // Gesucht wird über den ganzen Dateiinhalt, nicht Zeile für Zeile: Unsere
    // JSX-Aufrufe brechen über mehrere Zeilen um.
    const fehlend: string[] = [];
    for (const datei of [...dateienUnter("components"), ...dateienUnter("app")]) {
      const inhalt = readFileSync(join(ROOT, datei), "utf8");
      const treffer = inhalt.matchAll(/<Funding(Conditions|Rates)\b([\s\S]*?)\/>/g);
      for (const t of treffer) {
        if (/\btechnik=/.test(t[2])) continue;
        if (datei in OHNE_TECHNIK_MIT_GRUND) continue;
        fehlend.push(`${datei}: <Funding${t[1]} …> ohne technik=`);
      }
    }
    expect(fehlend, fehlend.join("\n")).toEqual([]);
  });

  it("jede Ausnahme zeigt wirklich noch ein Programm", () => {
    // Eine Ausnahmeliste, die auf eine Datei zeigt, in der es nichts mehr zu
    // erlauben gibt, sieht nach Sorgfalt aus und deckt nichts mehr.
    for (const [datei, grund] of Object.entries(OHNE_TECHNIK_MIT_GRUND)) {
      const inhalt = readFileSync(join(ROOT, datei), "utf8");
      expect(inhalt, `${datei}: ${grund}`).toMatch(/<Funding(Conditions|Rates)\b/);
    }
  });
});
