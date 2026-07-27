import { describe, it, expect } from "vitest";
import { renderOutreachDraft, type DraftContext } from "../kommunen-outreach-draft";

const base: DraftContext = {
  name: "Testdorf",
  pageUrl: "https://solar-check.io/solar-atlas/bayern/landkreis-x/testdorf",
  betreff: "Testdorf ist Balkon-Pionier im Landkreis Musterkreis",
  einstieg: "Testdorf ist im Landkreis Musterkreis die Nummer 1 bei „Balkon-Pionier“ — Platz 1 von 20 Gemeinden.",
};

describe("renderOutreachDraft", () => {
  const d = renderOutreachDraft(base);

  it("übernimmt Betreff und Einstieg aus der Hook-Logik", () => {
    expect(d.subject).toBe(base.betreff);
    expect(d.body).toContain(base.einstieg);
  });

  it("nennt die Gemeinde im Text", () => {
    expect(d.body).toContain("Testdorf");
  });

  it("verlinkt die Gemeinde-Atlas-Seite, wenn vorhanden", () => {
    expect(d.body).toContain(base.pageUrl!);
  });

  it("trägt die Pflicht-Signatur (Klarname + Impressum + Datenschutz)", () => {
    expect(d.body).toContain("Sebastian Schäder");
    expect(d.body).toContain("Betreiber solar-check.io");
    expect(d.body).toContain("solar-check.io/impressum");
    expect(d.body).toContain("solar-check.io/datenschutz");
  });

  it("hat den entschärften Design-Satz, keine harte Bedingung", () => {
    expect(d.body).toContain("Farben und Schrift passe ich an Ihre Website an");
    expect(d.body).not.toContain("einzige Bedingung");
  });

  it("behauptet keine falsche Aktualität (monatlich statt tagesaktuell)", () => {
    expect(d.body).toContain("monatlich");
    expect(d.body).not.toContain("tagesaktuell");
  });

  it("trägt den Art.-14-DSGVO-Hinweis (Herkunft/Zweck/Widerspruch)", () => {
    expect(d.body).toContain("Art. 14 DSGVO");
    expect(d.body).toContain("Widerspruchsrecht");
  });

  it("klebt keine nackte Leistungseinheit an eine Zahl (Zahlen-Korrektheit)", () => {
    expect(d.body).not.toMatch(/\d\s?kW(?![ph])/);
    expect(d.body).not.toMatch(/\d\s?MW(?!p)/);
  });

  it("fällt ohne Atlas-Link sauber zurück", () => {
    const z = renderOutreachDraft({ ...base, pageUrl: null });
    expect(z.body).toContain("Übersicht des Solar-Ausbaus");
    expect(z.body).toContain("Testdorf");
    expect(z.body).not.toContain("null");
  });
});

// Ergaenzt 27.07.2026: Der Regelfall ist NICHT die namentliche Anrede.
describe("weiterleitungsfähig", () => {
  const basis = {
    name: "Musterdorf",
    pageUrl: "https://solar-check.io/solar-atlas/bayern/kreis/musterdorf",
    betreff: "Musterdorf ist Balkon-Pionier im Landkreis",
    einstieg: "Musterdorf ist im Landkreis die Nummer 1.",
  };

  it("bittet um Weiterleitung, wenn keine zuständige Stelle bekannt ist", () => {
    const d = renderOutreachDraft(basis);
    expect(d.body).toMatch(/Weiterleitung/);
    // Die Bitte steht oben, nicht am Ende — sonst liest sie niemand.
    expect(d.body.indexOf("Weiterleitung")).toBeLessThan(d.body.indexOf(basis.einstieg));
  });

  it("lässt die Bitte weg, wenn eine operative Stelle benannt ist", () => {
    const d = renderOutreachDraft({ ...basis, funktion: "Referentin für Öffentlichkeitsarbeit" });
    expect(d.body).not.toMatch(/Weiterleitung/);
  });

  it("knüpft an eine vorhandene Themenseite an, wenn es eine gibt", () => {
    const d = renderOutreachDraft({ ...basis, thema: { begriff: "Klimaschutz", url: "https://x.de/klima" } });
    expect(d.body).toMatch(/Klimaschutz/);
  });

  it("behauptet nichts, wenn keine Themenseite bekannt ist", () => {
    expect(renderOutreachDraft(basis).body).not.toMatch(/Auf Ihrer Website führen Sie bereits/);
  });
});
