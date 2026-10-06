import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

// Clickjacking protection: every page forbids being framed, EXCEPT the widgets
// under /embed, which exist to be framed (first-party AutoHeightIframe and
// third-party copy-paste code). The header rules are matched here with the same
// compiler Next uses for the routes manifest — a string comparison of the
// "source" would say nothing about which paths it actually hits.
const require = createRequire(import.meta.url);
const nextConfig = require("../../next.config.js") as {
  headers: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]>;
  poweredByHeader?: boolean;
};
const { buildCustomRoute } = require("next/dist/lib/build-custom-route") as {
  buildCustomRoute: (type: "header", route: { source: string; headers: unknown[] }) => { regex: string };
};

async function headerFuer(pfad: string): Promise<Map<string, string>> {
  const regeln = await nextConfig.headers();
  const ergebnis = new Map<string, string>();
  for (const regel of regeln) {
    const { regex } = buildCustomRoute("header", regel);
    if (new RegExp(regex).test(pfad)) {
      for (const h of regel.headers) ergebnis.set(h.key.toLowerCase(), h.value);
    }
  }
  return ergebnis;
}

const GESCHUETZT = [
  "/",
  "/photovoltaik-rechner",
  "/photovoltaik-rechner/ergebnis",
  "/fuer/testbetrieb",
  "/solar-atlas/hessen/wetteraukreis/nidda",
  "/admin",
  "/admin/kommunen",
  "/dashboard",
  "/login",
  "/api/fachbetrieb/anfrage",
  // Only the /embed SEGMENT is exempt, not every path that starts with the letters.
  "/embedding-ratgeber",
  "/embeds",
];

const EINBETTBAR = [
  "/embed",
  "/embed/strommix",
  "/embed/foerder-check",
  "/embed/gemeinde/06440018/insights",
  "/embed/story-preview",
];

describe("Framing-Schutz: überall außer /embed", () => {
  it.each(GESCHUETZT)("%s darf nicht gerahmt werden", async (pfad) => {
    const h = await headerFuer(pfad);
    expect(h.get("content-security-policy")).toBe("frame-ancestors 'none'");
    expect(h.get("x-frame-options")).toBe("DENY");
  });

  it.each(EINBETTBAR)("%s bleibt einbettbar", async (pfad) => {
    const h = await headerFuer(pfad);
    expect(h.has("x-frame-options")).toBe(false);
    expect(h.get("content-security-policy") ?? "").not.toMatch(/frame-ancestors/);
    // The harmless base headers still apply to the widgets.
    expect(h.get("x-content-type-options")).toBe("nosniff");
  });

  it("kein X-Powered-By", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
