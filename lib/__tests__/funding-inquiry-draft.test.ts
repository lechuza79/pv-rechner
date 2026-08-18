import { describe, it, expect } from "vitest";
import { renderInquiryDraft, inquirySubject, type InquiryContext } from "../funding-inquiry-draft";

const frankfurt: InquiryContext = {
  programName: "Frankfurter Klimabonus",
  traeger: "Stadt Frankfurt am Main",
  url: "https://frankfurt.de/themen/klima-und-energie/stadtklima/klimabonus",
  hinterlegt: ["20 % der Kosten für PV-Anlagen", "maximale Fördersumme 100.000 €"],
  standIso: "2026-08-16",
};

describe("Anfrage an die Förderstelle", () => {
  it("nennt Programm und Anliegen im Betreff, ohne Marke", () => {
    const s = inquirySubject(frankfurt);
    expect(s).toContain("Frankfurter Klimabonus");
    expect(s.toLowerCase()).not.toContain("solar-check");
  });

  it("ist eine Sachfrage, keine Werbung — sonst wäre es Kaltakquise (§ 7 UWG)", () => {
    const { body } = renderInquiryDraft(frankfurt);
    for (const wort of ["kostenlos anbieten", "Widget", "Kooperation", "Partnerschaft", "verlinken Sie"]) {
      expect(body).not.toContain(wort);
    }
  });

  it("listet auf, was bestätigt werden soll", () => {
    const { body } = renderInquiryDraft(frankfurt);
    expect(body).toContain("- 20 % der Kosten für PV-Anlagen");
    expect(body).toContain("- maximale Fördersumme 100.000 €");
  });

  it("nennt den letzten belegten Stand in deutscher Schreibweise", () => {
    expect(renderInquiryDraft(frankfurt).body).toContain("16.08.2026");
  });

  it("kommt ohne belegten Stand aus, statt einen zu erfinden", () => {
    const { body } = renderInquiryDraft({ ...frankfurt, standIso: null });
    expect(body).toContain("Einen belegten Stand haben wir bisher nicht.");
    expect(body).not.toMatch(/\d{2}\.\d{2}\.\d{4}/);
  });

  it("erklärt, warum gefragt wird — ohne der Stelle einen Vorwurf zu machen", () => {
    const { body } = renderInquiryDraft(frankfurt);
    expect(body).toContain("Bot-Schutz");
    for (const wort of ["leider", "ärgerlich", "sollten Sie", "Problem Ihrer"]) {
      expect(body).not.toContain(wort);
    }
  });

  it("bietet den Ausstieg an: ausgelaufen ist auch eine Antwort", () => {
    expect(renderInquiryDraft(frankfurt).body).toContain("Mittel erschöpft");
  });
});
