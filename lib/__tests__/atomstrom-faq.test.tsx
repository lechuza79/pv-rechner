import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import Faq from "../../components/Faq";
import DataSourceList from "../../components/DataSourceList";
import { importFaqs, strommixFaqs, zubauFaqs, weitereFaqs, toFaqEntry } from "../../app/(site)/atomstrom-import/faq-data";

const page = readFileSync(join(__dirname, "../../app/(site)/atomstrom-import/AtomstromPage.tsx"), "utf8");
const all = [...importFaqs, ...strommixFaqs, ...zubauFaqs, ...weitereFaqs];

describe("Atomstrom FAQ on the shared FAQ component", () => {
  it("renders through components/Faq, not a page-local accordion", () => {
    expect(page).toContain('from "../../../components/Faq"');
    expect(page).not.toMatch(/FaqAccordion|<details/);
  });

  it("publishes exactly one FAQPage: the groups render without their own schema", () => {
    expect(page.match(/"FAQPage"/g)).toHaveLength(1);
    expect(page).toMatch(/<Faq[^>]*jsonLd=\{false\}/);
    const html = renderToStaticMarkup(<Faq items={[toFaqEntry(importFaqs[0])]} jsonLd={false} />);
    expect(html).not.toContain("application/ld+json");
  });

  it("keeps short answer and Erläuterung as two paragraphs with the same text", () => {
    const item = importFaqs[0];
    const html = renderToStaticMarkup(<Faq items={[toFaqEntry(item)]} jsonLd={false} />);
    expect(html.match(/<p>/g)).toHaveLength(2);
    expect(toFaqEntry(item).a).toBe(`${item.short}\n\n${item.long}`);
  });

  it("links glossary terms in the Erläuterung only, never in the short answer", () => {
    const linked = all.map(toFaqEntry).filter((e) => e.links?.length);
    expect(linked.length).toBeGreaterThan(0);
    for (const item of all) {
      for (const link of toFaqEntry(item).links ?? []) {
        expect(item.long).toContain(link.phrase);
        expect(item.short ?? "").not.toContain(link.phrase);
      }
    }
  });
});

describe("Atomstrom sources", () => {
  it("names register sources through DataSourceList and links the methodology once", () => {
    expect(page).toMatch(/<DataSourceList[\s\S]*only=\{\["energyCharts", "ember"\]\}/);
    expect(page).not.toContain("sourceLabel(");
    expect(page.match(/href="\/atomstrom-import\/methodik"/g)).toHaveLength(1);
  });

  it("a filtered list shows only the requested sources and claims no register anchors", () => {
    const html = renderToStaticMarkup(<DataSourceList only={["ember"]} tone="inherit" />);
    expect(html).toContain("Ember");
    expect(html).not.toContain("Energy-Charts");
    expect(html).not.toContain('id="quelle-');
  });
});
