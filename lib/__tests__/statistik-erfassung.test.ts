/**
 * VIER EIGENSCHAFTEN DES ERFASSUNGSLAUFS, DIE VON AUSSEN UNSICHTBAR SIND.
 *
 * Der Lauf schreibt in eine Ablage, die niemand ansieht, bis die Zahlen auf
 * einer öffentlichen Seite stehen. Bis dahin fällt keiner dieser vier Fehler
 * auf — es gibt keinen Absturz, keine kaputte Seite, nur falsche Zahlen:
 *
 *  1. Der laufende Tag wird mitgeschrieben. Dann steht in der Reihe ein
 *     schwacher Tag, der bloß noch nicht zu Ende ist — dieselbe Falle, aus der
 *     die Kostenwache nur vollständige Tage bewertet.
 *  2. Schätzungen überschreiben Messungen. Beide gehen als Upsert in dieselbe
 *     Tabelle; wer sie in der falschen Reihenfolge schreibt, ersetzt echte
 *     Zahlen durch hochgerechnete, und die Herkunft steht danach auf
 *     „geschätzt", ohne dass jemand die Messung vermisst.
 *  3. Die Rückrechnung läuft beiläufig mit. Sie erfindet Tage, für die es keine
 *     Protokolle gibt — das braucht eine ausdrückliche Ansage.
 *  4. Der Lauf schreibt ohne Ansage. Ein Versandlauf, den noch nie jemand ohne
 *     Wirkung gesehen hat, ist einer, dessen erste Wirkung echt ist.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const QUELLE = readFileSync(
  resolve(process.cwd(), "scripts", "projekt-statistik-erfassen.ts"),
  "utf8",
);

describe("Erfassungslauf", () => {
  it("legt den laufenden Tag nicht ab", () => {
    // Auf die Zeile geprüft, nicht auf das Vorkommen: Auskommentiert steht das
    // Muster weiterhin in der Datei, und ein Test, der das durchlässt, meldet
    // Grün für einen ausgebauten Schutz. Genau so ist er beim Bauen einmal
    // durchgefallen.
    // Alle drei Bestände, nicht nur einer: Bliebe die Arbeitszeit stehen,
    // stünde für heute eine halbe Stunde da, wo abends acht werden.
    for (const bestand of ["claude.tage", "codex.tage", "arbeitszeit"]) {
      expect(QUELLE).toMatch(new RegExp(`^\\s*${bestand.replace(".", "\\.")}\\.delete\\(heute\\);`, "m"));
    }
  });

  it("schreibt Schätzungen VOR Messungen, damit eine Messung nie überschrieben wird", () => {
    const geschaetzt = QUELLE.indexOf('schreibe("projekt_statistik", geschaetzt');
    const gemessen = QUELLE.indexOf('schreibe("projekt_statistik", gemessen');
    expect(geschaetzt).toBeGreaterThan(-1);
    expect(gemessen).toBeGreaterThan(-1);
    expect(geschaetzt).toBeLessThan(gemessen);
  });

  it("rechnet nur auf ausdrückliche Ansage zurück", () => {
    expect(QUELLE).toMatch(/RUECKRECHNEN = process\.argv\.includes\("--rueckrechnen"\)/);
    expect(QUELLE).toMatch(/if \(RUECKRECHNEN\)/);
  });

  it("schreibt nur auf ausdrückliche Ansage", () => {
    expect(QUELLE).toMatch(/SCHREIBEN = process\.argv\.includes\("--schreiben"\)/);
    expect(QUELLE).toMatch(/if \(!SCHREIBEN\)[\s\S]{0,200}return;/);
  });

  it("nimmt den Kalendertag aus der geteilten Quelle, nicht aus einem eigenen Abschnitt", () => {
    // Ein Zeitstempel, der mit `toISOString().slice(0, 10)` zum Tag gemacht
    // wird, liegt abends auf dem Vortag. Die Umrechnung steht deshalb an EINER
    // Stelle und wird hier importiert.
    expect(QUELLE).toMatch(/tagVon,/);
    expect(QUELLE).not.toMatch(/toISOString\(\)\.slice\(0, 10\)/);
  });

  it("legt die Zeit über BEIDE Werkzeuge zusammen", () => {
    // Wer neben einer Claude- eine Codex-Sitzung offen hat, arbeitet trotzdem
    // nur eine Stunde. Getrennt gezählt käme sie zweimal heraus.
    expect(QUELLE).toMatch(/verteileZeit\(\[\.\.\.claude\.bloecke, \.\.\.codex\.bloecke\], arbeitszeit\)/);
  });
});

describe("Codex", () => {
  it("nimmt die LETZTE Tokenmeldung je Sitzung, weil sie kumulativ ist", () => {
    // Codex meldet nach jedem Zug den Stand der ganzen Sitzung, nicht den
    // Zuwachs. Wer alle Meldungen addiert, zählt eine Sitzung mit hundert Zügen
    // hundertfach — und die Zahl sieht dabei völlig normal aus.
    expect(QUELLE).toMatch(/^\s*if \(u\) letzte = u;/m);
    expect(QUELLE).toMatch(/KUMULATIV/);
  });

  it("filtert über das Arbeitsverzeichnis, nicht über den Text", () => {
    // Eine Sitzung, in der das Projekt bloß erwähnt wurde, gehört nicht dazu.
    expect(QUELLE).toMatch(/^\s*if \(o\.type === "session_meta"\) cwd = p\.cwd \?\? null;/m);
    expect(QUELLE).toMatch(/^\s*if \(!cwd \|\| !cwd\.includes\("pv-rechner"\)\) continue;/m);
  });

  it("rechnet nur für Claude zurück", () => {
    // Die Codex-Protokolle beginnen am 31.08.2026. Für März bis Juli einen
    // Codex-Anteil hochzurechnen hieße, Arbeit zu erfinden, die es nicht gab.
    expect(QUELLE).toMatch(/Nur für Claude/);
    expect(QUELLE).toMatch(/schaetzeTag\(tag, n, k\)/);
  });
});
