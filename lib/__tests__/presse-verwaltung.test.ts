import { describe, expect, it } from "vitest";
import { istVerwaltung } from "../presse-extrakt";

// Legal-notice lines as they stand on the sites that got our press release on
// 30.09.2026 (administrations) and on regional media that must stay in.
const VERWALTUNGEN = [
  "Der Landkreis Südwestpfalz ist eine Körperschaft des öffentlichen Rechts.",
  "Landkreis Spree-Neiße, vertreten durch den Landrat",
  "Rheinisch-Bergischer Kreis Vertreten durch: Landrat Stephan Santelmann",
  "Verbandsgemeinde Daun Vertreten durch: Bürgermeister Thomas Scholzen",
  "Die Kreisverwaltung ist eine Körperschaft des Öffentlichen Rechts",
  "Stadt Musterstadt, vertreten durch die Oberbürgermeisterin",
];

const MEDIEN = [
  "Nachrichten-KL Verantwortlich i.S.d. § 18 Abs. 2 MStV: Max Muster, Redaktion",
  "Wochenblatt Verlag GmbH, vertreten durch den Geschäftsführer Max Muster",
  "Lokalnachrichten aus dem Landkreis Fulda – Redaktion und Anzeigen",
  "Bürgermeister kritisiert Haushalt: Die Stadt muss sparen.",
  "Interview mit dem Landrat über den Ausbau der Kreisstraßen",
];

describe("an administration is not a medium", () => {
  for (const t of VERWALTUNGEN) {
    it(`recognised: ${t.slice(0, 50)}`, () => expect(istVerwaltung(t, "example.de", new Set())).toBe(true));
  }
  for (const t of MEDIEN) {
    it(`kept as medium: ${t.slice(0, 50)}`, () => expect(istVerwaltung(t, "example.de", new Set())).toBe(false));
  }
  it("a known municipal website counts even without the legal-notice line", () => {
    expect(istVerwaltung("Aktuelles aus der Gemeinde", "www.hagen-atw.de", new Set(["hagen-atw.de"]))).toBe(true);
  });
  it("the refresh applies it before the medium judgement", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("scripts/presse-refresh.ts", "utf8");
    expect(src).toMatch(/istVerwaltung\(gesamtText, domain, verwaltungsDomains\)\s*\?\s*\{ ist: "kein-medium"/);
  });
});
