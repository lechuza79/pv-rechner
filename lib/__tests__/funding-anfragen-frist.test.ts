import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  anfrageBezugsdatum,
  anfrageLoeschGrenze,
  anfrageLoeschfaellig,
  type AnfrageZeile,
} from "../funding-anfragen-frist";

const JETZT = Date.parse("2029-10-01T12:00:00.000Z");

const zeile = (z: Partial<AnfrageZeile>): AnfrageZeile => ({
  gesendet_am: "2026-09-10T08:00:00.000Z",
  antwort_am: null,
  empfaenger: "info@gemeinde.de",
  text: "Sehr geehrte Damen und Herren …",
  antwort_notiz: null,
  ...z,
});

describe("Aufbewahrung der Sachfragen an Förderstellen", () => {
  it("rechnet drei Kalenderjahre zurück", () => {
    expect(anfrageLoeschGrenze(JETZT)).toBe("2026-10-01T12:00:00.000Z");
  });

  it("zählt ab der Antwort, ohne Antwort ab dem Versand", () => {
    expect(anfrageBezugsdatum(zeile({ antwort_am: "2027-01-05T00:00:00.000Z" }))).toBe("2027-01-05T00:00:00.000Z");
    expect(anfrageBezugsdatum(zeile({}))).toBe("2026-09-10T08:00:00.000Z");
  });

  it("leert eine unbeantwortete Frage drei Jahre nach dem Versand", () => {
    expect(anfrageLoeschfaellig(zeile({}), JETZT)).toBe(true);
  });

  it("eine späte Antwort verlängert die Frist — der Versand allein entscheidet dann nicht", () => {
    // Gefragt vor mehr als drei Jahren, geantwortet vor weniger: noch nicht fällig.
    expect(anfrageLoeschfaellig(zeile({ antwort_am: "2027-03-01T00:00:00.000Z", antwort_notiz: "Es gilt 200 €." }), JETZT)).toBe(false);
    // Antwort älter als drei Jahre: fällig.
    expect(anfrageLoeschfaellig(zeile({ antwort_am: "2026-09-20T00:00:00.000Z", antwort_notiz: "Es gilt 200 €." }), JETZT)).toBe(true);
  });

  it("vor Ablauf ist nichts fällig", () => {
    expect(anfrageLoeschfaellig(zeile({ gesendet_am: "2026-10-02T00:00:00.000Z" }), JETZT)).toBe(false);
  });

  it("eine bereits geleerte Zeile ist nicht noch einmal fällig", () => {
    expect(anfrageLoeschfaellig(zeile({ empfaenger: "", text: "", antwort_notiz: null }), JETZT)).toBe(false);
  });

  it("die nächtliche Aufräum-Route ruft das Leeren wirklich auf", () => {
    // Geprüft wird die VERWENDUNG, nicht das Vorhandensein der Funktion.
    const route = readFileSync(join(__dirname, "..", "..", "app", "api", "abo", "aufraeumen", "route.ts"), "utf8");
    expect(route).toMatch(/await fundingAnfragenAufraeumen\(jetzt\)/);
    const db = readFileSync(join(__dirname, "..", "funding-anfragen-loeschen.ts"), "utf8");
    expect(db).toMatch(/anfrageLoeschGrenze\(jetztMs\)/);
    expect(db).toMatch(/\.lt\("antwort_am", grenze\)/);
    expect(db).toMatch(/\.is\("antwort_am", null\)[\s\S]*\.lt\("gesendet_am", grenze\)/);
  });
});
