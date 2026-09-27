import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SocialKarte } from "../../components/social/SocialKarte";
import { moeglicheFormen } from "../social-bildformen";
import type { PostBild } from "../social-posts";
const bild: PostBild = {
  art: "anteilsprofil", stil: "hell", aussage: "Solarleistung im Ort", gemessen: "Anteile an der installierten Leistung", quelle: "Testquelle",
  ganzes: 100, serien: [
    { label: "private Dächer", wert: 38, einheit: "%" },
    { label: "Gewerbedächer", wert: 62, einheit: "%" },
    { label: "Freifläche", wert: 0, einheit: "%" },
  ],
};
describe("Share-card share profile", () => {
  it("requires an exhaustive distribution rather than overlapping quantities", () => {
    expect(moeglicheFormen(bild)).toContain("anteilsprofil");
    expect(moeglicheFormen({ ...bild, serien: bild.serien.map((s) => ({ ...s, wert: 80 })) })).not.toContain("anteilsprofil");
    expect(moeglicheFormen({ ...bild, ganzes: undefined })).not.toContain("anteilsprofil");
  });
  it.each(["hell", "dunkel", "highlight"] as const)("retains zero labels without inventing positive widths in %s", (stil) => {
    const html = renderToStaticMarkup(<SocialKarte bild={{ ...bild, stil }} skala={1} stufe="quadrat" />);
    expect(html).toContain('data-anteil="0.62"');
    expect(html).toContain('data-anteil="0.38"');
    expect(html).not.toContain('data-anteil="0"');
    expect(html).toContain("Freifläche");
    expect(html).toContain("Testquelle");
  });
  it("keeps tiny shares proportional and labelled", () => {
    const tiny = { ...bild, serien: bild.serien.map((s, i) => ({ ...s, wert: [61.8, 38, 0.2][i] })) };
    const html = renderToStaticMarkup(<SocialKarte bild={tiny} skala={1} stufe="voll" />);
    expect(html).toContain('data-anteil="0.002"');
    expect(html).toContain("0,2");
  });
});
