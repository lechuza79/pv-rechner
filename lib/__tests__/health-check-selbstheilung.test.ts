import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { healRegionConfig } from "../../scripts/health-check";

/**
 * Die Selbstheilung der Function-Region ist der einzige automatische Eingriff im
 * Projekt, der ohne menschliche Sichtung auf main committet. Sie muss deshalb
 * beides sicher können: den eindeutigen Fall reparieren UND die Finger von allem
 * lassen, was eine Entscheidung war.
 *
 * Hintergrund: Die Functions liefen im Juli 2026 in Washington statt Frankfurt,
 * wo die Datenbank steht — jeder DB-Roundtrip kostete Atlantik-Latenz, der Atlas
 * lief in den 8-s-Fast-Fail und warf zwei Tage lang 500er.
 */
describe("Selbstheilung der Function-Region", () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "health-check-"));
    file = join(dir, "vercel.json");
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const write = (cfg: unknown) => writeFileSync(file, `${JSON.stringify(cfg, null, 2)}\n`);
  const read = () => JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;

  it("trägt eine fehlende Region wieder ein", () => {
    write({ git: { deploymentEnabled: { staging: false } }, crons: [{ path: "/api/x", schedule: "0 8 1 * *" }] });

    expect(healRegionConfig(file)).toBe("repariert");
    expect(read().regions).toEqual(["fra1"]);
  });

  it("lässt den bereits richtigen Eintrag unangetastet", () => {
    write({ git: {}, regions: ["fra1"] });
    const before = readFileSync(file, "utf8");

    expect(healRegionConfig(file)).toBe("schon-richtig");
    expect(readFileSync(file, "utf8")).toBe(before);
  });

  it("überschreibt eine bewusst abweichende Region NICHT", () => {
    // Wenn dort etwas anderes steht, hat das ein Mensch entschieden — dann nur
    // melden. Ein Automatismus, der Entscheidungen überschreibt, ist gefährlicher
    // als das Problem, das er löst.
    write({ git: {}, regions: ["iad1"] });

    expect(healRegionConfig(file)).toBe("abweichend");
    expect(read().regions).toEqual(["iad1"]);
  });

  it("behandelt eine leere Regions-Liste als fehlend", () => {
    write({ git: {}, regions: [] });

    expect(healRegionConfig(file)).toBe("repariert");
    expect(read().regions).toEqual(["fra1"]);
  });

  it("erhält alle übrigen Einstellungen, insbesondere die Cron-Jobs", () => {
    const crons = [
      { path: "/api/prices/scrape", schedule: "0 8 1 * *" },
      { path: "/api/energy/backfill", schedule: "0 6 * * 1" },
    ];
    write({ git: { deploymentEnabled: { staging: false } }, crons });

    healRegionConfig(file);

    const after = read();
    expect(after.crons).toEqual(crons);
    expect(after.git).toEqual({ deploymentEnabled: { staging: false } });
  });

  it("schreibt nur Schlüssel, die Vercel kennt", () => {
    // Vercel validiert vercel.json strikt: ein unbekannter Top-Level-Schlüssel
    // lässt den Deploy scheitern, BEVOR der Build startet — ohne Build-Log und
    // ohne sichtbaren Grund. Genau das ist beim ersten Fix-Versuch passiert
    // (ein reiner Kommentar-Key). Die Selbstheilung darf das nie auslösen.
    write({ git: {}, crons: [] });

    healRegionConfig(file);

    const keys = Object.keys(read());
    expect(keys).toEqual(["git", "regions", "crons"]);
    expect(keys.some((k) => k.startsWith("//"))).toBe(false);
  });

  it("meldet eine kaputte Datei, statt sie zu überschreiben", () => {
    writeFileSync(file, "{ das ist kein JSON");

    expect(healRegionConfig(file)).toBe("nicht-lesbar");
    expect(readFileSync(file, "utf8")).toBe("{ das ist kein JSON");
  });
});
