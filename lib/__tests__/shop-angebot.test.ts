import { describe, it, expect } from "vitest";
import {
  angeboteAusShopify,
  angebotUrl,
  istB2b,
  moduleWpAusTitel,
  speicherKwhAusVariante,
  SOLAKON_REF,
  type ShopifyProdukt,
  type ShopAngebot,
} from "../shop-solakon";
import { besteAngebote, bewerteAngebot, empfiehlAngebot, guenstigsteJeKombination } from "../shop-angebot";
import { calcBalkon } from "../balkon";
import { DEFAULT_BALKON_CONFIG as CFG } from "../balkon-config";
import { preisTeile, jahreDativ, produktSpeicherTeile } from "../atlas-format";

/**
 * Die Fehlerklasse, gegen die diese Tests gebaut sind, ist von außen unsichtbar:
 * Eine falsch gelesene Variante, ein mitgenommener Nettopreis oder eine
 * verwechselte Speichergröße sieht auf der Seite in jedem Fall wie ein Preis
 * aus. Ein Nutzer, der danach kauft, merkt es erst an der Rechnung.
 */

// Ausschnitt aus der echten Produktliste, am 09.09.2026 abgerufen. Bewusst mit
// der B2B-Dublette und mit einer nicht lieferbaren Variante.
const ROH: ShopifyProdukt[] = [
  {
    handle: "onbasic",
    title: "onBasic: 1000 Watt Balkonkraftwerk",
    options: [
      { name: "Halterung", values: ["ohne Halterung", "Balkon"] },
      { name: "Speicher", values: ["ohne Speicher", "2.11 kWh"] },
      { name: "Anschlusskabel", values: ["5m", "3m"] },
    ],
    variants: [
      { id: 1, title: "ohne Halterung / ohne Speicher / 5m", price: "249.99", compare_at_price: "335.99", available: true },
      { id: 2, title: "ohne Halterung / 2.11 kWh / 3m", price: "849.99", compare_at_price: "1164.99", available: true },
      { id: 3, title: "Balkon / ohne Speicher / 5m", price: "449.99", compare_at_price: null, available: false },
    ],
    images: [
      { src: "https://cdn.example/onbasic-a.jpg", variant_ids: [1] },
      { src: "https://cdn.example/onbasic-b.jpg", variant_ids: [2, 3] },
    ],
  },
  {
    // B2B-Dublette UNTER EINEM BEKANNTEN HANDLE. Real führt der Shop sie heute
    // unter eigenen Adressen ("onbasic-1000-watt-balkonkraftwerk-b2b"), womit
    // schon die Handle-Liste sie ausschließt — die Titelprüfung ist das zweite
    // Netz für den Tag, an dem der Shop seine Adressen umstellt. Damit dieser
    // Test die Prüfung WIRKLICH prüft und nicht die Handle-Liste, steht sie hier
    // unter einem Handle, den wir kennen.
    handle: "onpower",
    title: "onPower: 2000 Watt Balkonkraftwerk B2B",
    variants: [{ id: 9, title: "ohne Halterung / ohne Speicher / 5m", price: "199.00", available: true }],
  },
  {
    // Kein Set, sondern ein Einzelteil — darf nicht als Angebot auftauchen.
    handle: "solakon-one",
    title: "Solakon ONE",
    variants: [{ id: 20, title: "Default Title", price: "659.00", available: true }],
  },
];

