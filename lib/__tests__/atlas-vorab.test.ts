import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { VORAB_MAX, vorabRegionIds } from "../atlas-vorab";

describe("Atlas-Seiten, die beim Build entstehen", () => {
  it("nimmt jede veröffentlichte Gemeinde und ihren Kreis, ohne Doppelte", () => {
    expect(vorabRegionIds(["06440016", "01053009", "06440016"])).toEqual(["01053009", "01053", "06440016", "06440"]);
  });

  it("ein Kreis mit zwei veröffentlichten Gemeinden steht nur einmal da", () => {
    expect(vorabRegionIds(["06440016", "06440001"])).toEqual(["06440001", "06440", "06440016"]);
  });

  it("überspringt alles, was kein Gemeindeschlüssel ist", () => {
    expect(vorabRegionIds(["06440", "abc", ""])).toEqual([]);
  });

  it("hält den Deckel — der Juli-Fall kam von zu vielen Seiten auf einmal", () => {
    const viele = Array.from({ length: 100 }, (_, i) => `0${String(1000000 + i * 1000).slice(0, 7)}`);
    expect(vorabRegionIds(viele).length).toBe(VORAB_MAX);
  });

  it("die Atlas-Route benutzt die Liste wirklich", () => {
    const seite = readFileSync(resolve(__dirname, "../../app/(site)/solar-atlas/[[...pfad]]/page.tsx"), "utf8");
    expect(seite).toMatch(/generateStaticParams\(\)\s*\{\s*return \[\{ pfad: \[\] as string\[\] \}, \.\.\.\(await vorabPfade\(\)\)\]/);
  });

  it("der Build rendert in kleinen Stapeln und wiederholt Fehlschläge", () => {
    const konfig = readFileSync(resolve(__dirname, "../../next.config.js"), "utf8");
    expect(konfig).toMatch(/staticGenerationMaxConcurrency:\s*[1-4],/);
    expect(konfig).toMatch(/staticGenerationRetryCount:\s*[1-9],/);
  });
});
