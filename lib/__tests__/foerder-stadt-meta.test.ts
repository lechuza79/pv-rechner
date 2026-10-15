import { describe, expect, it } from "vitest";
import { publishedCities, fundingForFrom, fundingListFrom } from "../atlas-cities";
import { allFundingPrograms } from "../funding-programs";
import { BESCHREIBUNG_BUDGET, TITEL_BUDGET, foerderStadtMeta } from "../foerder-stadt-meta";

const programme = allFundingPrograms();
const alle = publishedCities().map((c) => ({ c, f: fundingForFrom(programme, c), meta: foerderStadtMeta(c.name, fundingListFrom(programme, c), 2026) }));

describe("Titel und Beschreibung der Förder-Stadtseiten", () => {
  it("bleiben für jede veröffentlichte Stadt im gemessenen Budget", () => {
    const zuLang = alle.filter(({ meta }) => meta.title.length > TITEL_BUDGET || meta.description.length > BESCHREIBUNG_BUDGET);
    expect(zuLang.map(({ c, meta }) => `${c.name}: ${meta.title.length}/${meta.description.length}`)).toEqual([]);
  });

  it("setzen den Programmnamen in Anführungszeichen statt ihn artikellos einzubauen", () => {
    // Real on 27.09.2026: "…, das Osnabrück saniert – Photovoltaik und Beispielrechnungen".
    for (const { f, meta } of alle) {
      if (f && meta.description.includes(f.name)) expect(meta.description).toContain(`„${f.name}“`);
    }
  });

  it("nennen den Status, wenn das Programm keine Anträge annimmt", () => {
    for (const { f, meta } of alle) {
      if (f && f.status !== "aktiv") expect(meta.title).toMatch(/ausgeschöpft|pausiert|eingestellt|unklar/);
    }
  });

  it("benutzen die Präposition des Ortes", () => {
    const kreis = foerderStadtMeta("Rhein-Erft-Kreis", undefined, 2026);
    expect(kreis.description).toContain("im Rhein-Erft-Kreis");
    expect(kreis.description).not.toContain("in Rhein-Erft-Kreis");
  });
});
