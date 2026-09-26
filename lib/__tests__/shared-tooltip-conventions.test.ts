import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(__dirname, "../..");
// These are data readouts or navigation labels, not explanatory help.
const owners: Record<string, number> = {
  "components/InfoTooltip.tsx": 1,
  "components/charts/CategoryBarChart.tsx": 1,
  "components/dashboard/KpiOverview.tsx": 1,
  "components/FlowNav.tsx": 1,
};
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : /\.(tsx?|jsx?)$/.test(path) ? [path] : [];
  });
}

describe("Shared tooltip ownership", () => {
  it("rejects additional tooltip renderers outside the shared component", () => {
    const violations: string[] = [];
    for (const file of ["app", "components", "public/gemeinde"].flatMap(dir => files(join(root, dir)))) {
      const source = readFileSync(file, "utf8");
      const count = [...source.matchAll(/\brole\s*(?:=\s*\{?\s*|:\s*)["']tooltip["']|setAttribute\(\s*["']role["']\s*,\s*["']tooltip["']/g)].length;
      const path = relative(root, file);
      if (count > (owners[path] ?? 0)) violations.push(path);
    }
    expect(violations, "Use InfoTooltip (or InfoTooltipBindings for legacy markup); extend the shared component instead of creating another renderer.").toEqual([]);
  });
});
