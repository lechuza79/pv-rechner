import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { kommunenSeiteUrl, KOMMUNEN_PATH } from "../kommunen-seite";
import { landscapePlaces } from "../landscape-places";

describe("municipal page link in the letter", () => {
  it("carries the place when its scene is published", () => {
    const ags = Object.keys(landscapePlaces).find((id) => id.length === 8)!;
    expect(kommunenSeiteUrl("https://solar-check.io", ags)).toBe(`https://solar-check.io${KOMMUNEN_PATH}?gemeinde=${ags}`);
  });

  it("falls back to the plain page without a published scene", () => {
    expect(kommunenSeiteUrl("https://solar-check.io", "99999999")).toBe(`https://solar-check.io${KOMMUNEN_PATH}`);
  });

  it("is the only way the letter builds this link", () => {
    const src = readFileSync("lib/kommunen-brief.ts", "utf8");
    expect(src).toContain("kommunenUrl: kommunenSeiteUrl(SITE_URL, regionId)");
    expect(src).not.toMatch(/KOMMUNEN_PATH/);
  });
});

import { empfaengerFuerBrief } from "../kommunen-presse";
describe("recipient of the letter", () => {
  it("skips department mailboxes outside the topic and falls back", () => {
    const r = empfaengerFuerBrief({ rollenEmail: "info@x.de", presseKontaktEmail: "tourismus@x.de" });
    expect(r.email).toBe("info@x.de");
  });
  it("sends nothing rather than to the building authority", () => {
    expect(empfaengerFuerBrief({ rollenEmail: "bauleitplanung@x.de" }).email).toBeNull();
  });
  it("keeps a secretariat as the last resort", () => {
    expect(empfaengerFuerBrief({ rollenEmail: "sekretariat@x.de" }).email).toBe("sekretariat@x.de");
  });
});
