import { describe, it, expect } from "vitest";
import {
  sanitizeOverrides,
  getOverrideCss,
  isSafeColor,
  effectiveValue,
  stageIndex,
  STAGES,
  THEME_TOKENS,
} from "../theme-overrides";
import { stageDefaults } from "../theme";

describe("isSafeColor", () => {
  it("accepts hex and rgb/rgba", () => {
    expect(isSafeColor("#00D950")).toBe(true);
    expect(isSafeColor("#fff")).toBe(true);
    expect(isSafeColor("rgba(0,217,80,0.08)")).toBe(true);
    expect(isSafeColor("rgb(76, 175, 80)")).toBe(true);
  });
  it("rejects anything that could smuggle CSS into <head>", () => {
    expect(isSafeColor("red")).toBe(false); // named colours not allowed
    expect(isSafeColor("#00D950; background:url(x)")).toBe(false);
    expect(isSafeColor("url(javascript:alert(1))")).toBe(false);
    expect(isSafeColor("var(--x)")).toBe(false);
    expect(isSafeColor("expression(1)")).toBe(false);
    expect(isSafeColor("")).toBe(false);
  });
});

describe("sanitizeOverrides", () => {
  it("keeps known stages, known tokens, safe values", () => {
    const clean = sanitizeOverrides({
      s6: { "--color-positive": "#123456" },
      s0: { "--color-energy-solar": "rgba(1,2,3,0.5)" },
    });
    expect(clean).toEqual({
      s6: { "--color-positive": "#123456" },
      s0: { "--color-energy-solar": "rgba(1,2,3,0.5)" },
    });
  });

  it("drops unknown stages, unknown tokens, and unsafe values", () => {
    const clean = sanitizeOverrides({
      s9: { "--color-positive": "#111111" }, // stage out of range
      s6: {
        "--color-positive": "#111111", // ok
        "--color-bg": "#000000", // not an editable green token
        "--color-highlight": "red; }", // unsafe value
      },
    });
    expect(clean).toEqual({ s6: { "--color-positive": "#111111" } });
  });

  it("omits stages that end up empty, and returns {} for junk", () => {
    expect(sanitizeOverrides({ s6: { "--color-bg": "#000" } })).toEqual({});
    expect(sanitizeOverrides(null)).toEqual({});
    expect(sanitizeOverrides("nope")).toEqual({});
    expect(sanitizeOverrides({})).toEqual({});
  });
});

describe("getOverrideCss", () => {
  it("emits nothing for no overrides", () => {
    expect(getOverrideCss({})).toBe("");
  });

  it("emits one :root[data-theme] block per stage with overrides", () => {
    const css = getOverrideCss({
      s6: { "--color-positive": "#123456" },
      s0: { "--color-energy-solar": "#654321" },
    });
    expect(css).toContain(`:root[data-theme="s6"]`);
    expect(css).toContain("--color-positive: #123456;");
    expect(css).toContain(`:root[data-theme="s0"]`);
    expect(css).toContain("--color-energy-solar: #654321;");
  });

  it("filters unsafe values defensively even if they slip into the map", () => {
    // getOverrideCss is the last line of defence before CSS hits the page.
    const css = getOverrideCss({ s6: { "--color-positive": "#fff; evil:1" } } as never);
    expect(css).toBe("");
  });
});

describe("effectiveValue", () => {
  it("returns the design-system default when no override", () => {
    expect(effectiveValue({}, "s6", "--color-positive")).toBe(
      stageDefaults(6)["--color-positive"],
    );
    expect(effectiveValue({}, "s0", "--color-positive")).toBe(
      stageDefaults(0)["--color-positive"],
    );
  });
  it("returns the override when set", () => {
    expect(effectiveValue({ s0: { "--color-positive": "#abcdef" } }, "s0", "--color-positive")).toBe(
      "#abcdef",
    );
  });
});

describe("catalogue", () => {
  it("has seven stages and every token maps to a known role", () => {
    expect(STAGES).toHaveLength(7);
    expect(STAGES.map((s) => s.id)).toEqual(["s6", "s5", "s4", "s3", "s2", "s1", "s0"]);
    expect(
      THEME_TOKENS.every((t) => t.role === "positive" || t.role === "energy" || t.role === "negative"),
    ).toBe(true);
  });
  it("stageIndex clamps to the valid range", () => {
    expect(stageIndex("s6")).toBe(6);
    expect(stageIndex("s0")).toBe(0);
    expect(stageIndex("s99" as never)).toBe(6);
  });
});