describe("Produktliste lesen", () => {
  it("liest Modulleistung, Speichergröße und Preis je Variante", () => {
    const a = angeboteAusShopify(ROH);
    expect(a).toHaveLength(3);
    expect(a.every(x => x.produkt === "onBasic")).toBe(true);

    const ohneSpeicher = a.find(x => x.variante.includes("ohne Speicher") && x.preis === 249.99)!;
    expect(ohneSpeicher.moduleWp).toBe(1000);
    expect(ohneSpeicher.speicherKwh).toBe(0);
    expect(ohneSpeicher.streichpreis).toBe(335.99);
    expect(ohneSpeicher.produkt).toBe("onBasic");

    const mitSpeicher = a.find(x => x.preis === 849.99)!;
    expect(mitSpeicher.speicherKwh).toBeCloseTo(2.11, 5);
  });

  it("wirft die B2B-Dublette weg — sonst stünden Nettopreise neben Bruttopreisen", () => {
    const a = angeboteAusShopify(ROH);
    expect(a.some(x => x.preis === 199)).toBe(false);
    expect(istB2b("onBasic: 1000 Watt Balkonkraftwerk B2B")).toBe(true);
    expect(istB2b("onBasic: 1000 Watt Balkonkraftwerk")).toBe(false);
  });

  it("nimmt nur Sets auf, keine Einzelteile", () => {
    const a = angeboteAusShopify(ROH);
    expect(a.every(x => x.produkt === "onBasic")).toBe(true);
  });

  it("ordnet jeder Variante ihr eigenes Bild zu", () => {
    const a = angeboteAusShopify(ROH);
    expect(a.find(x => x.preis === 249.99)!.bildUrl).toBe("https://cdn.example/onbasic-a.jpg");
    expect(a.find(x => x.preis === 849.99)!.bildUrl).toBe("https://cdn.example/onbasic-b.jpg");
  });

  it("liest die Modulleistung nicht aus einer beliebigen Zahl", () => {
    expect(moduleWpAusTitel("onPower: 2000 Watt Balkonkraftwerk")).toBe(2000);
    expect(moduleWpAusTitel("Balkonkraftwerk Halterung Ziegeldach")).toBeNull();
  });

  it("liest die Speichergröße mit Punkt UND mit Komma", () => {
    expect(speicherKwhAusVariante("ohne Halterung / 2.11 kWh / 3m")).toBeCloseTo(2.11, 5);
    expect(speicherKwhAusVariante("ohne Halterung / 2,11 kWh / 3m")).toBeCloseTo(2.11, 5);
    expect(speicherKwhAusVariante("ohne Halterung / ohne Speicher / 5m")).toBe(0);
  });
});

describe("Empfehlungslink", () => {
  it("hängt den Empfehlungscode an, ohne die Produktadresse zu verlieren", () => {
    const [a] = angeboteAusShopify(ROH);
    const url = angebotUrl(a);
    expect(url).toContain("/products/onbasic");
    expect(url).toContain(`ref=${SOLAKON_REF}`);
  });

  it("hängt an eine Adresse mit Abfrageteil richtig an", () => {
    const a = { ...angeboteAusShopify(ROH)[0], url: "https://x.de/products/y?a=1" } as ShopAngebot;
    expect(angebotUrl(a)).toBe("https://x.de/products/y?a=1&ref=" + SOLAKON_REF);
  });
});

const BASIS = {
  orientationId: "sued_gelaender" as const,
  presenceId: "teils" as const,
  haushaltKwh: 2800,
  specificYield: 950,
  monthlyYield: null,
  stromPrice: 0.35,
};

describe("Angebot durch den Rechenkern", () => {
  it("rechnet KEIN zweites Fundament — dieselbe Zahl wie calcBalkon mit denselben Größen", () => {
    const a = angeboteAusShopify(ROH).find(x => x.preis === 249.99)!;
    const bewertet = bewerteAngebot(a, BASIS);

    // Gegenprobe: dieselbe Konfiguration von Hand in die Config gelegt.
    const eigen = {
      ...CFG,
      sets: [{ ...CFG.sets.find(s => s.id === "duo")!, moduleWp: 1000, inverterW: 800, price: 249.99 }],
      storage: [{ ...CFG.storage.find(s => s.id === "none")! }],
    };
    const direkt = calcBalkon({ ...BASIS, setId: "duo", storageId: "none" }, eigen);

    expect(bewertet.ergebnis.annualYield).toBe(direkt.annualYield);
    expect(bewertet.ergebnis.selfUsedKwh).toBe(direkt.selfUsedKwh);
    expect(bewertet.ergebnis.lifetimeSaving).toBe(direkt.lifetimeSaving);
  });

  it("zählt den Speicher NICHT doppelt: die Investition ist der Setpreis", () => {
    const a = angeboteAusShopify(ROH).find(x => x.preis === 849.99)!;
    const { ergebnis } = bewerteAngebot(a, BASIS);
    expect(ergebnis.invest).toBe(849.99);
    expect(ergebnis.storagePrice).toBe(0);
    expect(ergebnis.storageKwh).toBeCloseTo(2.11, 5);
  });

  it("empfiehlt nichts, was nicht lieferbar ist", () => {
    const alle = angeboteAusShopify(ROH);
    const bewertet = besteAngebote(alle, BASIS);
    expect(bewertet.every(b => b.angebot.lieferbar)).toBe(true);
    expect(bewertet.some(b => b.angebot.preis === 449.99)).toBe(false);
  });

  it("sortiert nach dem Gewinn für den Nutzer, nicht nach dem Preis", () => {
    const alle = angeboteAusShopify(ROH);
    const bewertet = besteAngebote(alle, BASIS);
    for (let i = 1; i < bewertet.length; i++) {
      expect(bewertet[i - 1].ergebnis.lifetimeSaving).toBeGreaterThanOrEqual(
        bewertet[i].ergebnis.lifetimeSaving,
      );
    }
  });
});

