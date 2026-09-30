import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RATGEBER } from "../ratgeber";
import ContentTable from "../../components/ContentTable";

import ArchivTabelle from "../../app/(site)/einspeiseverguetung-tabelle/ArchivTabellen";

const root = join(__dirname, "../..");
const consumers = [
  "app/(site)/einspeiseverguetung-tabelle/page.tsx",
  "app/(site)/einspeiseverguetung-tabelle/ArchivTabellen.tsx",
];

describe("Shared content lookup table", () => {
  it("keeps caption, row and column associations available without JavaScript", () => {
    const html = renderToStaticMarkup(<ContentTable caption="Example values in kWh" minWidth={560}>
      <thead><tr><th scope="col">Period</th><th scope="col">Value</th></tr></thead>
      <tbody><tr data-current><th scope="row">Current</th><td>1.250</td></tr></tbody>
    </ContentTable>);
    expect(html).toContain('role="region" aria-label="Example values in kWh" tabindex="0"');
    expect(html).toMatch(/<caption[^>]*>Example values in kWh<\/caption>/);
    expect(html).toContain('<th scope="row">Current</th><td>1.250</td>');
    expect(html).toContain('<th scope="col">Value</th>');
  });

  it("server-renders every archive year and month without JavaScript", () => {
    const html = renderToStaticMarkup(<ArchivTabelle field="u10" />);
    expect(html.match(/<tr>/g)).toHaveLength(13);
    expect(html.match(/<td>/g)).toHaveLength(12 * 11);
    for (let year = 2012; year <= 2022; year++) {
      expect(html).toContain(`>${year}<`);
    }
    expect(html).toContain("19,50");
    expect(html).toContain("6,24");
    expect(html).not.toContain("Weitere Spalten");
  });

  it.each(consumers)("keeps %s on the shared table instead of a local copy", (path) => {
    const source = readFileSync(join(root, path), "utf8");
    expect(source).toMatch(/import ContentTable from/);
    expect(source).toContain("<ContentTable");
    expect(source).not.toMatch(/<table[\s>]/);
    expect(source).not.toMatch(/\b(?:thLeft|tdNum):\s*\{/);
  });
  it.each(RATGEBER.map(({ slug }) => slug))("keeps %s on the shared article standards", (slug) => {
    const page = readFileSync(join(root, `app/(site)${slug}/page.tsx`), "utf8");
    expect(page).toContain("<EditorialPage>");
    expect(page).toContain("components/EditorialContent.module.css");
    expect(page).toMatch(/<Breadcrumb\s+variant="compact"/);
    expect(page).not.toMatch(/style=\{S\.(?:page|wrap|h1|h2|p|subtitle)\}/);
  });

  it("keeps editorial typography in the shared scope", () => {
    const page = readFileSync(join(root, consumers[0]), "utf8");
    expect(page).toContain("<EditorialPage>");
    expect(page).toContain('components/EditorialContent.module.css');
    expect(page).not.toContain("const S =");
    const typography = readFileSync(join(root, "components/EditorialPage.module.css"), "utf8");
    expect(typography).not.toMatch(/--font-(?:text|display|heading|mono|chart-number)\s*:/);
    expect(typography).toContain("font-family: var(--font-text)");
    const wrapper = readFileSync(join(root, "components/EditorialPage.tsx"), "utf8");
    expect(wrapper).not.toContain("next/font");
  });

});
