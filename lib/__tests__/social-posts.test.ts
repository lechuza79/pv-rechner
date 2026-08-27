import { describe, expect, it } from "vitest";
import {
  FEED_ABSCHNITT_ZEICHEN,
  baueAllePosts,
  postStadtLand,
  postWachstum,
  type SocialKennzahlen,
} from "../social-posts";

// Der Wert dieses Moduls ist nicht der schöne Satz, sondern dass Satz und Zahl
// nicht auseinanderlaufen können. Genau das prüfen diese Tests: Sie drehen die
// Zahlen um und verlangen, dass die Aussage mitdreht.
//
// Der Anlass steht im Katalog: Dort stand als Beispiel „beim Solarstrom liegt
// der Osten vorn, bei Balkonkraftwerken umgekehrt" — ausgedacht, und beide
// Hälften falsch. Ein Satz, der die Richtung behauptet statt sie zu rechnen,
// ist eine tickende Falschaussage.

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
  foerderung: { programme: 108, gemeinden: 97, nurBalkon: 12, ohneHoechstbetrag: 61, mitAntragVorher: 74 },
  kohorte: { privatAnlagen: 3_120_000, mittlereKwp: 9.4, speicherEinheiten: 1_180_000, speicherJe100: 37.8 },
  anomalie: {
    ort: "Beispielstadt",
    einwohner: 24_500,
    jeTausend: 61.2,
    bundesJeTausend: 17.3,
    mindestEinwohner: 5_000,
  },
  laender: [
    { name: "Niedersachsen", balkonJeTausend: 23.1, wpProKopf: 505, privatDachKwp: 1_000_000, speicherJe100: 30, freiflaecheAnteil: 17.4, solarKwp: 11_300_000, wachstumFuenfJahre: 2.23 },
    { name: "Rheinland-Pfalz", balkonJeTausend: 21.7, wpProKopf: 558, privatDachKwp: 1_000_000, speicherJe100: 30, freiflaecheAnteil: 32.9, solarKwp: 6_500_000, wachstumFuenfJahre: 2.32 },
    { name: "Brandenburg", balkonJeTausend: 20.5, wpProKopf: 377, privatDachKwp: 1_000_000, speicherJe100: 30, freiflaecheAnteil: 70.3, solarKwp: 9_800_000, wachstumFuenfJahre: 2.05 },
    { name: "Nordrhein-Westfalen", balkonJeTausend: 16.1, wpProKopf: 378, privatDachKwp: 1_000_000, speicherJe100: 30, freiflaecheAnteil: 9.1, solarKwp: 15_500_000, wachstumFuenfJahre: 2.33 },
    { name: "Thüringen", balkonJeTausend: 18.7, wpProKopf: 295, privatDachKwp: 1_000_000, speicherJe100: 30, freiflaecheAnteil: 39.6, solarKwp: 3_300_000, wachstumFuenfJahre: 1.75 },
    { name: "Berlin", balkonJeTausend: 7.1, wpProKopf: 72, privatDachKwp: 1_000_000, speicherJe100: 30, freiflaecheAnteil: 0.4, solarKwp: 500_000, wachstumFuenfJahre: 3.48 },
    { name: "Hamburg", balkonJeTausend: 6.1, wpProKopf: 84, privatDachKwp: 1_000_000, speicherJe100: 30, freiflaecheAnteil: 0.4, solarKwp: 300_000, wachstumFuenfJahre: 4.38 },
  ],
};

describe("Stadt-Land-Post", () => {
  it("nennt beide Zahlen und beide Gruppengrößen", () => {
    const p = postStadtLand(basis);
    // Ohne Gruppengröße ist eine Quote eine Behauptung — dieselbe Regel wie im
    // Kommunen-Brief, wo ein Rang ohne Vergleichsgruppe schon einmal zu einer
    // widerlegbaren Aussage geführt hat.
    expect(p.text).toContain("9,9");
    expect(p.text).toContain("22,8");
    expect(p.text).toContain("80");
    expect(p.text).toMatch(/1\.000 Einwohner/);
  });

  it("dreht die Aussage mit, wenn das Verhältnis kippt", () => {
    const gedreht = {
      ...basis,
      stadtLand: { ...basis.stadtLand, stadtJeTausend: 22.8, landJeTausend: 9.9 },
    };
    expect(postStadtLand(basis).bild?.aussage).toMatch(/auf dem Land/);
    expect(postStadtLand(gedreht).bild?.aussage).toMatch(/in der Stadt/);
  });

  it("nennt Stadtstaaten und Flächenländer getrennt", () => {
    // Der Satz hieß zuerst „bei den Stadtstaaten … Hamburg, Berlin.
    // Niedersachsen kommt auf …" und machte Niedersachsen damit zum
    // Stadtstaat. Die Gruppen werden jetzt namentlich getrennt, nicht über die
    // Sortierung erraten.
    const p = postStadtLand(basis);
    expect(p.text).toMatch(/Stadtstaaten: Berlin [\d,]+, Hamburg [\d,]+/);
    expect(p.text).toMatch(/Flächenländern führt Niedersachsen/);
    expect(p.text).not.toMatch(/Stadtstaaten[^.]*Niedersachsen/);
    // Vertauscht man die Reihenfolge der Länder, muss dasselbe herauskommen —
    // die Funktion sortiert selbst.
    const gemischt = { ...basis, laender: [...basis.laender].reverse() };
    expect(postStadtLand(gemischt).text).toBe(p.text);
  });
});

