import { describe, it, expect } from "vitest";
import { zuSammlungsZeile } from "../angebot-sammlung";
import { WAERMEPUMPE, PHOTOVOLTAIK } from "../angebot-gewerk";
import type { AusgelesenesAngebot } from "../angebot-check";

// Die Sammlung ist der einzige Teil der Prüfung, der etwas BEHÄLT. Diese Tests
// sind ihre Absicherung — nicht der Kommentar über der Funktion.

const angebot = (teil: Partial<AusgelesenesAngebot> = {}): AusgelesenesAngebot => ({
  geraet: null, marke: null, leistungKw: null, gesamtpreisEur: null,
  positionen: [], rueckfragen: [], unsicher: [], ...teil,
});

describe("Was NICHT in die Sammlung gelangt", () => {
  // Der Fall, der wehtut: Der Meister hat sich nicht an seine Anweisung
  // gehalten und eine Anschrift in den Wortlaut einer Position geschrieben.
  // Die Sammlung darf sie trotzdem nicht behalten.
  const verraeterisch = angebot({
    geraet: "Vaillant aroTHERM plus VWL 105/8.1",
    leistungKw: 10,
    gesamtpreisEur: 41206.21,
    positionen: [
      { id: "montage", wortlaut: "Montage bei Familie Schmidt, Lindenweg 4, 34212 Melsungen", betragEur: 5600, enthaeltAuch: [] },
    ],
    rueckfragen: [{ text: "Frag Herrn Beyaz nach dem Fundament.", bezug: "fundament" }],
    unsicher: ["Der Name des Betriebs steht auf jeder Seite."],
  });

  const zeile = zuSammlungsZeile(verraeterisch, WAERMEPUMPE, "2026-08", "06");
  const alsText = JSON.stringify(zeile);

  it("behält keinen Wortlaut einer Position", () => {
    expect(alsText).not.toMatch(/Lindenweg|Melsungen|Schmidt/);
  });

  it("behält keine Rückfragen", () => {
    expect(alsText).not.toMatch(/Beyaz|Frag/);
  });

  it("behält nichts aus den Unsicherheiten", () => {
    expect(alsText).not.toMatch(/jeder Seite/);
  });

  it("behält von einer Position nur Kategorie und Betrag", () => {
    expect(zeile.positionen_mit_preis).toEqual(["montage"]);
    expect(zeile.betraege).toEqual({ montage: 5600 });
  });
});

describe("Vergröberung", () => {
  const zeile = zuSammlungsZeile(
    angebot({ leistungKw: 10, gesamtpreisEur: 41206.21, positionen: [{ id: "montage", wortlaut: "x", betragEur: 5637.29, enthaeltAuch: [] }] }),
    WAERMEPUMPE, "2026-08", "06",
  );

  it("rundet den Gesamtpreis auf hundert Euro", () => {
    expect(zeile.gesamtpreis).toBe(41200);
  });

  it("rundet Einzelbeträge auf zehn Euro", () => {
    expect(zeile.betraege.montage).toBe(5640);
  });

  it("rechnet die spezifischen Kosten selbst und rundet sie", () => {
    expect(zeile.spez_kosten).toBe(4120);
  });

  it("nimmt Monat und Region, wie sie hereingereicht werden — ohne eigene Uhr", () => {
    // Dieselbe Regel wie beim Förder-Verlauf: Eine Funktion, die selbst auf die
    // Uhr sieht, lässt sich nicht prüfen.
    expect(zeile.monat).toBe("2026-08");
    expect(zeile.region).toBe("06");
  });
});

describe("Positionen einordnen", () => {
  it("trennt mit Preis, gebündelt und fehlend", () => {
    const zeile = zuSammlungsZeile(angebot({
      positionen: [
        { id: "geraet", wortlaut: "WP inkl. Speicher", betragEur: 12000, enthaeltAuch: ["pufferspeicher"] },
        { id: "montage", wortlaut: "Montage", betragEur: null, enthaeltAuch: [] },
      ],
    }), WAERMEPUMPE, "2026-08", null);

    expect(zeile.positionen_mit_preis).toEqual(["geraet"]);
    expect(zeile.positionen_gebuendelt.sort()).toEqual(["montage", "pufferspeicher"]);
    expect(zeile.positionen_fehlend).toContain("elektroinstallation");
    expect(zeile.positionen_fehlend).not.toContain("geraet");
  });

  it("misst gegen die Positionen DES GEWERKS, nicht gegen eine feste Liste", () => {
    const zeile = zuSammlungsZeile(angebot(), PHOTOVOLTAIK, "2026-08", null);
    expect(zeile.gewerk).toBe("pv");
    expect(zeile.positionen_fehlend).toContain("wechselrichter");
    expect(zeile.positionen_fehlend).not.toContain("hydraulischer-abgleich");
  });
});
