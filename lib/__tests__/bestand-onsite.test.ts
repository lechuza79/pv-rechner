import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { baueAllePosts, type SocialKennzahlen } from "../social-posts";

// Die Bestandsseite holt sich zwei Datengeschichten aus dem Post-Modul. Sucht
// sie ins Leere, fehlen zwei Abschnitte — und die Seite sieht dabei völlig
// normal aus: keine Fehlermeldung, kein roter Test, kein kaputtes Layout. Genau
// das ist am 02.09.2026 passiert, als der Ausbau des Redaktionstischs den
// Beitrags-Kennungen ein Ordnungspräfix gab („g13-…"). Die Seite sucht seitdem
// über den ANKER der Onsite-Fassung, und dieser Test hält beide Enden zusammen.

const ROOT = join(__dirname, "..", "..");

const basis: SocialKennzahlen = {
  standIso: "2026-08-05T00:00:00+00:00",
  stichtagJahr: 2025,
  stadtLand: { stadtAb: 100_000, landUnter: 20_000, stadtAnzahl: 80, landAnzahl: 10_037, stadtJeTausend: 9.9, landJeTausend: 22.8 },
  wachstum: { balkonJetzt: 1_454_592, balkonVorJahr: 1_203_761, solarKwpJetzt: 127_400_000, solarKwpVorJahr: 117_890_000 },
  segmente: { privatDachKwp: 36_250_000, gewerbeDachKwp: 44_650_000, freiflaecheKwp: 44_940_000, solarGesamtKwp: 127_400_000 },
  ueberEinwohner: { mindestEinwohner: 500, betrachtet: 10_000, darueber: 6_848 },
  foerderung: { programme: 108, gemeinden: 97, nurBalkon: 12, ohneHoechstbetrag: 61, mitAntragVorher: 74 },
  kohorte: { privatAnlagen: 3_120_000, mittlereKwp: 9.4, speicherEinheiten: 1_180_000, speicherJe100: 37.8 },
  anomalie: { ort: "Beispielstadt", einwohner: 24_500, jeTausend: 61.2, bundesJeTausend: 17.3, mindestEinwohner: 5_000 },
  laender: [
    { name: "Niedersachsen", balkonJeTausend: 23.1, wpProKopf: 505, privatDachKwp: 1_000_000, speicherJe100: 30, freiflaecheAnteil: 17.4, solarKwp: 11_300_000, wachstumFuenfJahre: 2.23 },
    { name: "Brandenburg", balkonJeTausend: 20.5, wpProKopf: 3852, privatDachKwp: 1_000_000, speicherJe100: 30, freiflaecheAnteil: 70.3, solarKwp: 9_800_000, wachstumFuenfJahre: 2.05 },
    { name: "Bremen", balkonJeTausend: 11.1, wpProKopf: 300, privatDachKwp: 1_000_000, speicherJe100: 30, freiflaecheAnteil: 0.4, solarKwp: 211_000, wachstumFuenfJahre: 2.4 },
    { name: "Berlin", balkonJeTausend: 7.1, wpProKopf: 148, privatDachKwp: 1_000_000, speicherJe100: 30, freiflaecheAnteil: 0.4, solarKwp: 547_000, wachstumFuenfJahre: 3.48 },
    { name: "Hamburg", balkonJeTausend: 6.1, wpProKopf: 157, privatDachKwp: 1_000_000, speicherJe100: 30, freiflaecheAnteil: 0.4, solarKwp: 293_000, wachstumFuenfJahre: 4.38 },
  ],
};

/** Die Anker, die die Seite anspricht — aus ihrem Quelltext gelesen. */
function ankerDerSeite(): string[] {
  const quelle = readFileSync(join(ROOT, "app", "(site)", "photovoltaik-bestand-deutschland", "page.tsx"), "utf8");
  return [...quelle.matchAll(/onsiteMit\("([^"]+)"\)/g)].map((m) => m[1]);
}

describe("Die Bestandsseite findet ihre Datengeschichten", () => {
  const anker = ankerDerSeite();
  const vorhanden = baueAllePosts(basis).map((p) => p.onsite?.anker).filter(Boolean);

  it("spricht überhaupt welche an", () => {
    // Die Gegenprobe: Findet der Test die Aufrufe nicht mehr (umbenannte
    // Hilfsfunktion), verglich er zwei leere Listen und bliebe grün.
    expect(anker.length).toBeGreaterThanOrEqual(2);
  });

  it("jeder angesprochene Anker existiert wirklich", () => {
    for (const a of anker) {
      expect(vorhanden, `Die Seite sucht „${a}", es gibt aber nur: ${vorhanden.join(", ")}`).toContain(a);
    }
  });

  it("die beiden Fassungen tragen Überschrift und Absätze", () => {
    // Ein Anker, hinter dem nichts steht, ergibt eine leere Überschrift.
    for (const p of baueAllePosts(basis)) {
      if (!p.onsite || !anker.includes(p.onsite.anker)) continue;
      expect(p.onsite.ueberschrift.length, p.onsite.anker).toBeGreaterThan(10);
      expect(p.onsite.absaetze.length, p.onsite.anker).toBeGreaterThan(1);
    }
  });
});
