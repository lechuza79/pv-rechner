import React from "react";
import { it, expect, vi, describe } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { StoryConcept } from "../story-konzepte";

vi.mock("embla-carousel-react", () => ({ default: () => [() => {}, undefined] }));
vi.mock("embla-carousel-auto-scroll", () => ({ default: () => ({ play() {}, stop() {} }) }));
vi.mock("../../components/social/MunicipalChart", () => ({ MunicipalChart: () => <span>chart</span> }));

import Logo from "../../components/Logo";
import { ExportOnly } from "../../components/WidgetExport";
import Insights from "../../components/gemeinde/GemeindeInsights";

describe("Seitengewicht: keine versteckte oder dreifache Grafik im Server-HTML", () => {
  it("das Logo trägt seine Pfade sofort — nur im reinen Bild-Fuß kommen sie nach dem Laden", () => {
    const sichtbar = renderToStaticMarkup(<Logo />);
    expect(sichtbar).toMatch(/<path/);
    const imBild = renderToStaticMarkup(<ExportOnly><Logo /></ExportOnly>);
    expect(imBild).toMatch(/aria-label="solar-check.io"/);
    expect(imBild).not.toMatch(/<path/);
  });

  it("die Geschichten-Reihe steht im Server-HTML einmal, nicht dreimal", () => {
    const stories = ["a", "b", "c"].map((id) => ({ id, title: `T${id}`, period: "2026-09", values: [], kind: "facts" }) as unknown as StoryConcept);
    const html = renderToStaticMarkup(<Insights stories={stories} name="Höchberg" />);
    expect(html.match(/class="story-strip-slide"/g)).toHaveLength(3);
  });
});
