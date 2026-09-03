import { describe, it, expect } from "vitest";
import { herkunftsangabe } from "../kommunen-outreach-draft";

// Die Pflichtangabe nach Art. 14 sagt, WOHER wir die Adresse haben. Sie steht
// in dem Absatz, der Seriosität herstellen soll — eine falsche Angabe ist
// ausgerechnet dort am teuersten.
describe("Herkunftsangabe im Datenschutz-Hinweis", () => {
  // Der eigentliche Fehler: Die Angabe stand pauschal auf „Impressum". Bei
  // Düsseldorf steht die Presseadresse auf der Kontaktseite des Medienportals,
  // im Impressum steht sie nicht.
  it("nennt die Presseseite, wenn die Adresse dort stand", () => {
    expect(herkunftsangabe("Düsseldorf", "presse@duesseldorf.de", "presseseite")).toContain(
      "Presseseite von Düsseldorf",
    );
  });

  it("nennt die Kontaktseite, wenn die Adresse dort stand", () => {
    expect(herkunftsangabe("Porta Westfalica", "info@portawestfalica.de", "kontaktseite")).toContain(
      "Kontaktseite von Porta Westfalica",
    );
  });

  // Über die Suche gefunden heißt: Die Seite dahinter war die Presseseite.
  // „Suche" wäre der Weg dorthin, nicht die Herkunft.
  it("nennt bei einem Fund über die Suche die Presseseite", () => {
    expect(herkunftsangabe("Viersen", "pressestelle@viersen.de", "suche")).toContain("Presseseite von Viersen");
  });

  it("bleibt beim Impressum, wo die Adresse dort stand", () => {
    expect(herkunftsangabe("Ennepetal", "pressestelle@ennepetal.de", "impressum")).toContain(
      "Impressum von Ennepetal",
    );
  });

  // UMLAUTE: Der Vergleich lief auf dem rohen Ortsnamen, die Domain schreibt
  // aber „ue". 48 von 390 Briefen nannten deshalb die Domain statt des
  // Ortsnamens — nicht falsch, aber unnötig technisch.
  it("erkennt die eigene Domain trotz Umlaut-Schreibweise", () => {
    for (const [ort, mail] of [
      ["Düsseldorf", "presse@duesseldorf.de"],
      ["Mündersbach", "info@muendersbach.de"],
      ["Lägerdorf", "info@laegerdorf.de"],
      ["Klötze", "info@stadt-kloetze.de"],
      ["Flörsheim am Main", "info@floersheim-main.de"],
    ] as const) {
      expect(herkunftsangabe(ort, mail), ort).toContain(`von ${ort}`);
    }
  });

  // BEWUSSTE GRENZE: Eine stark verkürzte Domain wird NICHT als die eigene
  // erkannt („Linz am Rhein" → linz.de). Der Satz nennt dann die Domain statt
  // des Ortsnamens — weniger schön, aber wahr. Das aufzuweichen hieße, den
  // Namensvergleich zu lockern, und genau daran ist er bei Rengsdorf schon
  // einmal falsch positiv geworden. Lieber technisch als unzutreffend.
  it("nennt bei stark verkürzten Domains die Domain statt des Ortsnamens", () => {
    expect(herkunftsangabe("Linz am Rhein", "info@linz.de")).toContain("von linz.de");
  });

  // DIE WICHTIGERE RICHTUNG: Wo die Adresse einer MITVERWALTENDEN Gemeinde
  // gehört, muss deren Domain dastehen — sonst behauptet der Satz eine
  // Herkunft, die es nicht gab. Genau dafür wurde die Unterscheidung gebaut.
  it("nennt die fremde Domain, wenn die Adresse einer anderen Verwaltung gehört", () => {
    expect(herkunftsangabe("Rengsdorf", "info@rengsdorf-waldbreitbach.de", "verwaltung")).toContain(
      "Impressum von rengsdorf-waldbreitbach.de",
    );
  });

  it("fällt ohne Adresse auf die allgemeine Angabe zurück", () => {
    expect(herkunftsangabe("Nidda", null)).toContain("Website von Nidda");
  });
});
