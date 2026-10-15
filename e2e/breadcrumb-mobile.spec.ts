import { test, expect } from "@playwright/test";
import { klickBisWirkung } from "./klick";

test.use({ contextOptions: { reducedMotion: "reduce" } });

for (const width of [320, 390]) {
  test(`municipality breadcrumb at ${width}px: ancestors open and dismiss`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/solar-atlas/rheinland-pfalz/landkreis-kaiserslautern/gerhardsbrunn");
    const nav = page.getByRole("navigation", { name: "Brotkrümel", exact: true });
    const trigger = nav.locator("summary");
    const panel = nav.locator("details > div");
    const association = panel.getByRole("link", { name: "Verbandsgemeinde Bruchmühlbach-Miesau" });
    await expect(nav.locator('[aria-current="page"]')).toHaveText("Gerhardsbrunn");
    await expect(panel).not.toBeVisible();
    await klickBisWirkung(trigger, association, "Open breadcrumb ancestors");
    await expect(association).toHaveAttribute("href", /verbandsgemeinden\/bruchmuehlbach-miesau$/);
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await page.locator(".hero-description").click();
    await expect(panel).not.toBeVisible();
    await trigger.press("Enter");
    await expect(panel).toBeVisible();
    await trigger.press("Escape");
    await expect(panel).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await page.setViewportSize({ width: 1280, height: 844 });
    await expect(trigger).not.toBeVisible();
    await expect(nav.getByRole("link", { name: "Verbandsgemeinde Bruchmühlbach-Miesau", exact: true }).filter({ visible: true })).toBeVisible();
  });
}
