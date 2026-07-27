import { describe, it, expect } from "vitest";
import type { GemeindeStats } from "../awards";
import {
  aggregateArea,
  computeUtilityPlacements,
  findOverlaps,
  UTILITY_CATEGORY_BY_KEY,
  utilityCategoryLabel,
  type UtilityArea,
  type UtilityMembership,
  type UtilityRecord,
} from "../utilities";
import { naeherungsHinweis, selectUtilityHook, utilityHookText, UTILITY_MIN_TOTAL } from "../utility-hook";

// ─── Testdaten ────────────────────────────────────────────────────────────────

function gemeinde(regionId: string, over: Partial<GemeindeStats> = {}): GemeindeStats {
  return {
    regionId,
    name: `Gemeinde ${regionId}`,
    bezeichnung: "Gemeinde",
    population: 10000,
    privatDachKwp: 5000,
    gewerbeDachKwp: 2000,
    freiflaecheKwp: 1000,
    balkonCount: 100,
    balkonKwp: 60,
    batteriePrivatKwh: 3000,
    batterieGewerbeKwh: 500,
    windKwp: 4000,
    biomasseKwp: 300,
    wasserKwp: 100,
    solarZubauKwp: 700,
    ...over,
  };
}

function versorger(id: string, over: Partial<UtilityRecord> = {}): UtilityRecord {
  return {
    id,
    name: `Stadtwerke ${id}`,
    typ: "stadtwerk",
    website: null,
    kontaktEmail: null,
    kontaktseiteUrl: null,
    sitzGemeindeId: null,
    status: "offen",
    notiz: null,
    ...over,
  };
}

const zuordnung = (
  utilityId: string,
  regionId: string,
  over: Partial<UtilityMembership> = {},
): UtilityMembership => ({
  utilityId,
  regionId,
  rolle: "versorgungsgebiet",
  quelle: "recherchiert",
  ...over,
});

// ─── Aggregation ──────────────────────────────────────────────────────────────

describe("Gebiets-Aggregation", () => {
  const stats = new Map([
    ["09111000", gemeinde("09111000")],
    ["09112000", gemeinde("09112000")],
  ]);

  it("summiert die Kennzahlen der zugeordneten Gemeinden", () => {
    const u = versorger("a");
    const area = aggregateArea(u, [zuordnung("a", "09111000"), zuordnung("a", "09112000")], stats);

    expect(area.gemeindeCount).toBe(2);
    expect(area.stats.population).toBe(20000);
    expect(area.stats.privatDachKwp).toBe(10000);
    // Solar = Dach privat + Dach gewerblich + Freifläche + Balkon
    expect(area.solarKwp).toBe(2 * (5000 + 2000 + 1000 + 60));
    // Erzeugung = Solar + Wind + Biomasse + Wasser
    expect(area.erzeugungKw).toBe(area.solarKwp + 2 * (4000 + 300 + 100));
    expect(area.speicherKwh).toBe(2 * (3000 + 500));
    expect(area.zubauKwp).toBe(1400);
  });

  it("zählt eine Beteiligung NICHT ins Versorgungsgebiet", () => {
    // Eine Beteiligung ist ein Eigentumsverhältnis. Würde sie mitzählen, bliese
    // sie die Gebietszahlen auf, ohne dass jemand dort versorgt wird.
    const u = versorger("a");
    const area = aggregateArea(
      u,
      [zuordnung("a", "09111000"), zuordnung("a", "09112000", { rolle: "beteiligung" })],
      stats,
    );
    expect(area.gemeindeCount).toBe(1);
    expect(area.stats.population).toBe(10000);
  });

  it("zählt die Zuordnungen anderer Versorger nicht mit", () => {
    const area = aggregateArea(versorger("a"), [zuordnung("b", "09111000"), zuordnung("a", "09112000")], stats);
    expect(area.gemeindeCount).toBe(1);
  });

  it("meldet Gemeinden ohne Anlagendaten, statt sie stillschweigend zu schlucken", () => {
    const area = aggregateArea(versorger("a"), [zuordnung("a", "09111000"), zuordnung("a", "09999999")], stats);
    expect(area.gemeindeCount).toBe(2);
    expect(area.ohneDaten).toBe(1);
    expect(area.stats.population).toBe(10000); // nur die Gemeinde mit Daten
  });

  it("erkennt Überschneidungen mit anderen Versorgern", () => {
    const alle = [zuordnung("a", "09111000"), zuordnung("b", "09111000"), zuordnung("a", "09112000")];
    const overlaps = findOverlaps(alle);
    expect(overlaps.has("09111000")).toBe(true);
    expect(overlaps.has("09112000")).toBe(false);

    const area = aggregateArea(versorger("a"), alle, stats, overlaps);
    expect(area.ueberlappend).toBe(1);
  });

  it("führt die Herkunft der Zuordnungen mit und rechnet den Anteil Vermutetes", () => {
    const area = aggregateArea(
      versorger("a"),
      [
        zuordnung("a", "09111000", { quelle: "verlinkt" }),
        zuordnung("a", "09112000", { quelle: "vermutet" }),
      ],
      stats,
    );
    expect(area.quellen).toEqual({ verlinkt: 1, recherchiert: 0, vermutet: 1 });
    expect(area.vermutetAnteil).toBe(0.5);
  });

  it("nimmt das Bundesland vom Sitz und merkt an, wenn das Gebiet darüber hinausreicht", () => {
    const weit = new Map(stats);
    weit.set("08111000", gemeinde("08111000"));
    const area = aggregateArea(
      versorger("a", { sitzGemeindeId: "09111000" }),
      [zuordnung("a", "09111000", { rolle: "sitz" }), zuordnung("a", "08111000")],
      weit,
    );
    expect(area.bundeslandAgs).toBe("09");
    expect(area.mehrereBundeslaender).toBe(true);
  });
});

