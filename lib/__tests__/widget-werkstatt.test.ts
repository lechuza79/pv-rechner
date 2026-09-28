import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { WIDGETS, embedPath, type WidgetId } from "../widget-registry";
import { WERKSTATT_BESTAND } from "../../app/(site)/admin/charts/werkstatt-bestand";

// The workshop's inventory makes claims about the code (which file renders a
// widget, where it is used, how it is previewed). Each claim is checked here —
// otherwise the inventory is a second register that drifts silently.

const ROOT = join(__dirname, "..", "..");
const cache = new Map<string, string>();
const read = (rel: string) => {
  if (!cache.has(rel)) cache.set(rel, readFileSync(join(ROOT, rel), "utf8"));
  return cache.get(rel)!;
};

function sources(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    if (name === "__tests__" || name === "node_modules") return [];
    if (statSync(join(ROOT, rel)).isDirectory()) return sources(rel);
    return /\.tsx?$/.test(name) ? [rel] : [];
  });
}
const ALL = [...sources("app"), ...sources("components"), ...sources("lib")].filter(
  (f) => !f.startsWith("app/(site)/admin/charts/") && f !== "lib/widget-registry.ts",
);
const referencing = (id: string) => ALL.filter((f) => new RegExp(`WIDGETS\\.${id}\\b`).test(read(f)));

describe("Widget workshop inventory", () => {
  const ids = Object.keys(WIDGETS) as WidgetId[];

  it("covers exactly the registry entries", () => {
    expect(Object.keys(WERKSTATT_BESTAND).sort()).toEqual([...ids].sort());
  });

  for (const id of ids) {
    const e = WERKSTATT_BESTAND[id];
    it(`${id}: component, usage sites and preview match the code`, () => {
      expect(existsSync(join(ROOT, e.komponente)), e.komponente).toBe(true);
      expect(e.ebenen.length).toBeGreaterThan(0);
      // Every static reference is listed; every listed non-dynamic file really references the entry.
      const static_ = referencing(id);
      const listed = e.einsatzorte.map((o) => o.datei);
      for (const f of static_) expect(listed, `${id}: ${f} references it but is not listed`).toContain(f);
      for (const o of e.einsatzorte) {
        expect(existsSync(join(ROOT, o.datei)), o.datei).toBe(true);
        if (!o.dynamisch) expect(static_, `${id}: ${o.datei} does not reference WIDGETS.${id}`).toContain(o.datei);
      }
      // An embed preview needs an embed route; a monitor preview needs the shared frame.
      if (e.vorschau.art === "einbettung") {
        const path = embedPath(WIDGETS[id]);
        expect(path, `${id} has no embed route`).not.toBeNull();
        expect(existsSync(join(ROOT, "app/(embed)", path!, "page.tsx")), path!).toBe(true);
      }
      if (e.einbindung === "zentral") expect(e.vorschau.art).toBe("monitor");
      if (e.vorschau.art === "keine") expect(e.vorschau.grund.length).toBeGreaterThan(20);
      // Acceptance only with a source that exists.
      if (e.abnahme) expect(existsSync(join(ROOT, e.abnahme.beleg.split(",")[0])), e.abnahme.beleg).toBe(true);
    });
  }

  it("marks as central only widgets that use the shared frame", () => {
    for (const id of ids) {
      const e = WERKSTATT_BESTAND[id];
      const usesFrame = [e.komponente, ...e.einsatzorte.map((o) => o.datei)].some((f) => /ExportableWidgetFrame/.test(read(f)));
      expect(e.einbindung === "zentral", `${id}: central=${e.einbindung === "zentral"}, frame=${usesFrame}`).toBe(usesFrame);
      // "teilweise" means the registry footer path (WidgetFooter, directly or via a shared shell).
      if (e.einbindung === "teilweise") {
        const usesFooter = [e.komponente, ...e.einsatzorte.map((o) => o.datei)].some((f) => /WidgetFooter|GemeindeWidgetShell|RaceChart/.test(read(f)));
        expect(usesFooter, `${id}: partial without the registry footer`).toBe(true);
      }
    }
  });
});