describe("Wachstums-Post", () => {
  it("rechnet beide Raten aus den Beständen", () => {
    const p = postWachstum(basis);
    expect(p.text).toContain("8 Prozent");
    expect(p.text).toContain("21 Prozent");
    expect(p.text).toContain("127 Gigawatt");
  });

  it("nennt den gerechneten Zuwachs, und zwar in den ersten zwei Zeilen", () => {
    const p = postWachstum(basis);
    // 1.453.026 - 1.202.467 = 250.559 → auf Tausender gerundet
    const ersteZeile = p.text.split("\n")[0];
    expect(ersteZeile).toContain("251.000");
    // Der Feed zeigt vor „mehr anzeigen" nur zwei Zeilen. Steht die Aussage
    // dahinter, bekommt sie niemand zu sehen — im Redaktionstisch aufgefallen,
    // als die Vorschau die richtige Reihenfolge bekam.
    expect(ersteZeile.length).toBeLessThanOrEqual(FEED_ABSCHNITT_ZEICHEN);
  });
});

describe("Alle Posts", () => {
  it("tragen die Quellenangabe im Text UND im Bild", () => {
    // Beim Weiterteilen reist der Beitragstext nicht mit, das Bild schon. Beide
    // Lizenzen, unter denen wir arbeiten, verlangen die Namensnennung — sie muss
    // deshalb an beiden Stellen stehen, nicht an einer.
    //
    // Geprüft wird auf eine BENANNTE Quelle, nicht auf das Anlagenregister: Seit
    // eine Story auf Ember steht, wäre die engere Fassung entweder rot oder
    // hätte zu einer falschen Lizenzangabe eingeladen — und eine falsche steht
    // dann auf genau der Fläche, die weitergeteilt wird.
    const quellen = /Marktstammdatenregister|Ember/;
    for (const p of baueAllePosts(basis)) {
      expect(p.text, p.id).toMatch(quellen);
      expect(p.bild?.quelle, p.id).toMatch(quellen);
      expect(p.bild?.quelle, p.id).toMatch(/Eigene Berechnung/);
      // Eine Quelle ohne ihre Lizenz ist keine Quellenangabe.
      expect(p.bild?.quelle, p.id).toMatch(/dl-de\/by-2-0|CC BY 4\.0|Bundesnetzagentur/);
      // Der Markenname muss wörtlich im Text stehen, sonst findet die
      // Erwähnung der Unternehmensseite ihn nicht und der Verweis entfällt
      // stillschweigend.
      expect(p.text, p.id).toContain("Solar Check");
    }
  });

  it("nennen den Datenstand, wo sie aus dem Anlagenregister rechnen", () => {
    for (const p of baueAllePosts(basis)) {
      if (!/Marktstammdatenregister/.test(p.text)) continue;
      expect(p.text, p.id).toMatch(/5\. August 2026/);
    }
  });

  it("halten die Bildaussage kurz genug für das Vorschaubild", () => {
    // Eine Aussage, die im Feed dreizeilig umbricht, ist im Vorschaubild nicht
    // mehr lesbar — und genau dort entscheidet sich, ob jemand stehen bleibt.
    for (const p of baueAllePosts(basis)) {
      expect(p.bild!.aussage.length).toBeLessThanOrEqual(80);
    }
  });

  it("tragen die Aussage in der ersten Zeile", () => {
    // Alles nach den ersten zwei Zeilen liest nur, wer schon interessiert ist.
    for (const p of baueAllePosts(basis)) {
      const ersteZeile = p.text.split("\n")[0];
      expect(ersteZeile.length).toBeGreaterThan(40);
      expect(ersteZeile.length).toBeLessThanOrEqual(FEED_ABSCHNITT_ZEICHEN);
    }
  });

  it("kommen ohne Link aus", () => {
    // Ein Link im Beitrag drückt die Verbreitung. Jeder Post muss ohne Klick
    // vollständig sein; der Link gehört in den ersten Kommentar.
    for (const p of baueAllePosts(basis)) {
      expect(p.text).not.toMatch(/https?:\/\//);
    }
  });
});
