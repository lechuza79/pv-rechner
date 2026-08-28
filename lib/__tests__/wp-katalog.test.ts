import { describe, it, expect } from "vitest";
import {
  leistungAusName,
  leistungAusTyp,
  geraetAusZeile,
  leistungAnzeigbar,
  bauartAus,
  TYPENSCHLUESSEL,
  type FeedZeile,
} from "../wp-katalog";
import pruefdaten from "./wp-katalog-pruefsteine.json";

// Die Prüfsteine sind ECHTE Zeilen aus dem Händler-Datenstrom (25.08.2026):
// Geräte, die ihre Leistung ausgeschrieben tragen UND eine Typenbezeichnung
// haben. An ihnen lässt sich jede Typenregel widerlegen — die ausgeschriebene
// Zahl ist die Wahrheit, die abgeleitete der Kandidat.

describe("Typenschlüssel gegen echte Händlerdaten", () => {
  it("jede Regel trifft die ausgeschriebene Leistung ihrer Marke", () => {
    const daneben: string[] = [];
    let geprueft = 0;

    for (const p of pruefdaten.pruefsteine) {
      const abgeleitet = leistungAusTyp(p.name, p.marke);
      if (abgeleitet === null) continue;
      geprueft++;
      // Toleranz: 1 kW oder 12 % — die Typennummer ist eine Baugröße, keine
      // Messgröße. Größer darf sie nicht werden, sonst landet ein 7-kW-Gerät
      // in der Auswahl für ein Haus mit 10 kW Heizlast.
      const grenze = Math.max(1.0, p.leistungKw * 0.12);
      if (Math.abs(abgeleitet - p.leistungKw) > grenze) {
        daneben.push(`${p.name} — Regel sagt ${abgeleitet} kW, Händler ${p.leistungKw} kW`);
      }
    }

    expect(geprueft).toBeGreaterThanOrEqual(10);
    expect(daneben).toEqual([]);
  });

  it("jede Regel nennt, woran sie geeicht wurde", () => {
    for (const t of TYPENSCHLUESSEL) {
      expect(t.geeicht.length).toBeGreaterThan(40);
      expect(t.geeicht).toMatch(/\d{2}\.\d{2}\.\d{4}/);
    }
  });

  it("Bosch und Wolf haben bewusst keine Regel", () => {
    // Beide sind im Modulkopf mit Grund ausgeschlossen. Wer hier eine Regel
    // ergänzt, braucht erst Prüfsteine — bei Wolf gibt es im Datenstrom keine.
    const marken = TYPENSCHLUESSEL.map((t) => t.marke);
    expect(marken).not.toContain("BOSCH");
    expect(marken).not.toContain("WOLF");
  });
});

describe("Leistung aus dem Produktnamen", () => {
  it("liest die ausgeschriebene Angabe", () => {
    expect(
      leistungAusName("Viessmann Vitocal 200-A Luft/Wasser-Wärmepumpe, 12,4 kW, Typ AWCI-AC 201.A10"),
    ).toBe(12.4);
  });

  it("nimmt die Heizstab-Leistung NICHT für die Heizleistung", () => {
    // Echter Fall: Das Gerät hat rund 16 kW, der Name nennt den Heizstab.
    // Ohne diesen Ausschluss käme es als 9-kW-Gerät in die Auswahl.
    expect(
      leistungAusName(
        "Wolf CHA-16/20 Mod. Luft/Wasser-Wärmepumpe in Monoblockbauweise, E-Heizstab 9 kW",
      ),
    ).toBeNull();
  });

  it("liefert null, wo keine Angabe steht", () => {
    expect(leistungAusName("Vaillant aroTHERM Split VWL 125/5 AS, uniTOWER VWL 128/5 IS")).toBeNull();
  });
});

describe("Herkunft der Leistung", () => {
  const basis: FeedZeile = {
    aw_product_id: "1",
    product_name: "",
    brand_name: "VAILLANT",
    search_price: "9689.00",
    aw_deep_link: "https://www.awin1.com/x",
    merchant_image_url: "https://bild",
    in_stock: "1",
    merchant_product_category_path: "Wärmepumpen > Vaillant",
  };

  it("eine abgeleitete Leistung darf nicht als Zahl angezeigt werden", () => {
    const g = geraetAusZeile({
      ...basis,
      product_name: "Vaillant aroTHERM plus VWL 125/8.1 A Monoblock",
    });
    expect(g?.leistungKw).toBe(12);
    expect(g?.herkunft).toBe("typenschluessel");
    expect(leistungAnzeigbar(g!)).toBe(false);
  });

  it("eine ausgeschriebene Leistung darf angezeigt werden", () => {
    const g = geraetAusZeile({
      ...basis,
      product_name: "Vaillant aroTHERM plus VWL 125/8.1 A Luft-Wasser-Wärmepumpe 12 kW, Monoblock",
    });
    expect(g?.herkunft).toBe("ausgeschrieben");
    expect(leistungAnzeigbar(g!)).toBe(true);
  });
});

