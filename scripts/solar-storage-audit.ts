/** Run with: node --import tsx scripts/solar-storage-audit.ts /path/to/pvgis.json
 * Uses the production dispatch for all comparisons, never a second simulator.
 * Source: PVGIS v5.3 seriescalc, 51.3/9.5, 2023, 1 kWp, loss=14, angle=35, aspect=0.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { simulateSolarYear, monthlyFromAnnual } from "../lib/balkon-sim";
import { SOLAR_YEAR_DE, type SolarDayType } from "../lib/solar-year";
import { calcAutarkie } from "../lib/calc";

const file = process.argv[2];
if (!file) throw new Error("Pass the saved public PVGIS JSON file");
const raw = readFileSync(file, "utf8");
const data = JSON.parse(raw);
const hourly = data.outputs?.hourly as { time: string; P: number }[];
if (hourly?.length !== 8760 || data.inputs?.meteo_data?.year_min !== 2023
  || data.inputs?.location?.latitude !== 51.3 || data.inputs?.location?.longitude !== 9.5
  || data.inputs?.mounting_system?.fixed?.slope?.value !== 35
  || data.inputs?.mounting_system?.fixed?.azimuth?.value !== 0
  || data.inputs?.meteo_data?.radiation_db !== "PVGIS-SARAH3"
  || data.inputs?.pv_module?.peak_power !== 1 || data.inputs?.pv_module?.system_loss !== 14) {
  throw new Error("Expected the 2023 German reference year, same location and PV configuration");
}
const months: SolarDayType[][] = Array.from({ length: 12 }, () => []);
for (let i = 0; i < hourly.length; i += 24) {
  const hours = hourly.slice(i, i + 24);
  const month = Number(hours[0].time.slice(4, 6)) - 1;
  if (hours.some((row, h) => Number(row.time.slice(9, 11)) !== h || !Number.isFinite(row.P) || row.P < 0)) {
    throw new Error("Invalid hourly source row");
  }
  months[month].push({ days: 1, w: hours.map(row => row.P) });
}
const dailyEnergy = (d: SolarDayType) => d.w.reduce((sum, w) => sum + w, 0);
const chronological = { sued_flach: months };
const sorted = { sued_flach: months.map(days => [...days].sort((a, b) => dailyEnergy(a) - dailyEnergy(b))) };
// Isolate ordering from within-type averaging: put the existing six day types
// back in the order of their real source-day ranks, preserving type frequency.
const reordered = { sued_flach: months.map((days, m) => {
  const ranked = days.map((d, index) => ({ index, energy: dailyEnergy(d) })).sort((a, b) => a.energy - b.energy);
  const result: SolarDayType[] = [];
  let index = 0;
  for (const type of SOLAR_YEAR_DE.sued_flach[m]) {
    for (let d = 0; d < type.days; d++) result[ranked[index++].index] = { days: 1, w: type.w };
  }
  return result;
}) };
const round = (v: number) => Math.round(v * 100) / 100;
const rows = [];
for (const [moduleKwp, inverterKw, baseKwh, tagQuote, roundtrip, capacities] of [
  [1, .8, 2800, .4, .825, [0, 2.11, 4.22, 6.33, 10.55]],
  [2, .8, 2800, .4, .825, [0, 2.11, 4.22, 6.33, 10.55]],
  [5, 5, 3800, .4, .9, [0, 2, 5, 10]],
  [12, 12, 3800, .4, .9, [0, 5, 10, 15]],
] as const) {
  for (const batteryKwh of capacities) {
    const input = { moduleKwp, inverterKw, batteryKwh, roundtrip,
      monthlyYieldPerKwp: monthlyFromAnnual(1024), orientation: "sued_flach",
      household: { baseKwh, tagQuote, wpActive: false, eaActive: false } };
    const legacy = simulateSolarYear(input);
    const dc = simulateSolarYear({ ...input, batteryCoupling: "dc" });
    const actual = simulateSolarYear(input, chronological);
    const rawSorted = simulateSolarYear(input, sorted);
    const compactReordered = simulateSolarYear(input, reordered);
    const dcActual = simulateSolarYear({ ...input, batteryCoupling: "dc" }, chronological);
    const dcSorted = simulateSolarYear({ ...input, batteryCoupling: "dc" }, sorted);
    const dcReordered = simulateSolarYear({ ...input, batteryCoupling: "dc" }, reordered);
    const noStorage = simulateSolarYear({ ...input, batteryKwh: 0 });
    const autarky = (s: typeof legacy) => round(s.selfUsedKwh / s.consumptionKwh * 100);
    rows.push({ moduleKwp, batteryKwh,
      legacySelfKwh: legacy.selfUsedKwh, dcSelfKwh: dc.selfUsedKwh,
      dcGainOfStoragePct: batteryKwh ? round((dc.selfUsedKwh - legacy.selfUsedKwh) / (legacy.selfUsedKwh - noStorage.selfUsedKwh) * 100) : 0,
      chronologicalSelfKwh: actual.selfUsedKwh, sortedActualSelfKwh: rawSorted.selfUsedKwh,
      compactReorderedSelfKwh: compactReordered.selfUsedKwh,
      chronologicalDcSelfKwh: dcActual.selfUsedKwh, sortedDcSelfKwh: dcSorted.selfUsedKwh,
      compactReorderedDcSelfKwh: dcReordered.selfUsedKwh,
      legacyAutarky: autarky(legacy), chronologicalAutarky: autarky(actual),
      htwAutarky: moduleKwp >= 5 ? calcAutarkie({ kwp: moduleKwp, speicherKwh: batteryKwh, gesamtVerbrauch: baseKwh, ertragKwp: 1024 }) : null,
    });
  }
}
console.log(JSON.stringify({ sourceSha256: createHash("sha256").update(raw).digest("hex"), inputs: data.inputs, rows }, null, 2));
