import { describe, it, expect } from "vitest";
import { renderOutreachDraft, type DraftContext } from "../kommunen-outreach-draft";

const base: DraftContext = {
  name: "Testdorf",
  kwpAlle: 73_900,
  population: 133_000,
  pageUrl: "https://solar-check.io/solar-atlas/bayern/landkreis-x/testdorf",
  perzentil: 50,
  rangKreis: 5,
  kreisGemeinden: 20,
};

describe("renderOutreachDraft", () => {
  const d = renderOutreachDraft(base);

  it("nennt die Gemeinde im Betreff und Text", () => {
    expect(d.subject).toContain("Testdorf");
    expect(d.body).toContain("Testdorf");
  });

  it("nutzt Peak-Einheit (kWp/MWp) — nie bare kW/MW; keine Pro-Kopf-Angabe im Body", () => {
    expect(d.body).toMatch(/MWp/);
    expect(d.body).not.toMatch(/\d\s?kW(?![ph])/);
    expect(d.body).not.toMatch(/\d\s?MW(?!p)/);
    // Pro Kopf inkl. Freifläche wäre ein Artefakt → bewusst nicht im Body.
    expect(d.body).not.toMatch(/je Einwohner/);
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

  it("hat die entschärfte Bedingung + den Design-Satz", () => {
    expect(d.body).toContain("Farben und Schrift passe ich an Ihre Website an");
    expect(d.body).not.toContain("einzige Bedingung");
  });

  it("Betreff-Catcher: Landkreis-Sieger nur bei echtem Landkreis (≥3 Gemeinden)", () => {
    expect(renderOutreachDraft({ ...base, rangKreis: 1, kreisGemeinden: 20 }).subject).toContain(
      "Spitzenreiter in Ihrem Landkreis",
    );
    // Kreisfreie Stadt (kreisGemeinden < 3) → kein Landkreis-Betreff.
    expect(renderOutreachDraft({ ...base, rangKreis: 1, kreisGemeinden: 1, perzentil: 60 }).subject).not.toContain(
      "Landkreis",
    );
  });

  it("Betreff-Catcher: Top 10 % / Top 25 % nach Perzentil", () => {
    expect(renderOutreachDraft({ ...base, rangKreis: 3, perzentil: 95 }).subject).toContain("Top 10 %");
    expect(renderOutreachDraft({ ...base, rangKreis: 3, perzentil: 80 }).subject).toContain("Top 25 %");
    expect(renderOutreachDraft({ ...base, rangKreis: 3, perzentil: 40 }).subject).toContain("So steht Testdorf");
  });

  it("fällt bei fehlenden Solardaten sauber zurück (kein 0-kWp, kein Link)", () => {
    const z = renderOutreachDraft({ ...base, kwpAlle: 0, pageUrl: null, perzentil: null, rangKreis: null, kreisGemeinden: null });
    expect(z.body).not.toMatch(/0\s?kWp/);
    expect(z.body).toContain("Übersicht des Solar-Ausbaus");
    expect(z.body).toContain("Testdorf");
  });
});
