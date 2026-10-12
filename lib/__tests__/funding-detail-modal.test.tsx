import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("../../components/Modal", () => ({
  default: ({ children, title }: { children: React.ReactNode; title: string }) => <div><h2>{title}</h2>{children}</div>,
  ModalSticky: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
}));
import FundingDetailModal, { FundingProgramDetails, sourceChangeLabel } from "../../components/FundingDetailModal";
import FundingOverviewCard from "../../components/FundingOverviewCard";
import { FUNDING_PROGRAMS } from "../funding-programs";

describe("funding details", () => {
  it("uses the same detail component in the Atlas and funding overview", () => {
    for (const file of ["components/gemeinde/GemeindeFoerderung.tsx", "components/FundingOverviewCard.tsx"]) {
      expect(readFileSync(file, "utf8")).toContain("<FundingDetailModal");
    }
    expect(readFileSync("app/(site)/photovoltaik-foerderung/[bundesland]/[stadt]/page.tsx", "utf8")).toContain("<FundingProgramDetails");
    expect(readFileSync("app/(site)/photovoltaik-foerderung/[bundesland]/page.tsx", "utf8")).toContain("<FundingOverviewCard");
    for (const file of ["components/landkreis/LandkreisSeite.tsx", "components/gemeinde/GemeindeSeite.tsx"]) {
      expect(readFileSync(file, "utf8")).toContain("<GemeindeFoerderung");
    }
  });
  it("keeps overview cards compact while preserving the local detail link and verification caveat", () => {
    const program = Object.values(FUNDING_PROGRAMS).find(p => p.id === "vg-weilerbach-meilenstein-preisgeld")!;
    const html = renderToStaticMarkup(<FundingOverviewCard selected={{programm: program, standLabel: "Noch nicht nachgeprüft", zaehlt: false}} ort="Weilerbach" detailHref="/foerderung/weilerbach" />);
    expect(html).toContain(program.name.replaceAll("&", "&amp;"));
    expect(html).toContain("noch nicht nachgeprüft");
    expect(html).toContain('href="/foerderung/weilerbach"');
    expect(html).toMatch(/<button[^>]*>Förderung im Detail<\/button>/);
    expect(html).not.toContain("Geltungsbereich");
    expect(html).not.toContain("↗");
  });
  it("keeps verification and source provenance visible on municipal pages", () => {
    const program = Object.values(FUNDING_PROGRAMS).find(p => p.name.includes("Rationelle Energieverwendung"))!;
    const html = renderToStaticMarkup(<FundingProgramDetails selected={{programm: program, standLabel: "geprüft", zaehlt: true}} ort="Heidelberg" context="page" />);
    const header = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
    expect(header).toContain("Förderung für");
    expect(header).toContain("noch nicht nachgeprüft");
    expect(html).toContain("Zur Programmseite beim Fördergeber");
    expect(html).toContain(`href="${program.url}"`);
    expect(html).toContain("bis 100 kWp");
    expect(html).not.toContain("Dach-PV (bis 100 kWp)");
    expect(html).toContain("kein Batteriespeicher");
    expect(html).toContain("Antrag vor Kauf/Installation");
  });
  it.each(Object.values(FUNDING_PROGRAMS))("renders catalogue programme $id through the shared page template", (program) => {
      const html = renderToStaticMarkup(<FundingProgramDetails selected={{ programm: program, standLabel: "", zaehlt: false }} ort={program.region} context="page" />);
      expect(html, program.id).toContain('<section');
      expect(html, program.id).toContain('aria-label="Antragstellung"');
      expect(html, program.id).toContain('<h2>');
      expect(html, program.id).not.toContain('undefined');
      expect(html, program.id).not.toContain('NaN');
  });
  it("never fabricates a source-change date", () => {
    expect(sourceChangeLabel()).toBe("Keine Änderung der Quelle erfasst");
    expect(sourceChangeLabel("invalid")).toBe("Keine Änderung der Quelle erfasst");
    expect(sourceChangeLabel("2026-10-05T12:00:00Z")).toBe("Änderung der Quelle erkannt am 05. Okt. 2026");
  });
  it("preserves the supplied verification caveat and only offers matching calculators", () => {
    const program = Object.values(FUNDING_PROGRAMS).find(p => p.id.includes("weilerbach") && p.name.includes("MEILENSTEIN"))!;
    expect(program).toBeDefined();
    const html = renderToStaticMarkup(<FundingDetailModal selected={{ programm: program, standLabel: "Werte von September 2026, noch nicht nachgeprüft", zaehlt: false }} ort="Weilerbach" onClose={() => {}} />);
    expect(html).toContain("noch nicht nachgeprüft");
    expect(html).toContain('href="/photovoltaik-rechner"');
    expect(html).toContain("Wärmepumpe</button>");
    expect(html).not.toContain('href="/balkonkraftwerk/rechner"');
    expect(html).not.toContain("Förder-Check ansehen");
    expect(html).not.toContain("Automatischer Förder-Check noch nicht verfügbar.");
    expect(html).not.toContain("↗");
    expect(html).toContain(program.coveredCosts);
    expect(html).toContain("Ein fester Eurobetrag ist nicht zugesagt");
    expect(html).not.toContain("ein zusätzlicher Punkt");
    expect(html).not.toContain("Voraussetzungen ansehen");
    expect(html).toContain(program.url.replaceAll("&", "&amp;"));
  });
});
