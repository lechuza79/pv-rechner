import { describe, it, expect } from "vitest";
import { partnerSetReferenz, marktAbgleich, setKlasse } from "../balkon-partner-referenz";
import { DEFAULT_BALKON_CONFIG } from "../balkon-config";
import type { ShopAngebot } from "../shop-solakon";

const angebot = (produkt: string, moduleWp: number, preis: number, variante: string, extra: Partial<ShopAngebot> = {}): ShopAngebot => ({
  id: `${produkt}-${variante}-${preis}`, haendler: "solakon", haendlerName: "Solakon", produkt, moduleWp,
  inverterW: 800, speicherKwh: 0, preis, streichpreis: null, lieferbar: true,
  url: "https://example.invalid", bildUrl: null, variante, ...extra,
});

// Excerpt of the live catalogue on 15.10.2026 (no-storage variants plus one
// storage variant per product), the snapshot the current start prices come from.
const KATALOG_2026_10_15: ShopAngebot[] = [
  angebot("onLite", 900, 199.99, "ohne Halterung / ohne Speicher / 5m"),
  angebot("onLite", 900, 299.99, "Balkon / ohne Speicher / 5m"),
  angebot("onLite", 900, 319.99, "Balkon / ohne Speicher / 10m"),
  angebot("onLite", 900, 349.99, "Ziegeldach (Paarmontage) / ohne Speicher / 5m"),
  angebot("onLite", 900, 799.99, "Balkon / 1x Speicher / 5m", { speicherKwh: 2.11 }),
  angebot("onBasic", 1000, 249.99, "ohne Halterung / ohne Speicher / 5m"),
  angebot("onBasic", 1000, 349.99, "Balkon / ohne Speicher / 5m"),
  angebot("onBasic", 1000, 369.99, "Balkon / ohne Speicher / 10m"),
  angebot("onPower", 2000, 399.99, "ohne Halterung / ohne Speicher / 5m"),
  angebot("onPower", 2000, 599.99, "Balkon / ohne Speicher / 5m"),
  angebot("onPower", 2000, 699.99, "Ziegeldach (Paarmontage) / ohne Speicher / 5m"),
  angebot("onPower", 2000, 949.99, "Balkon / 1x Speicher / 5m", { speicherKwh: 2.11 }),
];

describe("partner reference for the start sets", () => {
  const ref = partnerSetReferenz(KATALOG_2026_10_15, DEFAULT_BALKON_CONFIG.sets);

  it("takes the balcony-mount variant without storage closest in module power", () => {
    // 960 Wp: onBasic (1000 Wp, 40 away) beats onLite (900 Wp, 60 away), even though onLite is cheaper.
    expect(ref.duo?.angebot.produkt).toBe("onBasic");
    expect(ref.duo?.preis).toBe(350);
    expect(ref.max?.preis).toBe(600);
  });

  it("the stored start prices are this rule applied to the 15.10.2026 catalogue", () => {
    const preis = (id: string) => DEFAULT_BALKON_CONFIG.sets.find(s => s.id === id)!.price;
    expect(preis("duo")).toBe(ref.duo?.preis);
    expect(preis("max")).toBe(ref.max?.preis);
  });

  it("has no reference for a class the partner does not sell", () => {
    expect(ref.single).toBeNull();
  });

  // Negative samples: each excluded variant would otherwise be the cheapest.
  it("ignores variants without mount, with storage or not deliverable", () => {
    const nurFalsche = [
      angebot("x", 1000, 150, "ohne Halterung / ohne Speicher / 5m"),
      angebot("x", 1000, 160, "Balkon / 1x Speicher / 5m", { speicherKwh: 2.11 }),
      angebot("x", 1000, 170, "Balkon / ohne Speicher / 5m", { lieferbar: false }),
      angebot("x", 1000, 180, "Ziegeldach (Paarmontage) / ohne Speicher / 5m"),
    ];
    expect(partnerSetReferenz(nurFalsche, DEFAULT_BALKON_CONFIG.sets).duo).toBeNull();
    expect(partnerSetReferenz([...nurFalsche, ...KATALOG_2026_10_15], DEFAULT_BALKON_CONFIG.sets).duo?.preis).toBe(350);
  });

  it("classes by module power like the calculator does", () => {
    expect([setKlasse(500), setKlasse(600), setKlasse(960), setKlasse(1200), setKlasse(2000)]).toEqual(["single", "single", "duo", "duo", "max"]);
  });
});

describe("market check decides what the watcher may take over", () => {
  const ref = partnerSetReferenz(KATALOG_2026_10_15, DEFAULT_BALKON_CONFIG.sets);

  it("takes over a partner price inside the market range, however large the jump", () => {
    expect(marktAbgleich(500, ref.duo, { min: 250, max: 500 })).toEqual({ urteil: "uebernehmen", neu: 350 });
  });

  it("confirms an unchanged price", () => {
    expect(marktAbgleich(350, ref.duo, { min: 250, max: 500 })).toEqual({ urteil: "bestaetigt", neu: 350 });
  });

  it("never takes over a partner price outside the market range", () => {
    expect(marktAbgleich(500, ref.duo, { min: 400, max: 600 })).toEqual({ urteil: "widerspruch", neu: 500 });
    expect(marktAbgleich(500, ref.duo, null)).toEqual({ urteil: "widerspruch", neu: 500 });
  });

  it("leaves classes without a partner set to the market research", () => {
    expect(marktAbgleich(300, ref.single, { min: 150, max: 570 })).toEqual({ urteil: "ohne-partner", neu: 300 });
  });
});
