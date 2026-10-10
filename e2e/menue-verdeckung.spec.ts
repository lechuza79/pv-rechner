import { test, expect } from "@playwright/test";
import { SEITEN, FLOW_PFADE } from "./routen";
import { desktopMenuePruefen, telefonMenuePruefen } from "./menue-verdeckung";

// ─── Nothing on a page is drawn over the open menu ──────────────────────────
//
// On 06.10.2026 the atlas breadcrumb lay on top of every menu flyout on the
// Germany, state and district pages: header and breadcrumb shared z-index 5,
// and the breadcrumb, later in the DOM, won. The search test did not see it —
// it only probes the centre of the search field, which sits above the
// breadcrumb. This test opens every flyout on every page and hit-tests a grid
// over the whole panel.
//
// MENUE_BASIS=https://solar-check.io runs the same check against production.

const BASIS = process.env.MENUE_BASIS ?? "";

// One page per layout family runs on every push; MENUE_ALLE=1 checks every page
// the tour knows. The families differ in what can sit on top of the header:
// the atlas hero (breadcrumb, 3D map), the calculators' sticky action bar, the
// homepage and simulation documents, section rails, sticky CTAs.
const VERTRETER = [
  "/",
  "/pv-simulation",
  "/photovoltaik-rechner",
  "/waermepumpe-rechner",
  "/balkonkraftwerk/rechner",
  "/solar-atlas",
  "/solar-atlas/bayern",
  "/solar-atlas/bayern/landkreis-wuerzburg",
  "/solar-atlas/bayern/landkreis-wuerzburg/hoechberg",
  "/solar-atlas/ranking/solarleistung-je-einwohner/grossstaedte",
  "/photovoltaik-foerderung/hessen/nidda",
  "/ratgeber/waermepumpe-foerderung",
  "/balkonkraftwerk",
  "/strommix-deutschland",
];
const PFADE = process.env.MENUE_ALLE
  ? [...new Set([...VERTRETER, ...SEITEN.map((s) => s.pfad), ...FLOW_PFADE.filter((p) => !p.includes("?"))])]
  : VERTRETER;

test.describe.configure({ timeout: 120_000 });
// The animated atlas scene saturates software WebGL on CI runners; the stacking
// order does not depend on the animation.
test.use({ contextOptions: { reducedMotion: "reduce" } });

const lesbar = (b: { panel: string; x: number; y: number; ueber: string }[]) =>
  [...new Set(b.map((v) => `${v.panel}: ${v.ueber}`))].join("\n");

for (const pfad of PFADE) {
  test(`${pfad}: no page element covers an open menu (desktop)`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASIS + pfad, { waitUntil: "domcontentloaded" });
    await page.locator(".sc-global-header nav details.sc-nav-group:visible").first().waitFor();
    await page.waitForTimeout(500);
    const befunde = await desktopMenuePruefen(page);
    expect(befunde, `Covered on ${pfad}:\n${lesbar(befunde)}`).toEqual([]);
  });

  test(`${pfad}: no page element covers the open menu (phone)`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASIS + pfad, { waitUntil: "domcontentloaded" });
    await page.locator(".sc-nav-toggle:visible").first().waitFor();
    await page.waitForTimeout(500);
    const befunde = await telefonMenuePruefen(page);
    expect(befunde, `Covered on ${pfad}:\n${lesbar(befunde)}`).toEqual([]);
  });
}