// ─── Näherungs-Kennzeichnung ──────────────────────────────────────────────────

describe("Näherungs-Hinweis", () => {
  const stats = new Map([["09111000", gemeinde("09111000")]]);

  it("hängt an jedem Aggregat und benennt Vermutetes und Überschneidungen", () => {
    const area = aggregateArea(
      versorger("a"),
      [zuordnung("a", "09111000", { quelle: "vermutet" }), zuordnung("b", "09111000")],
      stats,
      findOverlaps([zuordnung("a", "09111000"), zuordnung("b", "09111000")]),
    );
    const text = naeherungsHinweis(area);
    expect(text).toMatch(/^Näherung:/);
    expect(text).toContain("1 nur vermutet");
    expect(text).toContain("anderen Versorger");
  });

  it("bildet Ein- und Mehrzahl richtig", () => {
    const eine = aggregateArea(versorger("a"), [zuordnung("a", "09111000")], stats);
    expect(naeherungsHinweis(eine)).toContain("1 Gemeinde zugeordnet");

    const zwei = aggregateArea(
      versorger("a"),
      [zuordnung("a", "09111000"), zuordnung("a", "09112000")],
      stats,
    );
    expect(naeherungsHinweis(zwei)).toContain("2 Gemeinden zugeordnet");
  });
});

// ─── Rang + Aufhänger ─────────────────────────────────────────────────────────

/** N Versorger mit je einer Gemeinde, absteigender Dachleistung. */
function feld(n: number, land = "09"): { areas: UtilityArea[] } {
  const stats = new Map<string, GemeindeStats>();
  const memberships: UtilityMembership[] = [];
  const records: UtilityRecord[] = [];
  for (let i = 0; i < n; i++) {
    const regionId = `${land}${String(i).padStart(6, "0")}`;
    stats.set(regionId, gemeinde(regionId, { privatDachKwp: 10000 - i * 100, windKwp: 1000 - i * 10 }));
    const u = versorger(`u${i}`, { sitzGemeindeId: regionId });
    records.push(u);
    memberships.push(zuordnung(`u${i}`, regionId, { rolle: "sitz" }));
  }
  const overlaps = findOverlaps(memberships);
  return { areas: records.map((u) => aggregateArea(u, memberships, stats, overlaps)) };
}

describe("Rangrechnung", () => {
  it("rankt absteigend nach Kennzahl", () => {
    const { areas } = feld(6);
    const placements = computeUtilityPlacements(areas);
    const bester = placements.get("u0")!.find((p) => p.categoryKey === "dach-privat-pk" && p.scope === "bund" && !p.sizeBand)!;
    expect(bester.rank).toBe(1);
    expect(bester.total).toBe(6);
  });

  it("vergleicht zusätzlich innerhalb der Größenklasse", () => {
    const { areas } = feld(9);
    const placements = computeUtilityPlacements(areas);
    const mitKlasse = placements.get("u0")!.filter((p) => p.sizeBand !== null);
    expect(mitKlasse.length).toBeGreaterThan(0);
  });
});

