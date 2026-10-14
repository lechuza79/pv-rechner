import { describe, expect, it } from "vitest";
import { renderSammelDraft } from "../kommunen-outreach-draft";
import { fehlendePflichtangaben, platzhalterLoecher } from "../outreach-mail";

const draft = renderSammelDraft({
  orte: [
    { name: "Brüssow", pageUrl: "https://solar-check.io/a", platzierung: null },
    { name: "Göritz", pageUrl: "https://solar-check.io/b", platzierung: "Göritz bei Balkonkraftwerken auf Platz 1 von 12 im Kreis" },
    { name: "Schönfeld", pageUrl: "https://solar-check.io/c", platzierung: null },
  ],
  empfaenger: "info@amt-bruessow.de",
  kommunenUrl: "https://solar-check.io/fuer-organisationen/kommunen?gemeinde=12073085",
  szeneOrt: "Brüssow",
});

describe("one letter per shared mailbox", () => {
  it("lists every town with its own page and keeps the placement", () => {
    for (const u of ["/a", "/b", "/c"]) expect(draft.body).toContain(`https://solar-check.io${u}`);
    expect(draft.body).toContain("Platz 1 von 12");
    expect(draft.body).toContain("3 Gemeinden");
  });
  it("names up to three towns, beyond that two and the count", () => {
    expect(draft.subject).toBe("Solarstrom in Brüssow, Göritz und Schönfeld: Übersichten für Ihre Gemeinden");
    const sechs = renderSammelDraft({
      orte: ["A", "B", "C", "D", "E", "F"].map((n) => ({ name: n, pageUrl: `https://solar-check.io/${n}`, platzierung: null })),
      empfaenger: "info@amt.de",
      kommunenUrl: null,
      szeneOrt: null,
    });
    expect(sechs.subject).toBe("Solarstrom in A, B und 4 weiteren Gemeinden: Übersichten für Ihre Gemeinden");
  });
  it("carries the mandatory parts and no holes", () => {
    expect(fehlendePflichtangaben(draft.body)).toEqual([]);
    expect(platzhalterLoecher(draft.subject, draft.body, draft.bodyHtml)).toEqual([]);
  });
  it("uses no dashes (operator, 13.10.2026)", () => {
    expect(draft.body).not.toMatch(/ [–—] /);
  });
});
