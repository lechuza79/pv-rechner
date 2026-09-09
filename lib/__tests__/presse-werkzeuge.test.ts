import { describe, it, expect } from "vitest";
import { WERKZEUGE, werkzeugPasst } from "../presse-werkzeuge";
import { anschreibenEntwurf } from "../presse-anschreiben";

describe("Werkzeugliste", () => {
  it("jedes Werkzeug hat Schlüssel, Namen, Pfad und einen Satz, was es leistet", () => {
    for (const w of WERKZEUGE) {
      expect(w.schluessel).toMatch(/^[a-z-]+$/);
      expect(w.name.length).toBeGreaterThan(3);
      expect(w.pfad.startsWith("/")).toBe(true);
      expect(w.leistet.length).toBeGreaterThan(30);
    }
  });

  it("die Schlüssel sind eindeutig", () => {
    const s = WERKZEUGE.map((w) => w.schluessel);
    expect(new Set(s).size).toBe(s.length);
  });
});

describe("Passt das Werkzeug zum Beitrag", () => {
  // DER FALL, GEGEN DEN DIESE PRÜFUNG GEBAUT IST (Nutzer-Fund 06.09.2026):
  // Einem Fachbeitrag über die Vergütung für privaten Solarstrom wurde
  // „Zubau je Gemeinde aus dem Anlagenregister" als Aufhänger angeboten.
  const verguetung =
    "Das ändert sich bei der Vergütung für privaten Solarstrom — Sätze 7,78 und 6,7 ct/kWh, Bestandsschutz bis Ende 2026";

  it("erkennt den Fehlgriff: Atlas auf einem Vergütungsbeitrag", () => {
    expect(werkzeugPasst("atlas", verguetung)).toBe(false);
  });

  it("und lässt durch, was wirklich passt", () => {
    expect(werkzeugPasst("einspeiseverguetung", verguetung)).toBe(true);
    expect(werkzeugPasst("pv-rechner", verguetung)).toBe(true);
  });

  // Die Gegenprobe in der anderen Richtung: eine Zubau-Meldung darf den
  // Atlas bekommen und NICHT den Wärmepumpen-Rechner.
  const zubau = "Solarausbau: Deutschland erreicht das Ziel für 2026, 16.000 Megawatt Zubau je Bundesland";
  it("erkennt den umgekehrten Fehlgriff", () => {
    expect(werkzeugPasst("atlas", zubau)).toBe(true);
    expect(werkzeugPasst("waermepumpe", zubau)).toBe(false);
  });

  it("ein unbekannter Schlüssel passt nie", () => {
    expect(werkzeugPasst("gibtesnicht", zubau)).toBe(false);
  });

  // Die Startup-Rubrik fragt nicht nach einer Zahl, sondern nach dem Fall.
  it("die Entstehungsgeschichte passt zu einem Beitrag über KI-Entwicklung, nicht zu einem über Vergütung", () => {
    expect(werkzeugPasst("entstehungsgeschichte", "Vibe Coding: Wie KI die Regeln der Softwareentwicklung verändert")).toBe(true);
    expect(werkzeugPasst("entstehungsgeschichte", verguetung)).toBe(false);
  });
});

describe("Anschreiben-Entwurf", () => {
  const basis = {
    medium: "Haustec",
    person: "Elmar Held",
    beitrag: "Das ändert sich bei der Vergütung für privaten Solarstrom",
    beitragUrl: "https://www.haustec.de/x",
    tage: 19,
    luecke: "Der Text lässt offen, was das an einem konkreten Dach ausmacht.",
    werkzeuge: ["einspeiseverguetung"],
  };

  it("nennt den Menschen, wenn wir einen haben", () => {
    expect(anschreibenEntwurf(basis)).toContain("Sehr geehrte/r Elmar Held,");
  });

  it("redet ohne Namen die Redaktion an, statt eine Person zu behaupten", () => {
    expect(anschreibenEntwurf({ ...basis, person: null })).toContain("Sehr geehrte Redaktion,");
  });

  it("verlinkt das Werkzeug mit vollständiger Adresse", () => {
    expect(anschreibenEntwurf(basis)).toContain("https://solar-check.io/einspeiseverguetung-rechner");
  });

  // „Ihr aktueller Beitrag" über einem drei Jahre alten Text ist eine
  // Behauptung, die der Empfänger in einer Sekunde widerlegt.
  it("nennt einen alten Beitrag nicht aktuell", () => {
    const alt = anschreibenEntwurf({ ...basis, tage: 1116 });
    expect(alt).not.toMatch(/gerade|aktuell/i);
    expect(alt).toContain("nicht der neueste");
  });

  it("nennt einen frischen Beitrag frisch", () => {
    expect(anschreibenEntwurf({ ...basis, tage: 3 })).toContain("gerade");
  });

  it("erfindet kein Datum, wenn keines bekannt ist", () => {
    const ohne = anschreibenEntwurf({ ...basis, tage: null });
    expect(ohne).not.toMatch(/gerade|nicht der neueste/i);
    expect(ohne).toContain("gestoßen");
  });
});
