import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { indexierbarBefund, verlinktePfade, verlinkteSeiteBefund } from "../verlinkte-seiten";

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

  it("eine Veröffentlichung über einen Kreis prüft nur die Kreisseite (Fehlalarm 05.10.2026)", () => {
    expect(verlinktePfade(["06440"], regionen).map((s) => s.pfad)).toEqual([
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

describe("Angeschriebene Seiten sind indexierbar", () => {
  it("noindex ist ein Befund", () => {
    expect(indexierbarBefund(200, '<meta name="robots" content="noindex, nofollow"/>')).toMatch(/nicht indexieren/);
    expect(indexierbarBefund(200, "<meta content=\"noindex\" name='robots'>")).toMatch(/nicht indexieren/);
  });
  it("index ist in Ordnung", () => {
    expect(indexierbarBefund(200, '<meta name="robots" content="index, follow"/>')).toBeNull();
  });
  it("Fehlerstatus ist ein Befund, Weiterleitung nicht", () => {
    expect(indexierbarBefund(404, "")).toBe("HTTP 404");
    expect(indexierbarBefund(308, "")).toBeNull();
  });
  it("ein zweites robots-Tag mit noindex zählt", () => {
    expect(indexierbarBefund(200, '<meta name="robots" content="index"/><meta name="robots" content="noindex"/>')).not.toBeNull();
  });
});
