import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * DIE SEITENFASSUNG EINER ORTSGESCHICHTE STEHT AN EINER STELLE.
 *
 * Zwei Oberflächen zeigen sie: die Gemeindeseite, wo sie wirklich steht, und
 * das Design-Werkzeug, wo sie abgenommen wird. Als der Umschalter „Feed / Auf
 * der Seite" dazukam (Betreiber, 07.09.2026), war die naheliegende Abkürzung,
 * den Teaser im Werkzeug nachzubauen — und dann nimmt man ein Design ab, das
 * es auf der Seite so nicht gibt.
 *
 * Dieselbe Systematik wie bei Brief und Gemeindeseite: getrennt formuliert
 * widersprechen sie sich, und zwar ohne dass es jemandem auffällt.
 */

const WURZEL = resolve(__dirname, "..", "..");
const lies = (...teile: string[]) => readFileSync(resolve(WURZEL, ...teile), "utf8");

const GEMEINDESEITE = lies("components", "atlas", "GemeindeMeldungen.tsx");
const WERKZEUG = lies("components", "social", "SeitenVorschau.tsx");
const GETEILT = lies("components", "social", "OrtsStoryAnsicht.tsx");

describe("Seitenfassung der Ortsgeschichten", () => {
  it("beide Oberflächen nehmen dieselben Bauteile", () => {
    for (const [name, quelle] of [
      ["Gemeindeseite", GEMEINDESEITE],
      ["Design-Werkzeug", WERKZEUG],
    ] as const) {
      // GEPRÜFT WIRD DIE VERWENDUNG, nicht der Import: Die erste Fassung
      // suchte nur den Namen und blieb bei beiden Gegenproben grün — die
      // Import-Zeile stand ja noch da, während daneben ein eigener Knopf
      // gerendert wurde. Dieselbe Falle wie beim Datenbank-Wächter.
      expect(quelle, `${name} rendert den geteilten Teaser nicht`).toContain("<OrtsTeaser");
      expect(quelle, `${name} rendert die geteilte Karte nicht`).toContain("<OrtsStoryKarte");
      expect(quelle, `${name} holt sie nicht aus der geteilten Ansicht`).toMatch(
        /from "\.[./]*(?:social\/)?OrtsStoryAnsicht"/,
      );
    }
  });

  it("keine der beiden zeichnet die Karte selbst", () => {
    // Die Bildkarte gehört der Formenlehre. Eine hier gezeichnete Fassung war
    // schon einmal da und ist als zweite Wahrheit neben den abgenommenen
    // Templates wieder heraus (05.09.2026).
    for (const [name, quelle] of [
      ["Gemeindeseite", GEMEINDESEITE],
      ["Design-Werkzeug", WERKZEUG],
    ] as const) {
      expect(quelle, `${name} ruft die Bildkarte direkt auf`).not.toContain("<SocialKarte");
      // Auch der Import zählt: Wer sie hereinholt, benutzt sie irgendwann.
      expect(quelle, `${name} holt die Bildkarte herein`).not.toContain("SocialKarte }");
    }
    // Genau EINE Stelle ruft sie — die geteilte Ansicht.
    expect(GETEILT).toContain("<SocialKarte bild={bild} skala={1} stufe=\"quadrat\" palette=\"seite\" />");
  });

  it("das Werkzeug erfindet keine Angaben, die an der Karte stehen", () => {
    // Ortsname, Adresse und Datenstand stehen in der Karte und in ihrem
    // Teilen-Ziel. Ein Platzhalter dort wäre eine falsche Angabe in genau der
    // Ansicht, an der man die Richtigkeit abnimmt.
    expect(WERKZEUG).toContain("orts.ortName");
    expect(WERKZEUG).toContain("orts.liveUrl");
    expect(WERKZEUG).toContain("orts.standIso");
    const QUELLE = lies("lib", "redaktions-quelle.ts");
    expect(QUELLE, "die Angaben kommen nicht aus der Quelle").toContain("seitenform");
  });

  it("wo es keine Seitenfassung gibt, sagt das Werkzeug es", () => {
    // „Nichts anzuzeigen" und „gibt es nicht" sind zwei Auskünfte. Zwölf der
    // vierzehn bundesweiten Beiträge haben bis heute keine.
    expect(WERKZEUG).toContain("nur für den Feed");
  });
});
