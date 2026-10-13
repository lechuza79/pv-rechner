import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import AtlasBreadcrumb from "../../components/gemeinde/AtlasBreadcrumb";
import Breadcrumb from "../../components/Breadcrumb";

const source = (path: string) => readFileSync(resolve(__dirname, "../..", path), "utf8");

describe("shared municipality breadcrumb frame", () => {
  it("keeps every intermediate destination in a native mobile disclosure", () => {
    const parents = [
      {name: "Solar-Atlas", href: "/solar-atlas"},
      {name: "Rheinland-Pfalz", href: "/solar-atlas/rheinland-pfalz"},
      {name: "Landkreis Kaiserslautern", href: "/solar-atlas/rheinland-pfalz/landkreis-kaiserslautern"},
      {name: "Verbandsgemeinde Bruchmühlbach-Miesau", href: "/solar-atlas/rheinland-pfalz/landkreis-kaiserslautern/verbandsgemeinden/bruchmuehlbach-miesau"},
    ];
    const html = renderToStaticMarkup(<AtlasBreadcrumb parents={parents} name="Gerhardsbrunn" />);
    const disclosure = html.match(/<details[\s\S]*?<\/details>/)?.[0];
    expect(disclosure).toContain('aria-label="Übergeordnete Seiten anzeigen"');
    for (const parent of parents.slice(1)) expect(disclosure).toContain(`href="${parent.href}"`);
    expect(disclosure).not.toContain('href="/solar-atlas"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).not.toContain("<details open");
  });
  it("does not add a disclosure when there is nothing to collapse", () => {
    for (const parents of [[], [{name: "Solar-Atlas", href: "/solar-atlas"}]]) {
      expect(renderToStaticMarkup(<AtlasBreadcrumb parents={parents} name="Deutschland" />)).not.toContain("<details");
    }
  });

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
