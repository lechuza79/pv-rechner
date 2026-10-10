/**
 * The health check times what a fresh municipality page loads next, not only
 * the page (lib/health-folgeabruf.ts). Anlass 07.10.2026: page 0.4–1.2 s in
 * every report, ranking podium 3.6–4.1 s for visitors.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { FOLGEABRUF_GRENZEN, folgeabrufBefund, ranglistenAdressen } from "../health-folgeabruf";

const html = `<script>{"rowsUrl":"/api/gemeinde/rangliste?schluessel=balkon-pk%3Ade%3Akleine-gemeinden"}
{"rowsUrl":"/api/gemeinde/rangliste?schluessel=balkon-pk%3A09%3Akleine-gemeinden"}
{"rowsUrl":"/api/gemeinde/rangliste?schluessel=balkon-pk%3A09677%3Akleine-gemeinden"}
{"rowsUrl":"/api/gemeinde/rangliste?schluessel=balkon-pk%3A09677%3Akleine-gemeinden"}</script>`;

describe("follow-up loads of a fresh municipality page", () => {
  it("reads the ranking lists from the HTML, de-duplicated, the district list first", () => {
    const a = ranglistenAdressen(html);
    expect(a).toHaveLength(3);
    expect(a[0]).toContain("09677");
  });

  it("finds nothing on a page without ranking lists", () => {
    expect(ranglistenAdressen("<html></html>")).toEqual([]);
  });

  it("judges the slowest list: quick is silent, the measured 07.10.2026 case is red", () => {
    const m = (seconds: number, status = 200) => ({ url: "/x", status, seconds, cache: "MISS" });
    expect(folgeabrufBefund([m(0.3), m(0.4)])).toBeNull();
    expect(folgeabrufBefund([m(0.3), m(FOLGEABRUF_GRENZEN.warn + 0.1)])?.stufe).toBe("gelb");
    expect(folgeabrufBefund([m(0.3), m(4.1)])?.stufe).toBe("rot");
    // A failed fetch is not a measurement, and certainly not a fast one.
    expect(folgeabrufBefund([m(9, 500)])).toBeNull();
    expect(folgeabrufBefund([])).toBeNull();
  });

  it("the health check actually measures it and reports a red result as a finding", () => {
    const hc = readFileSync("scripts/health-check.ts", "utf8");
    expect(hc).toMatch(/const folge = await messeFolgeabrufe\(coldResult\.all\.filter/);
    expect(hc).toMatch(/const \[adresse\] = ranglistenAdressen\(html\);/);
    expect(hc).toMatch(/if \(folgeBefund\?\.stufe === "rot"\) technical\("gemeinde-folgeabruf-latency"/);
  });
});
