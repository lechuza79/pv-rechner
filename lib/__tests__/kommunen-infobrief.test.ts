import { describe, expect, it } from "vitest";
import { renderInfoDraft, type InfoDraftContext } from "../kommunen-outreach-draft";
import { fehlendePflichtangaben, platzhalterLoecher } from "../outreach-mail";

// The short letter for towns WITHOUT a placement (operator: draft 05.10.2026,
// "wir schicken an alle auch ohne" 06.10.2026). It offers a tool, not a claim:
// no number, no rank, no comparison anyone has to check.

const BASIS: InfoDraftContext = {
  name: "Brüggen",
  pageUrl: "https://solar-check.io/solar-atlas/nordrhein-westfalen/kreis-viersen/brueggen",
  vergleichWo: "im Kreis Viersen",
  einwohner: 16000,
  empfaenger: "info@brueggen.de",
  kommunenUrl: "https://solar-check.io/fuer-organisationen/kommunen",
  mitSzene: false,
};

describe("Kurzbrief ohne Platzierung", () => {
  it("behauptet keine Zahl und keinen Rang", () => {
    const d = renderInfoDraft(BASIS);
    expect(d.body).not.toMatch(/Platz \d|unter den besten|\d+ ?%|\d{1,3}\.\d{3} Solaranlagen/);
    expect(d.subject).toBe("Solarstrom in Brüggen: eine Übersicht für Ihre Website");
  });

  it("trägt alle Pflichtangaben und kein Loch", () => {
    const d = renderInfoDraft(BASIS);
    expect(fehlendePflichtangaben(d.body)).toEqual([]);
    expect(platzhalterLoecher(d.subject, d.body, d.bodyHtml)).toEqual([]);
  });

  it('nennt die Ortsseite und „kostenfrei“ genau einmal, ohne Widget-Link', () => {
    const d = renderInfoDraft(BASIS);
    expect(d.body).toContain(BASIS.pageUrl);
    expect(d.body.match(/kostenfrei/g)).toHaveLength(1);
    expect(d.body).not.toContain("/embed/");
  });

  it("3D-Satz nur mit veröffentlichter Szene", () => {
    expect(renderInfoDraft(BASIS).body).not.toContain("3D-Ansicht");
    expect(renderInfoDraft({ ...BASIS, mitSzene: true }).body).toContain("3D-Ansicht");
  });

  it("keine Weiterleitungs-Bitte an ein Pressepostfach", () => {
    expect(renderInfoDraft(BASIS).body).toContain("falls Sie nicht zuständig sind");
    expect(renderInfoDraft({ ...BASIS, anPresse: true }).body).not.toContain("falls Sie nicht zuständig sind");
  });
});
