import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { energieBefund, ENERGIE_MAX_ALTER_STUNDEN } from "../../scripts/health-check";

/**
 * 05.10.2026: Energy-Charts' data service answered 503 for hours, the strommix
 * page showed empty boxes, and the health check stayed green — it only asked
 * whether the PAGE loads. This holds the measurement of the data itself and
 * its verdict, in both directions: a short upstream outage that our stored
 * copy covers is a log line, no copy at all or a long outage goes to Claude.
 */

const jetzt = new Date("2026-10-05T12:00:00Z");
const vorStunden = (h: number) => new Date(jetzt.getTime() - h * 3600000).toISOString();

describe("Strommix-Daten im Gesundheitscheck", () => {
  it("fresh data: no finding", () => {
    expect(energieBefund({ status: 200, punkte: 90, stale: false, letzterPunkt: vorStunden(0.5) }, jetzt)).toEqual({
      warnungen: [],
      fuerClaude: [],
    });
  });

  it("no data at all (502, no stored copy): goes to Claude", () => {
    const b = energieBefund({ status: 502, punkte: 0, stale: false, letzterPunkt: null }, jetzt);
    expect(b.fuerClaude).toHaveLength(1);
    expect(b.fuerClaude[0]).toMatch(/energy_letzter_stand/);
  });

  it("200 with an empty series is the same failure", () => {
    expect(energieBefund({ status: 200, punkte: 0, stale: false, letzterPunkt: null }, jetzt).fuerClaude).toHaveLength(1);
  });

  it("short outage covered by the stored copy: log line only", () => {
    const b = energieBefund({ status: 200, punkte: 90, stale: true, letzterPunkt: vorStunden(2) }, jetzt);
    expect(b.fuerClaude).toEqual([]);
    expect(b.warnungen[0]).toMatch(/vor 2 Stunden/);
  });

  it("outage longer than the threshold: goes to Claude", () => {
    const b = energieBefund(
      { status: 200, punkte: 90, stale: true, letzterPunkt: vorStunden(ENERGIE_MAX_ALTER_STUNDEN + 1) },
      jetzt,
    );
    expect(b.warnungen).toEqual([]);
    expect(b.fuerClaude).toHaveLength(1);
  });

  it("fresh answer with an old newest point: goes to Claude", () => {
    const b = energieBefund({ status: 200, punkte: 90, stale: false, letzterPunkt: vorStunden(10) }, jetzt);
    expect(b.fuerClaude).toHaveLength(1);
  });

  it("Energy-Charts down, SMARD covering live: log line only", () => {
    const b = energieBefund({ status: 200, punkte: 90, stale: false, smard: true, letzterPunkt: vorStunden(1) }, jetzt);
    expect(b.fuerClaude).toEqual([]);
    expect(b.warnungen[0]).toMatch(/SMARD/);
  });

  it("not measurable is no finding", () => {
    expect(energieBefund(null, jetzt)).toEqual({ warnungen: [], fuerClaude: [] });
  });

  it("the check actually runs the measurement and files the verdict", () => {
    const quelle = readFileSync(join(process.cwd(), "scripts/health-check.ts"), "utf8");
    expect(quelle).toMatch(/const energie = await messeEnergiedaten\(\)/);
    expect(quelle).toMatch(/technical\("energy-data", false, \.\.\.energieUrteil\.fuerClaude\)/);
  });
});
