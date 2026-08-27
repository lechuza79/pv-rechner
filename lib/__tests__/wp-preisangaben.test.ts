import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { preisZusatz, type WpGeraet } from "../wp-katalog";

/**
 * Was neben dem Preis stehen muss — und warum nicht aus der Verordnung, an die
 * man zuerst denkt.
 *
 * § 5b Abs. 1 Nr. 3 UWG macht Gesamtpreis und Lieferkosten zur wesentlichen
 * Information, sobald Waren unter Hinweis auf Merkmale und Preis so dargestellt
 * werden, dass ein Verbraucher das Geschäft abschließen kann. Die Kacheln tun
 * genau das.
 *
 * Die Preisangabenverordnung trifft uns dagegen NICHT, obwohl sie näher liegt:
 * Beide Alternativen des § 3 Abs. 1 PAngV setzen die Anbietereigenschaft voraus
 * ("als Anbieter von Waren ... unter Angabe von Preisen wirbt"), § 6 Abs. 1
 * sogar ein Angebot "zum Abschluss eines Fernabsatzvertrages". Anbieter der
 * Wärmepumpe ist der Händler. Eine erste Fassung dieses Tests stützte sich auf
 * die Verordnung — die Lesung des Volltextes hat die eigene Annahme widerlegt,
 * die Angaben blieben dieselben. Beide Normen am 27.08.2026 im Original
 * gelesen, Belege in `lib/rechtsbelege.ts`.
 *
 * Am 27.08.2026 am Shop gegengeprüft, nicht angenommen: Der Datenstrom liefert
 * brutto (Haier HPM14-Nd2, 4.598,00 € — die Produktseite schreibt "inkl. 19%
 * MwSt. | Versandkostenfrei"). Hätte er netto geliefert, wäre jede Zahl in
 * jeder Kachel um 19 % zu niedrig gewesen, ohne dass es irgendwo aufgefallen
 * wäre.
 */

const g = (ueber: Partial<WpGeraet> = {}): WpGeraet => ({
  id: "1",
  name: "Testgerät",
  marke: "TEST",
  leistungKw: 10,
  herkunft: "ausgeschrieben",
  bauart: "luft-wasser",
  preisEur: 9000,
  versandEur: 0,
  link: "https://example.invalid",
  bildUrl: null,
  lieferbar: true,
  vorlaufMaxC: 65,
  kaeltemittel: "r290",
  aufbau: "monoblock",
  umfang: "geraet",
  ...ueber,
});

describe("Pflichtangaben zum Preis", () => {
  it("nennt immer die Umsatzsteuer", () => {
    for (const versand of [0, 5.9, null]) {
      expect(preisZusatz(g({ versandEur: versand }))).toMatch(/inkl\. MwSt\./);
    }
  });

  it("schreibt 'versandkostenfrei' nur bei null", () => {
    expect(preisZusatz(g({ versandEur: 0 }))).toBe("inkl. MwSt., versandkostenfrei");
  });

  it("nennt Versandkosten mit Betrag, wenn welche anfallen", () => {
    // Real: 21 von 2.413 Artikeln der Wärmepumpen-Kategorie tragen 5,90 €.
    // Pauschal "versandkostenfrei" wäre für die eine Falschangabe.
    expect(preisZusatz(g({ versandEur: 5.9 }))).toBe("inkl. MwSt., zzgl. 5,90 € Versand");
    expect(preisZusatz(g({ versandEur: 39.8 }))).toBe("inkl. MwSt., zzgl. 39,80 € Versand");
  });

  it("übersteht die Schnittstelle — null, nicht NaN", () => {
    // JSON kennt kein NaN und macht daraus stillschweigend null. Der Typ hätte
    // `number` behauptet, im Browser wäre etwas anderes angekommen.
    const durchJson = JSON.parse(JSON.stringify(g({ versandEur: null }))) as WpGeraet;
    expect(durchJson.versandEur).toBeNull();
    expect(preisZusatz(durchJson)).toBe("inkl. MwSt.");
  });

  it("behauptet bei fehlender Angabe KEINE Versandkostenfreiheit", () => {
    // "unbekannt" und "kostenlos" sind zwei Aussagen. Eine fehlende Angabe zu
    // einer Null zu runden wäre eine erfundene Preisangabe — dieselbe
    // Fehlerklasse wie ein erfundenes Prüfdatum.
    const text = preisZusatz(g({ versandEur: null }));
    expect(text).toBe("inkl. MwSt.");
    expect(text).not.toMatch(/versandkostenfrei|Versand/);
  });

  it("steht als eine Quelle im Code, nicht an der Kachel getippt", () => {
    const kachel = fs.readFileSync(
      path.resolve(__dirname, "..", "..", "components", "WpGeraeteEmpfehlung.tsx"),
      "utf-8",
    );
    expect(kachel).toMatch(/preisZusatz\(g\)/);
    // Kein handgetippter Steuer- oder Versandhinweis daneben.
    const ausgeliefert = kachel
      .split("\n")
      .filter((z) => !/^\s*(\/\/|\*|\/\*)/.test(z))
      .join("\n");
    expect(ausgeliefert).not.toMatch(/"[^"]*inkl\. MwSt/);
    expect(ausgeliefert).not.toMatch(/>\s*versandkostenfrei/i);
  });

  it("nennt den Erhebungszeitpunkt der Preise", () => {
    // Ein Preis ohne Datum behauptet Aktualität, die ein täglich abgerufener
    // Datenstrom nicht zusagen kann (BGH I ZR 140/07).
    const kachel = fs.readFileSync(
      path.resolve(__dirname, "..", "..", "components", "WpGeraeteEmpfehlung.tsx"),
      "utf-8",
    );
    expect(kachel).toMatch(/Preise vom \$\{preisStand\}/);
    expect(kachel).toMatch(/es gilt der Preis im Shop/);
  });

  it("führt die Versandkosten von der Datenbank bis in die Kachel durch", () => {
    const wurzel = path.resolve(__dirname, "..", "..");
    const lies = (p: string) => fs.readFileSync(path.join(wurzel, p), "utf-8");
    expect(lies("app/api/wp-katalog/setup/route.ts")).toMatch(
      /ADD COLUMN IF NOT EXISTS versand_eur/,
    );
    expect(lies("scripts/wp-katalog-sync.ts")).toMatch(/versand_eur:/);
    expect(lies("lib/wp-katalog-db.ts")).toMatch(/versand_eur/);
    // Die Leseseite darf NULL nicht zu 0 machen.
    expect(lies("lib/wp-katalog-db.ts")).toMatch(/versand_eur === null \? null/);
  });
});
