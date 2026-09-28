import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { verlinktePfade, verlinkteSeiteBefund } from "../verlinkte-seiten";

const regionen = [
  { region_id: "06", slug: "hessen", name: "Hessen" },
  { region_id: "06440", slug: "landkreis-wetteraukreis", name: "Landkreis Wetteraukreis" },
  { region_id: "06440016", slug: "nidda", name: "Nidda" },
];

describe("Seiten, auf die jemand verlinkt", () => {
  it("prüft Gemeinde und Kreis", () => {
    expect(verlinktePfade(["06440016", "06440016"], regionen).map((s) => s.pfad)).toEqual([
      "/solar-atlas/hessen/landkreis-wetteraukreis/nidda",
      "/solar-atlas/hessen/landkreis-wetteraukreis",
    ]);
  });

  it("die richtige Seite besteht", () => {
    expect(verlinkteSeiteBefund(200, "<title>Photovoltaik in Nidda: Bestand</title>", "Nidda")).toBeNull();
    expect(verlinkteSeiteBefund(200, "<title>Photovoltaik im Wetteraukreis</title>", "Landkreis Wetteraukreis")).toBeNull();
  });

  it("der Vorfall vom 28.09.2026: 404 fällt auf", () => {
    expect(verlinkteSeiteBefund(404, "<title>Seite nicht gefunden</title>", "Nidda")).toMatch(/404/);
  });

  it("200 mit dem Text der Fehlerseite fällt auf", () => {
    expect(verlinkteSeiteBefund(200, "<title>Photovoltaik im Wetteraukreis</title><h1>Diese Seite gibt es nicht.</h1>", "Landkreis Wetteraukreis")).toMatch(/Fehlerseite/);
  });

  it("die unsichtbare Vorlage der Fehlerseite im Datenteil ist kein Fehler", () => {
    expect(verlinkteSeiteBefund(200, '<title>Photovoltaik in Nidda</title><script>self.__next_f.push("Diese Seite gibt es nicht.")</script>', "Nidda")).toBeNull();
  });

  it("eine fremde Seite unter der Adresse fällt auf", () => {
    expect(verlinkteSeiteBefund(200, "<title>Solar Check</title>", "Nidda")).toMatch(/Seitentitel/);
  });

  it("die Weiterleitung einer kreisfreien Stadt ist in Ordnung", () => {
    expect(verlinkteSeiteBefund(308, "", "Trier")).toBeNull();
  });

  it("der Gesundheitscheck benutzt die Prüfung wirklich", () => {
    const check = readFileSync(resolve(__dirname, "../../scripts/health-check.ts"), "utf8");
    expect(check).toMatch(/verlinkteSeiteBefund\(/);
    expect(check).toMatch(/verlinktePfade\(/);
  });
});
