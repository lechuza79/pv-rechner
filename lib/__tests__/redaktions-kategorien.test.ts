import { describe, expect, it } from "vitest";
import { KATEGORIEN, kategorie, kategorieAusAdresse } from "../redaktions-kategorien";
import { KARTEN_STILE, kartenTokens, istKartenStil } from "../social-karten-stil";
import { baueAllePosts, type SocialKennzahlen } from "../social-posts";

// Die beiden Ausfälle, die diese Ansicht haben kann, sind von außen unsichtbar:
// ein Reiter ohne Stories (ein Versprechen ohne Inhalt) und eine Story ohne
// Reiter (sie steht nirgends und fehlt nur dem, der sie vermisst).

const basis: SocialKennzahlen = {
  standIso: "2026-08-05T00:00:00+00:00",
  stadtLand: {
    stadtAb: 100_000,
    landUnter: 20_000,
    stadtAnzahl: 80,
    landAnzahl: 10_037,
    stadtJeTausend: 9.9,
    landJeTausend: 22.8,
  },
  wachstum: {
    balkonJetzt: 1_453_026,
    balkonVorJahr: 1_202_467,
    solarKwpJetzt: 127_100_000,
    solarKwpVorJahr: 117_600_000,
  },
  segmente: {
    privatDachKwp: 36_200_000,
    gewerbeDachKwp: 44_500_000,
    freiflaecheKwp: 44_900_000,
    solarGesamtKwp: 127_100_000,
  },
  ueberEinwohner: { mindestEinwohner: 500, betrachtet: 10_000, darueber: 6_848 },
  laender: [
    { name: "Niedersachsen", balkonJeTausend: 23.1, wpProKopf: 505, freiflaecheAnteil: 17.4, solarKwp: 11_300_000, wachstumFuenfJahre: 2.23 },
    { name: "Brandenburg", balkonJeTausend: 20.5, wpProKopf: 377, freiflaecheAnteil: 70.3, solarKwp: 9_800_000, wachstumFuenfJahre: 2.05 },
    { name: "Nordrhein-Westfalen", balkonJeTausend: 16.1, wpProKopf: 378, freiflaecheAnteil: 9.1, solarKwp: 15_500_000, wachstumFuenfJahre: 2.33 },
    { name: "Berlin", balkonJeTausend: 7.1, wpProKopf: 72, freiflaecheAnteil: 0.4, solarKwp: 500_000, wachstumFuenfJahre: 3.48 },
    { name: "Hamburg", balkonJeTausend: 6.1, wpProKopf: 84, freiflaecheAnteil: 0.4, solarKwp: 300_000, wachstumFuenfJahre: 4.38 },
    { name: "Bremen", balkonJeTausend: 5.4, wpProKopf: 61, freiflaecheAnteil: 0.2, solarKwp: 200_000, wachstumFuenfJahre: 3.9 },
  ],
};

const posts = baueAllePosts(basis);

describe("Kategorien der Redaktionsansicht", () => {
  it("jede Story steht unter genau einem Reiter", () => {
    const schluessel = KATEGORIEN.map((k) => k.schluessel);
    for (const p of posts) {
      expect(schluessel, `${p.id} hat eine unbekannte Kategorie`).toContain(p.kategorie);
    }
  });

  it("kein Reiter ohne Stories", () => {
    // Eine Kategorie entsteht mit ihrer ersten Story. Ein leerer Reiter zeigt
    // eine Beschreibung und darunter nichts — das sieht nach einem Fehler aus
    // und ist als Zusage schlechter als gar kein Reiter.
    for (const k of KATEGORIEN) {
      expect(posts.filter((p) => p.kategorie === k.schluessel).length, `${k.schluessel} ist leer`).toBeGreaterThan(0);
    }
  });

  it("jede Kategorie sagt, was sie behauptet und woran sie scheitert", () => {
    for (const k of KATEGORIEN) {
      expect(k.beschreibung.length, `${k.schluessel} ohne Beschreibung`).toBeGreaterThan(80);
      expect(k.kurz.length, `${k.schluessel}: Nav-Beschriftung zu lang für eine Zeile`).toBeLessThanOrEqual(16);
      expect(KARTEN_STILE).toContain(k.stil);
    }
  });

  it("eine Story ohne eigene Wahl trägt das Design ihrer Kategorie", () => {
    // Sonst wäre der Vorgabe-Stil eine Behauptung: Man sähe der Karte nicht an,
    // ob sie dem Kategorie-Design folgt oder zufällig genauso aussieht.
    for (const p of posts) {
      expect(p.bild?.stil, `${p.id} folgt seiner Kategorie nicht`).toBe(kategorie(p.kategorie).stil);
    }
  });

  it("eine gespeicherte Wahl schlägt die Vorgabe — Unbekanntes nicht", () => {
    const [gewaehlt] = baueAllePosts(basis, { "stadt-land-balkon": { stil: "highlight" } });
    expect(gewaehlt.bild?.stil).toBe("highlight");

    // Ein Stil, den wir nicht mehr kennen, ist ein Fund für den Code und kein
    // Grund für eine ungefärbte Karte.
    const [zurueck] = baueAllePosts(basis, {
      "stadt-land-balkon": { stil: "neonpink" as never },
    });
    expect(zurueck.bild?.stil).toBe(kategorie("kontrast").stil);
  });

  it("ein alter Adressteil führt auf die erste Kategorie, ein falscher Code-Schlüssel wirft", () => {
    expect(kategorieAusAdresse("gibtsnicht").schluessel).toBe(KATEGORIEN[0].schluessel);
    expect(kategorieAusAdresse(undefined).schluessel).toBe(KATEGORIEN[0].schluessel);
    expect(() => kategorie("gibtsnicht" as never)).toThrow();
  });
});

describe("Farbschemata der Karte", () => {
  it("jeder Stil setzt Grund UND Textfarben — sonst erbt die Karte von der Seite", () => {
    for (const s of KARTEN_STILE) {
      const t = kartenTokens(s);
      for (const token of ["--color-bg", "--color-text-primary", "--color-text-secondary", "--color-accent"]) {
        expect(t[token], `${s} ohne ${token}`).toBeTruthy();
      }
    }
  });

  it("Highlight hat einen blauen Grund, nicht den weißen", () => {
    expect(kartenTokens("highlight")["--color-bg"]).not.toBe(kartenTokens("hell")["--color-bg"]);
  });

  it("erkennt nur die Stile, die es gibt", () => {
    expect(istKartenStil("highlight")).toBe(true);
    expect(istKartenStil("neonpink")).toBe(false);
    expect(istKartenStil(undefined)).toBe(false);
  });
});
