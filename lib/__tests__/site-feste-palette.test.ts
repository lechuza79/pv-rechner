import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { SITE_THEME_STAGE, getThemeOverrides } from "../theme";

// The public site renders ONE fixed palette stage (29.09.2026). It used to
// switch its whole theme by a stored light/dark preference and by the sun;
// the switch control was already gone, but the boot script in the site layout
// kept reading the old preference and the clock. These checks keep that from
// coming back: a stored preference, the system setting or the time of day
// must not decide the page palette.

const ROOT = join(__dirname, "..", "..");
const lesen = (p: string) => readFileSync(join(ROOT, p), "utf8");

function dateien(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) dateien(rel, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(rel);
  }
  return out;
}

describe("Feste Seitenpalette", () => {
  const layout = lesen("app/(site)/layout.tsx");

  it("the fixed stage exists as an emitted stage block", () => {
    expect(SITE_THEME_STAGE).toMatch(/^s[0-6]$/);
    // s6 is the :root base and has no block of its own; every other stage must.
    const stage: string = SITE_THEME_STAGE;
    if (stage !== "s6") expect(getThemeOverrides()).toContain(`:root[data-theme="${stage}"]`);
  });

  it("the site layout sets the stage on <html> on the server", () => {
    expect(layout).toMatch(/<html[^>]*data-theme=\{SITE_THEME_STAGE\}/);
  });

  it("the boot script neither reads a preference nor sets the stage", () => {
    expect(layout).not.toMatch(/getItem\(\s*['"]sc-theme-pref/);
    expect(layout).not.toMatch(/setAttribute\(\s*['"]data-theme/);
    expect(layout).not.toMatch(/prefers-color-scheme|matchMedia/);
    // Stored preferences from the old switch are dropped, not honoured.
    expect(layout).toMatch(/removeItem\(\s*'sc-theme-pref'\s*\)/);
  });

  it("no app or component code switches the document's stage at runtime", () => {
    const funde = [...dateien("app"), ...dateien("components")].filter((f) => {
      const s = lesen(f);
      return (
        /documentElement\.setAttribute\(\s*["']data-theme["']/.test(s) ||
        /documentElement\.dataset\.theme\s*=/.test(s) ||
        /["']sc-theme-pref["']/.test(s) && !f.endsWith(join("(site)", "layout.tsx"))
      );
    });
    expect(funde).toEqual([]);
  });
});