describe("Aufhänger", () => {
  it("behauptet KEINEN Rang, solange zu wenige Versorger erfasst sind", () => {
    // Der eigentliche Zweck der Schwelle: „Platz 3 von 4" ist keine Auszeichnung,
    // sondern eine Blamage, sobald der Angesprochene nachfragt.
    const { areas } = feld(UTILITY_MIN_TOTAL - 1);
    const placements = computeUtilityPlacements(areas);
    const hook = selectUtilityHook(placements.get("u0"));
    expect(hook.kind).toBe("neutral");

    const text = utilityHookText(hook, areas[0]);
    expect(text.headline).not.toMatch(/Platz/);
    expect(text.hinweis).toContain("zu wenige Versorger");
  });

  it("nennt den Rang, sobald das Feld groß genug ist", () => {
    const { areas } = feld(UTILITY_MIN_TOTAL + 3);
    const placements = computeUtilityPlacements(areas);
    const hook = selectUtilityHook(placements.get("u0"));
    expect(hook.kind).toBe("rang");
    expect(hook.rank).toBe(1);

    const text = utilityHookText(hook, areas[0]);
    expect(text.headline).toMatch(/Platz 1 von \d+/);
    expect(text.hinweis).toMatch(/^Näherung:/);
  });

  it("sagt „vergleichbar“ nur, wenn in einer Größenklasse verglichen wurde", () => {
    const { areas } = feld(9);
    const placements = computeUtilityPlacements(areas);
    for (const area of areas) {
      const hook = selectUtilityHook(placements.get(area.utility.id));
      const { headline } = utilityHookText(hook, area);
      if (/kleineren|mittelgroßen|größeren/.test(headline)) expect(hook.sizeBand).not.toBeNull();
      else if (hook.kind === "rang") expect(headline).toContain("unter den erfassten Versorgern");
    }
  });

  it("trägt in der Überschrift eine Einheit aus dem kanonischen Formatter", () => {
    const { areas } = feld(8);
    const placements = computeUtilityPlacements(areas);
    const { headline } = utilityHookText(selectUtilityHook(placements.get("u0")), areas[0]);
    expect(headline).toMatch(/\b(kWp|MWp|GWp|kW|MW|GW|Wp|kWh|MWh|GWh|Anlagen|je 1\.000 Ew\.|Wh\/Kopf)\b/);
  });
});

// ─── Einheiten ────────────────────────────────────────────────────────────────

describe("Einheiten der Gebiets-Kategorien", () => {
  it("nutzt für den Technologie-Mix kW/MW/GW, NICHT die Peak-Einheit", () => {
    // Peak ist die Nennleistung von Solarmodulen unter Testbedingungen. Über
    // einer Summe aus Solar + Wind + Biomasse wäre „MWp" eine Falschaussage.
    expect(UTILITY_CATEGORY_BY_KEY["erzeugung-gesamt"].format).toBe("mixLeistung");
    expect(UTILITY_CATEGORY_BY_KEY["solar-gesamt"].format).toBe("pvLeistung");
  });

  it("gibt Wind, Biomasse und Wasser KEINE Peak-Einheit", () => {
    // Peak gibt es nur bei Solarmodulen. Diese drei standen bis 07/2026 auf der
    // Solar-Einheit und zeigten „MWp" über einer Windleistung.
    for (const key of ["wind-standort", "biomasse-standort", "wasser-standort"]) {
      expect(UTILITY_CATEGORY_BY_KEY[key].format).toBe("mixLeistung");
    }
  });

  it("wiederholt in der Bezeichnung nicht, was der Formatter schon sagt", () => {
    // „14,3 je 1.000 Ew. Balkonkraftwerke je 1.000 Einwohner" — derselbe Fehler
    // wie eine doppelte Einheit, nur in Worten.
    expect(utilityCategoryLabel("balkon-pk")).not.toMatch(/1\.000/);
    expect(utilityCategoryLabel("batterie-privat-pk")).not.toMatch(/Kopf|Einwohner/);
  });

  it("gibt jeder Kategorie eine sachliche Bezeichnung für die Ansprache", () => {
    for (const cat of Object.values(UTILITY_CATEGORY_BY_KEY)) {
      const label = utilityCategoryLabel(cat.key);
      expect(label.length).toBeGreaterThan(0);
      // Die Award-Titel der Gemeinden („Solardach-Spitzenreiter") sind
      // Wettbewerbsnamen und gehören nicht in ein B2B-Gespräch.
      expect(label).not.toMatch(/Spitzenreiter|Hauptstadt|Champion|Pionier|Vorreiter/);
    }
  });
});