describe("Was kein Gerät ist", () => {
  const zeilen = pruefdaten.feedzeilen as FeedZeile[];

  it("verwirft Zubehör, auch wenn es in der Wärmepumpen-Kategorie liegt", () => {
    const g = geraetAusZeile({
      ...zeilen[0],
      product_name: "Buderus Logalux PNR 500-C Pufferspeicher für Wärmepumpe, 10 kW",
      search_price: "1899.00",
    });
    expect(g).toBeNull();
  });

  it("verwirft Artikel unterhalb der Preisschwelle", () => {
    const g = geraetAusZeile({
      ...zeilen[0],
      product_name: "Viessmann Luft/Wasser-Wärmepumpe 8 kW",
      search_price: "89.90",
    });
    expect(g).toBeNull();
  });

  it("verwirft Geräte ohne zuordenbare Leistung", () => {
    const g = geraetAusZeile({
      ...zeilen[0],
      product_name: "Junkers Bosch Compress CS7000iAW 13 IRE-T",
      brand_name: "BOSCH",
      search_price: "12000.00",
    });
    expect(g).toBeNull();
  });

  it("echte Feed-Zeilen laufen ohne Ausnahme durch", () => {
    for (const z of zeilen) expect(() => geraetAusZeile(z)).not.toThrow();
  });
});

describe("Nur vollständige Geräte", () => {
  // Alle vier Namen sind echte Artikel aus dem Datenstrom vom 25.08.2026. Jeder
  // ist beim Bauen einmal durchgerutscht und stand als Empfehlung in der Liste.
  const basis: FeedZeile = {
    aw_product_id: "1",
    product_name: "",
    brand_name: "",
    search_price: "3849.00",
    aw_deep_link: "https://www.awin1.com/x",
    merchant_image_url: "",
    in_stock: "1",
    merchant_product_category_path: "Wärmepumpen > X",
  };

  const halbeGeraete = [
    "Buderus Inneneinheit Luft-Wasser-Wärmepumpe WLW176i-12 E, 8 kW",
    "Vaillant uniTOWER VWL 78/5 IS für aroTHERM Split, 7 kW",
    "Vaillant aroTHERM Split VWL 75/5 AS, Heizungswärmepumpe, Luft/Wasser Wärmepumpe, 7 kW",
    "Haier Split Inneneinheit 6 kW Hydraulikstation, R290",
  ];

  it.each(halbeGeraete)("verwirft: %s", (name) => {
    expect(geraetAusZeile({ ...basis, product_name: name })).toBeNull();
  });

  const ganzeGeraete = [
    "LG Therma V R32 Monobloc S2 Luft/Wasser Wärmepumpe, HM071MRS.UA40, 230 V, 7 kW",
    "Vaillant aroTHERM Split VWL 125/5 AS, VWL 127/5 IS, Heizungswärmepumpe, 12 kW",
    "Bosch Luft/Wasser-Wärmepumpe Compress CS5800iAW 12 M, AW 4-OR-S, inkl. Kompaktmodul, 7 kW",
  ];

  it.each(ganzeGeraete)("nimmt: %s", (name) => {
    expect(geraetAusZeile({ ...basis, product_name: name })).not.toBeNull();
  });

  it("verwirft Brauchwasser-Wärmepumpen — die heizen das Haus nicht", () => {
    // 1,5 kW für 1.569 € sähe wie ein Schnäppchen für ein kleines Haus aus.
    const g = geraetAusZeile({
      ...basis,
      product_name: "Tesy Brauchwasser-Wärmepumpe AquaThermica Pro HPWH 4.11, 200 L, 1,5 kW",
      search_price: "1569.00",
    });
    expect(g).toBeNull();
  });

  it("verwirft Gas-Hybride — unser Rechner kennt die Mischform nicht", () => {
    const g = geraetAusZeile({
      ...basis,
      product_name: "Daikin Altherma R Hybrid, Gas-Brennwertgerät 32 kW, Gas-Hybrid-Wärmepumpe, 8 kW",
      search_price: "5589.00",
    });
    expect(g).toBeNull();
  });
});

describe("Bauart", () => {
  it("erkennt Sole/Wasser", () => {
    expect(bauartAus("Buderus WSW186i-8 Sole-Wasser-Wärmepumpe", "Wärmepumpen")).toBe("sole-wasser");
  });

  it("erkennt Luft/Wasser", () => {
    expect(bauartAus("Vaillant aroTHERM Luft-Wasser-Wärmepumpe", "Wärmepumpen")).toBe("luft-wasser");
  });

  it("sagt „unbekannt“ statt zu raten", () => {
    expect(bauartAus("Viessmann Vitocal 250", "Wärmepumpen")).toBe("unbekannt");
  });
});