describe("Empfehlung", () => {
  it("zeigt je Modul-/Speicher-Kombination nur eine Zeile", () => {
    // Zwei Varianten, die sich nur in der Kabellänge unterscheiden: für die
    // Rechnung identisch, als zwei Zeilen wäre es eine Auswahl ohne Unterschied.
    const roh: ShopifyProdukt[] = [{
      handle: "onbasic",
      title: "onBasic: 1000 Watt Balkonkraftwerk",
      variants: [
        { id: 1, title: "ohne Halterung / ohne Speicher / 5m", price: "249.99", available: true },
        { id: 2, title: "ohne Halterung / ohne Speicher / 10m", price: "269.99", available: true },
      ],
    }];
    const e = empfiehlAngebot(angeboteAusShopify(roh), BASIS)!;
    expect(e.alternativen).toHaveLength(0);
    // Bei gleichem Nutzen gewinnt der niedrigere Preis für den Nutzer.
    expect(e.beste.angebot.preis).toBe(249.99);
  });

  it("liefert null, wenn nichts lieferbar ist — statt einer leeren Empfehlung", () => {
    const roh: ShopifyProdukt[] = [{
      handle: "onbasic",
      title: "onBasic: 1000 Watt Balkonkraftwerk",
      variants: [{ id: 1, title: "ohne Halterung / ohne Speicher / 5m", price: "249.99", available: false }],
    }];
    expect(empfiehlAngebot(angeboteAusShopify(roh), BASIS)).toBeNull();
  });

  it("höchstens zwei Alternativen neben der Empfehlung", () => {
    const roh: ShopifyProdukt[] = [{
      handle: "onpower",
      title: "onPower: 2000 Watt Balkonkraftwerk",
      variants: [
        { id: 1, title: "ohne Speicher / 5m", price: "399.99", available: true },
        { id: 2, title: "2.11 kWh / 3m", price: "949.99", available: true },
        { id: 3, title: "4.22 kWh / 3m", price: "1499.99", available: true },
        { id: 4, title: "6.33 kWh / 3m", price: "2049.99", available: true },
      ],
    }];
    const e = empfiehlAngebot(angeboteAusShopify(roh), BASIS)!;
    expect(e.alternativen.length).toBeLessThanOrEqual(2);
  });
});

