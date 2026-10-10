// Is anything on the page painted on top of an open menu?
//
// A flyout that sits below a page element still looks "open" in the DOM and
// passes every visibility check — only a hit test at the pixels shows that the
// breadcrumb (or a map, a sticky rail, a hero heading) is drawn over it. That is
// exactly how the atlas breadcrumb covered the menu on 06.10.2026: header and
// breadcrumb shared one z-index, and the later one in the DOM won.
//
// Shared by the spec and by ad-hoc runs against production, so both measure the
// same way.

import { expect, type Locator, type Page } from "@playwright/test";

export type Verdeckung = { panel: string; x: number; y: number; ueber: string };

/** Samples a grid over the panel's visible box; returns every point not owned by it.
 *  `erlaubt` names an ancestor that may legitimately sit on top (the phone menu's
 *  own header bar with the close button). */
export async function verdeckungen(panel: Locator, name: string, erlaubt?: string): Promise<Verdeckung[]> {
  return panel.evaluate(
    (el, [name, erlaubt]) => {
      const r = el.getBoundingClientRect();
      // Stay clear of the rounded corners: outside the radius the page behind
      // shows through by design.
      const inset = parseFloat(getComputedStyle(el).borderTopLeftRadius) + 4 || 4;
      const left = Math.max(r.left, 0) + inset;
      const right = Math.min(r.right, innerWidth) - inset;
      const top = Math.max(r.top, 0) + inset;
      const bottom = Math.min(r.bottom, innerHeight) - inset;
      if (right <= left || bottom <= top) return [{ panel: name, x: -1, y: -1, ueber: "panel has no visible area" }];
      const out: { panel: string; x: number; y: number; ueber: string }[] = [];
      const N = 8;
      for (let i = 0; i <= N; i++)
        for (let j = 0; j <= N; j++) {
          const x = left + ((right - left) * i) / N;
          const y = top + ((bottom - top) * j) / N;
          const hit = document.elementFromPoint(x, y);
          // nextjs-portal is the dev-server indicator; it does not exist in production.
          if (!hit || el.contains(hit) || hit.closest("nextjs-portal") || (erlaubt && hit.closest(erlaubt))) continue;
          const c = typeof hit.className === "string" ? hit.className.split(/\s+/).slice(0, 2).join(".") : "";
          out.push({ panel: name, x: Math.round(x), y: Math.round(y), ueber: `${hit.tagName.toLowerCase()}${c ? "." + c : ""}` });
        }
      return out;
    },
    [name, erlaubt ?? ""] as const,
  );
}

/** Waits until the element's box stops moving (flyouts animate in). */
export async function ruhig(el: Locator) {
  let prev = "";
  for (let i = 0; i < 25; i++) {
    const now = await el.evaluate((e) => {
      const r = e.getBoundingClientRect();
      return `${r.left},${r.top},${r.width},${r.height},${getComputedStyle(e).opacity}`;
    });
    if (now === prev) return;
    prev = now;
    await el.page().waitForTimeout(100);
  }
}

/** Opens every desktop flyout and the search panel; returns all covered points. */
export async function desktopMenuePruefen(page: Page): Promise<Verdeckung[]> {
  const befunde: Verdeckung[] = [];
  const gruppen = page.locator("nav.sc-global-nav > details.sc-nav-group");
  const n = await gruppen.count();
  if (n === 0) return [{ panel: "nav", x: -1, y: -1, ueber: "no menu groups found" }];
  for (let i = 0; i < n; i++) {
    const g = gruppen.nth(i);
    const summary = g.locator(":scope > summary");
    const name = (await summary.innerText()).trim();
    await summary.click();
    const panel = g.locator(":scope > .sc-nav-panel");
    await panel.waitFor({ state: "visible" });
    await ruhig(panel);
    befunde.push(...(await verdeckungen(panel, name)));
    await summary.click();
    await expect.poll(() => g.evaluate((el) => el.hasAttribute("open"))).toBe(false);
    await page.waitForTimeout(300);
  }
  const lupe = page.locator(".sc-search-toggle:visible");
  if (await lupe.count()) {
    await lupe.first().click();
    const panel = page.locator("#sc-search-panel");
    await panel.waitFor({ state: "visible" });
    await ruhig(panel);
    befunde.push(...(await verdeckungen(panel, "Suche")));
    await page.keyboard.press("Escape");
  }
  return befunde;
}

/** Opens the phone menu; returns all covered points. The menu's own header bar
 *  (brand and close button) sits on top by design and is allowed. */
export async function telefonMenuePruefen(page: Page): Promise<Verdeckung[]> {
  const toggle = page.locator(".sc-nav-toggle:visible");
  if (!(await toggle.count())) return [{ panel: "Burger", x: -1, y: -1, ueber: "no menu toggle found" }];
  await toggle.first().click();
  const nav = page.locator("#sc-global-navigation");
  await nav.waitFor({ state: "visible" });
  await ruhig(nav);
  return verdeckungen(nav, "Burger", ".sc-global-header > :not(nav)");
}
