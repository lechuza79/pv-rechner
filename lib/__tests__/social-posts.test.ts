import { describe, expect, it } from "vitest";
import { baueAllePosts, postStadtLand, postWachstum, type SocialKennzahlen } from "../social-posts";

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
  stichtagJahr: 2025,
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
  laender: [
    { name: "Niedersachsen", balkonJeTausend: 23.1, wpProKopf: 505 },
    { name: "Rheinland-Pfalz", balkonJeTausend: 21.7, wpProKopf: 558 },
    { name: "Berlin", balkonJeTausend: 7.1, wpProKopf: 72 },
    { name: "Hamburg", balkonJeTausend: 6.1, wpProKopf: 84 },
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

  it("nimmt Spitze und Schlusslicht aus den Daten, nicht aus dem Text", () => {
    const p = postStadtLand(basis);
    expect(p.text).toContain("Hamburg");
    expect(p.text).toContain("Niedersachsen");
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

  it("bezieht den Zuwachs auf Haushalte, nicht auf Leistung", () => {
    const p = postWachstum(basis);
    // 1.453.026 - 1.202.467 = 250.559 → auf Tausender gerundet
    expect(p.text).toContain("251.000 Haushalte");
  });
});

describe("Alle Posts", () => {
  it("tragen die Quellenangabe im Text UND im Bild", () => {
    // Beim Weiterteilen reist der Beitragstext nicht mit, das Bild schon. Die
    // Lizenz des Anlagenregisters verlangt die Namensnennung — sie muss deshalb
    // an beiden Stellen stehen, nicht an einer.
    for (const p of baueAllePosts(basis)) {
      expect(p.text).toMatch(/Marktstammdatenregister/);
      expect(p.bild?.quelle).toMatch(/Marktstammdatenregister/);
      expect(p.bild?.quelle).toMatch(/Eigene Berechnung/);
      expect(p.text).toMatch(/5\. August 2026/);
    }
  });

  it("halten die Bildaussage kurz genug für das Vorschaubild", () => {
    // Eine Aussage, die im Feed dreizeilig umbricht, ist im Vorschaubild nicht
    // mehr lesbar — und genau dort entscheidet sich, ob jemand stehen bleibt.
    for (const p of baueAllePosts(basis)) {
      expect(p.bild!.aussage.length).toBeLessThanOrEqual(80);
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

describe("Gruppenbehauptungen werden gerechnet, nicht getippt", () => {
  // Der Satz „bei den Stadtstaaten wird es noch deutlicher" stand hier als
  // feste Formulierung, während der Code nur „die letzten zwei Plätze" holte.
  // Am 26.08.2026 stimmte er zufällig — Hamburg, Berlin und Bremen belegten
  // wirklich die letzten drei Plätze. An dem Tag, an dem ein Flächenland
  // durchsackt, wäre daraus eine Falschaussage geworden, ohne dass sich eine
  // sichtbare Zahl bewegt hätte.
  const mitStadtstaaten: SocialKennzahlen = {
    ...basis,
    laender: [
      { name: "Niedersachsen", balkonJeTausend: 23.1, wpProKopf: 505 },
      { name: "Bayern", balkonJeTausend: 16.7, wpProKopf: 2567 },
      { name: "Bremen", balkonJeTausend: 11.1, wpProKopf: 300 },
      { name: "Berlin", balkonJeTausend: 7.1, wpProKopf: 148 },
      { name: "Hamburg", balkonJeTausend: 6.1, wpProKopf: 157 },
    ],
  };

  it("nennt die Stadtstaaten nur, wenn sie wirklich die letzten drei sind", () => {
    expect(postStadtLand(mitStadtstaaten).text).toContain("die Stadtstaaten");
  });

  it("lässt den Gruppennamen weg, sobald ein Flächenland durchsackt", () => {
    const gekippt: SocialKennzahlen = {
      ...mitStadtstaaten,
      laender: mitStadtstaaten.laender.map((l) =>
        l.name === "Bayern" ? { ...l, balkonJeTausend: 2.0 } : l,
      ),
    };
    const t = postStadtLand(gekippt).text;
    expect(t).not.toContain("Stadtstaaten");
    expect(t).toContain("Bayern");
  });

  it("zählt alle drei Schlusslichter auf, wenn es sie benennt", () => {
    const t = postStadtLand(mitStadtstaaten).text;
    for (const name of ["Hamburg", "Berlin", "Bremen"]) expect(t).toContain(name);
  });

  it("liefert für jeden Post eine Onsite-Fassung ohne Ich-Form und ohne Quellenzeile", () => {
    // Auf einer Seite trägt der Fuß die Quelle, und ein „Ich finde" gehört
    // nicht in einen Abschnitt, der eine Frage beantwortet.
    for (const p of baueAllePosts(mitStadtstaaten)) {
      expect(p.onsite.absaetze.length, `${p.id} ohne Onsite-Absätze`).toBeGreaterThan(0);
      const text = p.onsite.absaetze.join(" ");
      expect(text, `${p.id}: Ich-Form in der Onsite-Fassung`).not.toMatch(/\bIch\b/);
      expect(text, `${p.id}: Quellenzeile in der Onsite-Fassung`).not.toContain("Eigene Berechnung");
    }
  });
});
