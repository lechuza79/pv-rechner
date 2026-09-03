import { describe, it, expect } from "vitest";
import { istPressePostfach, empfaengerFuerBrief } from "../kommunen-presse";

// Alle Adressen unten sind echte Funde vom 03.09.2026 an den größten Städten
// des offenen NRW-Schubs.
describe("Presse-Postfach erkennen", () => {
  it("erkennt die echten Funde", () => {
    for (const m of [
      "presse@duesseldorf.de",
      "pressestelle@bocholt.de",
      "pressestelle@lippstadt.de",
      "presse@kleve.de",
      "pressestelle@koenigswinter.de",
      "pressestelle@coesfeld.de",
      "pressestelle@kamp-lintfort.de",
      "pressestelle@goch.de",
      "redaktion@gemeinde-dennheritz.de",
    ]) {
      expect(istPressePostfach(m), m).toBe(true);
    }
  });

  it("erkennt die Schreibweisen mit Trennzeichen", () => {
    expect(istPressePostfach("presse.info@musterstadt.de")).toBe(true);
    expect(istPressePostfach("presse-team@musterstadt.de")).toBe(true);
    expect(istPressePostfach("Öffentlichkeitsarbeit@Musterstadt.DE")).toBe(true);
  });

  // DIE WICHTIGERE RICHTUNG. Ein falsch erkanntes Postfach schickt den Brief an
  // die falsche Stelle, und das fällt niemandem auf — die Mail kommt an.
  it("hält die allgemeinen Postfächer heraus", () => {
    for (const m of [
      "info@langenfeld.de",
      "stadt@viersen.de",
      "poststelle@duesseldorf.de",
      "kontakt@guetersloh.de",
      "rathaus@musterstadt.de",
      "stadtverwaltung@bocholt.de",
    ]) {
      expect(istPressePostfach(m), m).toBe(false);
    }
  });

  // Als Wortstamm gesucht träfe „presse" auch einen Nachnamen — derselbe
  // Fehlgriff, der bei den Förder-Wortfiltern schon gemessen wurde
  // („Beförderung" enthält „Förderung").
  it("sucht ganze Wörter, keine Wortstämme", () => {
    expect(istPressePostfach("pressel@musterstadt.de")).toBe(false);
    expect(istPressePostfach("pressluft@musterstadt.de")).toBe(false);
    expect(istPressePostfach("medienzentrum-abo@musterstadt.de")).toBe(false);
  });

  // Stadtmarketing ist vielerorts eine eigene Gesellschaft für Tourismus und
  // Veranstaltungen. Ein Angebot dorthin sieht aus wie Werbung.
  it("nimmt Marketing NICHT als Pressestelle", () => {
    expect(istPressePostfach("marketing@musterstadt.de")).toBe(false);
    expect(istPressePostfach("stadtmarketing@musterstadt.de")).toBe(false);
  });

  it("verträgt fehlende Angaben", () => {
    expect(istPressePostfach(null)).toBe(false);
    expect(istPressePostfach("")).toBe(false);
    expect(istPressePostfach("   ")).toBe(false);
  });
});

describe("Empfänger des Briefes", () => {
  it("nimmt die Presseadresse, wenn es eine gibt", () => {
    const e = empfaengerFuerBrief({ rollenEmail: "info@goch.de", presseEmail: "pressestelle@goch.de" });
    expect(e).toEqual({ email: "pressestelle@goch.de", anPresse: true });
  });

  it("bleibt beim allgemeinen Postfach, wenn keine Presseadresse bekannt ist", () => {
    expect(empfaengerFuerBrief({ rollenEmail: "info@goch.de" })).toEqual({
      email: "info@goch.de",
      anPresse: false,
    });
  });

  // Eine falsch eingetragene Adresse darf den Versand nicht an eine Stelle
  // schicken, die gar keine Pressestelle ist — geprüft wird auch das, was in
  // der Presse-Spalte steht.
  it("misstraut einer Presse-Spalte, die keine Presseadresse enthält", () => {
    expect(
      empfaengerFuerBrief({ rollenEmail: "info@goch.de", presseEmail: "buergermeister@goch.de" }),
    ).toEqual({ email: "info@goch.de", anPresse: false });
  });

  it("meldet gar keine Adresse, wenn beide fehlen", () => {
    expect(empfaengerFuerBrief({ rollenEmail: null }).email).toBeNull();
  });
});
