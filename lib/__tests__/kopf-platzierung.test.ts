import { describe, expect, it } from "vitest";
import { kopfPlatzierung } from "../../components/gemeinde/rangliste-daten";

// Ranking keys as the package stores them: category : scope (de | state | district) : size class.
const rang = (key: string, rank: number, size: number, value = 1000) => ({ key, label: "", scope: "", rank, size, value, cohort: "", rules: "", distinction: rank <= 3 ? `Platz ${rank}` : rank / size <= 0.1 ? "Beste 10 %" : null, format: "", asOf: "", comparisonMonth: null, comparisonYear: null, changePeriod: null });
const paket = (rankings: ReturnType<typeof rang>[]) => ({
  ags: "12062461",
  kreis: { ags: "12062", name: "Landkreis Elbe-Elster" },
  rankings,
  district: { peers: [{ region_id: "a", sums: { alle: { count: 900 } } }, { region_id: "b", sums: { alle: { count: 800 } } }, { region_id: "12062461", sums: { alle: { count: 429 } } }] },
}) as never;

describe("head of the town page shows the letter's placement (15.10.2026)", () => {
  it("Schönewalde: state win beats the district count and district wins", () => {
    const p = paket([rang("batterie-privat-pk:12062:kleine-gemeinden", 1, 15), rang("dach-privat-pk:12:kleine-gemeinden", 1, 140)]);
    expect(kopfPlatzierung(p)).toEqual({ art: "auszeichnung", index: 1 });
  });
  it("a top tenth in Germany beats a win in the state", () => {
    const p = paket([rang("dach-privat-pk:12:kleine-gemeinden", 1, 140), rang("balkon-pk:de:kleine-gemeinden", 200, 4003)]);
    expect(kopfPlatzierung(p)).toEqual({ art: "auszeichnung", index: 1 });
  });
  it("skips absolute totals and growth below the letter's minimum", () => {
    const p = paket([rang("solar-gesamt:de:all", 1, 10746), rang("tempo-1j:12:kleine-gemeinden", 1, 140, 100), rang("balkon-pk:12062:kleine-gemeinden", 2, 15)]);
    expect(kopfPlatzierung(p)).toEqual({ art: "auszeichnung", index: 2 });
  });
  it("falls back to the district count without any award", () => {
    expect(kopfPlatzierung(paket([rang("dach-privat-pk:12:kleine-gemeinden", 50, 140)]))).toEqual({ art: "anzahl", platz: 3 });
  });
});
