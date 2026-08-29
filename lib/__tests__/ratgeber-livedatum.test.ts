import { describe, expect, it } from "vitest";
import { RATGEBER } from "../ratgeber";

/**
 * Jeder Ratgeber trägt zwei Daten, und sie bedeuten Verschiedenes.
 *
 * `live` ist der Tag, an dem er erschienen ist, `updated` der letzte
 * inhaltliche Eingriff. Bis zum 28.08.2026 gab es nur das zweite, und der
 * Redaktionskalender hätte es als Erscheinungsdatum ausgegeben — eine erfundene
 * Angabe, also genau die Fehlerklasse, gegen die dieses Projekt sonst antritt.
 *
 * Der Bestand wurde einmalig aus der Historie der Hauptlinie nachgetragen.
 * Diese Tests halten fest, was daran nachprüfbar ist — nicht, dass die Daten
 * stimmen (das kann kein Test), sondern dass sie einander nicht widersprechen.
 */

describe("Ratgeber: Erscheinen und Überarbeitung", () => {
  it("jeder Eintrag hat beide Daten", () => {
    for (const r of RATGEBER) {
      expect(r.live, `${r.slug} hat kein Erscheinungsdatum`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.updated, `${r.slug} hat kein Änderungsdatum`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("nichts wurde überarbeitet, bevor es erschienen ist", () => {
    // Eine unmögliche Kombination — und der einzige Widerspruch, den man ohne
    // die Historie überhaupt feststellen kann.
    for (const r of RATGEBER) {
      expect(r.updated >= r.live, `${r.slug}: überarbeitet ${r.updated} liegt vor live ${r.live}`).toBe(true);
    }
  });

  it("nichts erscheint in der Zukunft", () => {
    // Ein Tippfehler im Jahr fällt sonst nur auf, wenn jemand den Kalender
    // aufmacht und sich wundert, warum dort nichts steht.
    const heute = new Date().toISOString().slice(0, 10);
    for (const r of RATGEBER) {
      expect(r.live <= heute, `${r.slug} erscheint erst am ${r.live}`).toBe(true);
    }
  });

  it("kein Eintrag teilt sich eine Adresse", () => {
    const adressen = RATGEBER.map((r) => r.slug);
    expect(new Set(adressen).size).toBe(adressen.length);
  });
});
