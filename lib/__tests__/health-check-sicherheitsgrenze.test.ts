import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sicherheitsBefund } from "../../scripts/health-check";

// ─── Die Sicherheitsgrenze wird gemessen, nicht nur definiert ────────────────
//
// DER ANLASS (05.09.2026): Selbstauskunft und Urteil ueber die Datenbank-
// Rechte gibt es seit dem 29.07.2026 — aufgerufen hat sie in fuenf Wochen
// niemand, waehrend rund 40 Tabellen und 40 Routen dazukamen. Eine Pruefung,
// die existiert und nie laeuft, ist von keiner Pruefung nicht zu unterscheiden.
//
// Die Fixture unten ist der ECHTE Juli-Fund: exec_sql war mit dem Anon-Key
// ausfuehrbar, also beliebiges SQL auf Produktion. Genau so meldet ihn die
// Selbstauskunft heute — und genau so muss der Gesundheitscheck ihn an Claude
// geben, nicht als Warnung.

const JULI_FUND = {
  ok: false,
  problems: ["exec_sql(sql text): anon darf ausfuehren — beliebiges SQL mit dem oeffentlichen Anon-Key."],
};

describe("Sicherheitsgrenze im Gesundheitscheck", () => {
  it("gibt den Juli-Fund an Claude — als Befund, nicht als Warnung", () => {
    const befund = sicherheitsBefund(JULI_FUND);
    expect(befund).toHaveLength(1);
    expect(befund[0]).toContain("anon darf ausfuehren");
    expect(befund[0]).toContain("nicht dicht");
  });

  it("meldet eine Tabelle ohne Zeilenschutz", () => {
    const befund = sicherheitsBefund({
      ok: false,
      problems: ["Tabelle geheim_neu: kein Zeilenschutz — mit dem oeffentlichen Anon-Key lesbar."],
    });
    expect(befund[0]).toContain("geheim_neu");
  });

  it("schweigt, wenn die Grenze dicht ist", () => {
    expect(sicherheitsBefund({ ok: true, problems: [] })).toEqual([]);
  });

  // „Konnte nicht nachsehen" ist kein Befund — dieselbe Trennung wie ueberall
  // sonst zwischen „ist kaputt" und „Abruf kam nicht durch".
  it("schweigt, wenn gar nicht gemessen werden konnte", () => {
    expect(sicherheitsBefund(null)).toEqual([]);
  });

  // Ein rotes Urteil ohne Liste darf nicht in Gruen kippen, nur weil es
  // nichts zu zitieren gibt.
  it("bleibt rot, auch wenn die Problemliste leer ankommt", () => {
    expect(sicherheitsBefund({ ok: false, problems: [] })).toHaveLength(1);
  });
});

// ─── Die Gegenprobe: laeuft die Messung im Hauptlauf ueberhaupt? ────────────
//
// Die Urteilsfunktion oben ist rein und leicht gruen zu bekommen. Der Fehler,
// gegen den dieser Test gebaut ist, war nie ein falsches Urteil, sondern ein
// Urteil, das niemand einholt. Geprueft wird deshalb die VERWENDUNG, nicht das
// Vorhandensein: Die Route muss nur messend gerufen werden (`verify=1`, sonst
// spielt jeder Lauf DDL ein), und ihr Ergebnis muss in die Claude-Befunde
// fliessen — nicht nur in die Protokollzeilen.
describe("Die Messung haengt im Hauptlauf", () => {
  const quelle = readFileSync(resolve(__dirname, "../../scripts/health-check.ts"), "utf-8");

  it("ruft die Selbstauskunft nur messend auf", () => {
    expect(quelle).toMatch(/\/api\/security\/setup\?verify=1/);
    // Nie ohne verify: Das spielte bei jedem Lauf DDL ein.
    expect(quelle).not.toMatch(/\/api\/security\/setup`/);
  });

  it("gibt das Urteil an Claude weiter", () => {
    expect(quelle).toMatch(/forClaude\.push\(\.\.\.sicherheitsBefund\(/);
  });
});
