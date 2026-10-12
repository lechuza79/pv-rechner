import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Breadcrumb from "../../components/Breadcrumb";

const source = (path: string) => readFileSync(resolve(__dirname, "../..", path), "utf8");

describe("shared municipality breadcrumb frame", () => {
  it("keeps linked parents and the current page accessible in the framed page variant", () => {
    const html = renderToStaticMarkup(<Breadcrumb variant="page" items={[{label:"Bayern",href:"/solar-atlas/bayern"},{label:"München"}]} />);
    expect(html).toContain('aria-label="Brotkrümel"');
    expect(html).toContain('href="/solar-atlas/bayern"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('framed');
  });
  it("keeps the accepted municipal and funding consumers on the same complete frame", () => {
    for (const path of ["components/gemeinde/GemeindeSeite.tsx", "components/gemeinde/GemeindeHeroStage.tsx", "components/FundingPageShell.tsx"])
      expect(source(path),path).toMatch(/<AtlasBreadcrumb framed/);
    expect(source("components/FundingPageShell.module.css")).not.toMatch(/\.breadcrumb[^}]*border-top/);
  });
});