describe("Rechenaufwand", () => {
  /**
   * DIE FEHLERKLASSE IST NICHT „FALSCH", SONDERN „ZU LANGSAM ZUM BENUTZEN" —
   * und sie ist im Diff unsichtbar. Jede Bewertung ist eine volle
   * Jahressimulation über 8.760 Stunden. Beim Bauen einmal wirklich passiert:
   * Mit allen 294 Varianten des Shops erschien der Block im Browser gar nicht
   * mehr, weil die Seite noch rechnete. Dieser Test hält fest, dass entdoppelt
   * wird, BEVOR gerechnet wird.
   */
  it("bewertet je Modul-/Speicher-Kombination nur einmal, nicht jede Variante", () => {
    const varianten = [];
    let id = 100;
    for (const kabel of ["3m", "5m", "10m"]) {
      for (const halterung of ["ohne Halterung", "Balkon", "Wand/Fassade"]) {
        for (const [sp, preis] of [["ohne Speicher", 399], ["2.11 kWh", 949], ["4.22 kWh", 1499]] as const) {
          varianten.push({
            id: id++,
            title: `${halterung} / ${sp} / ${kabel}`,
            price: String(preis + id),
            available: true,
          });
        }
      }
    }
    const roh: ShopifyProdukt[] = [{
      handle: "onpower",
      title: "onPower: 2000 Watt Balkonkraftwerk",
      variants: varianten,
    }];

    const alle = angeboteAusShopify(roh);
    expect(alle).toHaveLength(27);

    // Drei Speicherstufen bei einer Modulleistung = drei Rechnungen, nicht 27.
    expect(guenstigsteJeKombination(alle)).toHaveLength(3);
    expect(besteAngebote(alle, BASIS)).toHaveLength(3);
  });

  it("nimmt je Kombination die günstigste lieferbare Variante", () => {
    const roh: ShopifyProdukt[] = [{
      handle: "onbasic",
      title: "onBasic: 1000 Watt Balkonkraftwerk",
      variants: [
        { id: 1, title: "Balkon / ohne Speicher / 5m", price: "449.99", available: true },
        { id: 2, title: "ohne Halterung / ohne Speicher / 5m", price: "249.99", available: true },
        // billiger, aber nicht lieferbar — darf nicht gewinnen
        { id: 3, title: "ohne Halterung / ohne Speicher / 10m", price: "199.99", available: false },
      ],
    }];
    const [gewaehlt] = guenstigsteJeKombination(angeboteAusShopify(roh));
    expect(gewaehlt.preis).toBe(249.99);
  });
});

describe("Preisdarstellung", () => {
  /**
   * DER PREIS IST DER BETRAG AN DER KASSE, KEINE GRÖSSENANGABE. Beide Fehler
   * standen am 09.09.2026 im Browser: „1,5 Tsd. €" (gestaffelt wie eine
   * Regions-Summe) und, nach dem ersten Fix, „1.500 €" für ein Set, das
   * 1.499,99 € kostet — alle 294 Preise des Shops enden auf ,99.
   */
  it("zeigt den Cent-Betrag, statt auf volle Euro zu runden", () => {
    expect(preisTeile(1499.99).value).toBe("1.499,99");
    expect(preisTeile(249.99).value).toBe("249,99");
  });

  it("lässt bei glatten Beträgen die Nullen weg", () => {
    expect(preisTeile(950).value).toBe("950");
    expect(preisTeile(1200).value).toBe("1.200");
  });

  it("staffelt nie in Tausender", () => {
    const p = preisTeile(2049.99);
    expect(p.value).not.toMatch(/Tsd|k/);
    expect(p.unit).toBe("€");
  });

  it("schreibt Jahresangaben mit Komma und im Dativ", () => {
    // Live stand „bezahlt nach 4.0 Jahre" — englischer Punkt, falscher Fall.
    expect(jahreDativ(4)).toBe("4,0 Jahren");
    expect(jahreDativ(3.14)).toBe("3,1 Jahren");
  });
});

describe("Speichergröße als Produktangabe", () => {
  /**
   * Der Shop führt Stufen von 2,11 kWh. Auf ganze kWh gerundet stand bei uns
   * „2 kWh" und „4 kWh" — und aus 10,55 wurde „11", eine Größe, die es dort
   * gar nicht gibt. Dieselbe Klasse wie ein gerundeter Kaufpreis.
   */
  it("zeigt die Stufen des Shops, statt sie zu runden", () => {
    expect(produktSpeicherTeile(2.11).value).toBe("2,11");
    expect(produktSpeicherTeile(10.55).value).toBe("10,55");
    expect(produktSpeicherTeile(12.66).value).toBe("12,66");
  });

  it("lässt bei glatten Größen die Nullen weg", () => {
    expect(produktSpeicherTeile(5).value).toBe("5");
  });
});
