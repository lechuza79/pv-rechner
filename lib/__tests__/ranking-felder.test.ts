import { describe, it, expect } from "vitest";
import { LANDESHAUPTSTAEDTE, RANKING_FELDER, FELD_BY_SLUG, felderNachArt } from "../ranking-felder";
import type { GemeindeStats } from "../awards";
import { BUNDESLAENDER } from "../mastr-regions";
import { slugify } from "../atlas-cities";

const ort = (regionId: string, name: string, population: number, bezeichnung = "Gemeinde"): GemeindeStats => ({
  regionId,
  name,
  bezeichnung,
  population,
  privatDachKwp: 0,
  gewerbeDachKwp: 0,
  freiflaecheKwp: 0,
  balkonCount: 0,
  balkonKwp: 0,
  batteriePrivatKwh: 0,
  batterieGewerbeKwh: 0,
  windKwp: 0,
  biomasseKwp: 0,
  wasserKwp: 0,
  solarZubauKwp: 0,
});

describe("Landeshauptstädte", () => {
  it("erkennt sie am Gemeindeschlüssel, nicht am Namen", () => {
    // DER ECHTE FEHLER: Eine Namensliste fing die Gemeinde Schwerin in
    // Brandenburg (965 Einwohner) mit ein — sie führte daraufhin mit 587 Wp je
    // Kopf die Landeshauptstadt-Rangliste an, vor Magdeburg.
    const feld = FELD_BY_SLUG["landeshauptstaedte"];
    expect(feld.gilt(ort("13004000", "Schwerin", 98_308, "Kreisfreie Stadt"))).toBe(true);
    expect(feld.gilt(ort("12061448", "Schwerin", 965))).toBe(false);
  });

  it("kennt genau 16 — eine je Bundesland", () => {
    expect(Object.keys(LANDESHAUPTSTAEDTE)).toHaveLength(16);
    // Je Bundesland genau eine: die ersten zwei Stellen des Schlüssels sind das
    // Land, und 01 bis 16 muss jedes einmal vorkommen.
    const laender = new Set(Object.keys(LANDESHAUPTSTAEDTE).map((ags) => ags.slice(0, 2)));
    expect(laender.size).toBe(16);
    for (let i = 1; i <= 16; i++) expect(laender.has(String(i).padStart(2, "0"))).toBe(true);
  });

  it("schneidet quer zur Größenklasse — Schwerin ist keine Großstadt", () => {
    // Genau darum ist es ein eigenes Feld und keine Verfeinerung der Größe.
    const gross = FELD_BY_SLUG["grossstaedte"];
    expect(gross.gilt(ort("13004000", "Schwerin", 98_308, "Kreisfreie Stadt"))).toBe(false);
    expect(FELD_BY_SLUG["landeshauptstaedte"].gilt(ort("13004000", "Schwerin", 98_308, "Kreisfreie Stadt"))).toBe(true);
  });
});

describe("Kreisfreie Städte", () => {
  const feld = FELD_BY_SLUG["kreisfreie-staedte"];

  it("nimmt Stadtkreise mit — dasselbe in Baden-Württemberg", () => {
    expect(feld.gilt(ort("08111000", "Stuttgart", 612_663, "Stadtkreis"))).toBe(true);
    expect(feld.gilt(ort("05111000", "Düsseldorf", 618_685, "Kreisfreie Stadt"))).toBe(true);
  });

  it("lässt kreisangehörige Städte draussen", () => {
    expect(feld.gilt(ort("03241001", "Hannover", 522_131, "Stadt"))).toBe(false);
    expect(feld.gilt(ort("09999001", "Dorf", 300))).toBe(false);
  });
});

describe("Felder insgesamt", () => {
  it("hat keine Kategorie „Große Kreisstadt“ — die wäre eine BW-Liste", () => {
    // Gemessen: Die Spitze der 125 Großen Kreisstädte war Oberkirch, Leutkirch,
    // Horb, Ehingen, Laupheim — fünf von fünf aus Baden-Württemberg, weil die
    // Bezeichnung Landesrecht ist.
    const slugs = RANKING_FELDER.map((f) => f.slug);
    expect(slugs).not.toContain("grosse-kreisstaedte");
  });

  it("trennt Größen- von Rollen-Feldern und hat von beidem etwas", () => {
    expect(felderNachArt("groesse").length).toBe(5);
    expect(felderNachArt("rolle").length).toBe(2);
    expect(felderNachArt("groesse").length + felderNachArt("rolle").length).toBe(RANKING_FELDER.length);
  });

  it("hat eindeutige Slugs und überall eine Langform", () => {
    expect(new Set(RANKING_FELDER.map((f) => f.slug)).size).toBe(RANKING_FELDER.length);
    for (const f of RANKING_FELDER) {
      expect(f.label.length).toBeGreaterThan(0);
      expect(f.einzahl.length).toBeGreaterThan(0);
      expect(f.langform.length).toBeGreaterThan(0);
    }
  });
});

describe("Adress-Kürzel", () => {
  it("kollidiert mit keinem Bundesland-Kürzel", () => {
    // Die Ranking-Adresse ist <kategorie>[/<feld>][/<bundesland>[/<kreis>]].
    // Wäre ein Feld-Kürzel zugleich ein Bundesland-Kürzel, liesse sich die
    // Adresse nicht mehr eindeutig lesen.
    const laender = BUNDESLAENDER.map((b) => slugify(b.name));
    for (const f of RANKING_FELDER) {
      expect(laender, `Feld „${f.slug}“ kollidiert mit einem Bundesland`).not.toContain(f.slug);
    }
  });

  it("sieht keinem Seitenzahl-Stück ähnlich", () => {
    // "seite-3" wird als Seitenzahl gelesen, bevor das Feld drankommt.
    for (const f of RANKING_FELDER) expect(f.slug).not.toMatch(/^seite-\d/);
  });
});
