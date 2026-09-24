import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { discoveryDue, sourceFailure, retryAt } from "../funding-source-policy";
import { einordnen, sichtbarerText } from "../funding-screen-erkennung";
import { scrapeFromHtml, derivePvTiers, parsePriceRange, equipmentStorageQuote, installedStorageValue } from "../market-price-parser";
import { summarizeEvidence } from "../funding-run-evidence";
const fixture = (name: string) => readFileSync(new URL(`./fixtures/funding-audit/${name}.html`, import.meta.url), "utf8");
describe("real source audit regressions", () => {
  it("preserves all six actual PV ranges without silently choosing a new point policy", () => {
    const parsed = scrapeFromHtml(fixture("pv"));
    expect(parsed.pvBySize).toHaveLength(6);
    expect(parsed.pvBySize[0]).toMatchObject({ min: 1700, max: 2425, scope: "installed-pv" });
    expect(parsed.pvBySize[3]).toMatchObject({ min: 1200, max: 1430 });
    expect(derivePvTiers(parsed)).toEqual({ pvPriceSmall: 1416, pvPriceLarge: 1071 });
  });
  it("does not call the real Mainz redirect a readable funding source", () => {
    expect(sourceFailure(200, "text/html", fixture("mainz-old"), "https://www.mainzer-stiftung.de/foerderprogramme/photovoltaik-batteriespeicher/", "https://www.mainzer-stiftung.de/stiftung/uber-uns/")).not.toBeNull();
  });
  it("retains the valid Beratzhausen funding hit", () => {
    const html = fixture("beratzhausen");
    expect(sourceFailure(200, "text/html", html, "https://beratzhausen.com/foerderprogramme/", "https://beratzhausen.com/foerderprogramme/")).toBeNull();
    expect(einordnen(sichtbarerText(html))).toMatchObject({ verdikt: "treffer", techniken: ["balkon"] });
  });
  it("distinguishes a shell and PDF from a readable negative result", () => {
    expect(sourceFailure(200, "text/html", "<html><div id='app'>Loading… please wait</div></html>", "https://a.de/", "https://a.de/")).toBe("shell");
    expect(sourceFailure(200, "application/pdf", "%PDF-1", "https://a.de/f.pdf", "https://a.de/f.pdf")).toBe("unsupported");
    expect(sourceFailure(200, "text/html", "<main>Unsere Gemeinde bietet keine Förderung an.</main>", "https://a.de/", "https://a.de/")).toBeNull();
  });
  it.each(["keine-seite", "gefunden"])("reopens both %s records and notices a changed entry URL", verdikt => {
    const r = { website: "https://a.de", verdikt, such_version: 5, checked_at: "2026-08-01T00:00:00Z" };
    expect(discoveryDue(r, r.website, 5, "2026-08-31T00:00:00Z")).toBe(true);
    expect(discoveryDue(r, r.website, 5, "2026-08-02T00:00:00Z")).toBe(false);
    expect(discoveryDue(r, "https://neu.de", 5, "2026-08-02T00:00:00Z")).toBe(true);
  });
  it("does not turn extraction or an unsuccessful fetch into human verification", () => {
    expect(summarizeEvidence([{ attempted_at: "a", readable: false, failure_reason: "blocked" }, { attempted_at: "b", readable: true }, { extracted: 2 }])).toEqual({ attempted: 2, readable: 1, extracted: 1, reviewed: 0, failures: { blocked: 1 } });
    expect(retryAt("missing", "2026-09-01T00:00:00Z")).toBe("2026-10-01T00:00:00.000Z");
    expect(retryAt("network", "2026-09-01T00:00:00Z")).toBe("2026-09-02T00:00:00.000Z");
  });
});

describe("workflow completion contract", () => {
  it("reports after screening and includes failed as well as skipped steps", () => {
    const workflow = readFileSync(new URL("../../.github/workflows/foerder-watch.yml", import.meta.url), "utf8");
    expect(workflow.indexOf("name: Abschlussbericht")).toBeGreaterThan(workflow.indexOf("name: Treffer zum Nachlesen"));
    expect(workflow).toContain("FUNDING_STEP_OUTCOMES: ${{ toJSON(steps) }}");
    const script = readFileSync(new URL("../../scripts/funding-report.ts", import.meta.url), "utf8");
    expect(script).not.toContain("berichtAblegen(");
  });
});

it("retries incomplete discovery separately from substantive negative results", () => {
  const r = { website: "https://a.de", verdikt: "unvollstaendig", such_version: 5, checked_at: "2026-09-01T00:00:00Z" };
  expect(discoveryDue(r, r.website, 5, "2026-09-07T00:00:00Z")).toBe(false);
  expect(discoveryDue(r, r.website, 5, "2026-09-08T00:00:00Z")).toBe(true);
});


it("keeps both limits when the currency appears only once, and excludes hardware from all-in comparison", () => {
  expect(parsePriceRange("1.200–1.430 €/kWp")).toEqual({ min: 1200, max: 1430 });
  const quote = equipmentStorageQuote("<p>350 bis 500 Euro pro Kilowattstunde</p><p>Montage wird zusätzlich berechnet.</p>");
  expect(quote).toMatchObject({ min: 350, max: 500, scope: "equipment-only" });
  expect(installedStorageValue(quote)).toBeNull();
});
