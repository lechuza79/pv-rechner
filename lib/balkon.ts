// Balkon-PV / Steckersolar — reine Berechnungsfunktionen.
// Modell und Kalibrierung: siehe lib/balkon-config.ts.

import { DEFAULT_BALKON_CONFIG, type BalkonConfig, type BalkonSetId, type BalkonOrientationId, type BalkonPresenceId } from "./balkon-config";

export interface BalkonInputs {
  setId: BalkonSetId;
  orientationId: BalkonOrientationId;
  presenceId: BalkonPresenceId;
  haushaltKwh: number;     // Jahresverbrauch Haushalt (für Autarkie)
  specificYield: number;   // kWh/kWp am Standort (PVGIS oder Fallback)
  stromPrice: number;      // €/kWh
  invest?: number;         // optional überschriebener Set-Preis
}

export interface BalkonResult {
  moduleKwp: number;
  inverterKw: number;
  annualYield: number;      // kWh/a nach Wechselrichter-Deckelung
  clipped: boolean;         // true, wenn der Wechselrichter den Ertrag begrenzt
  selfShare: number;        // Eigenverbrauchsanteil (0–1)
  selfUsedKwh: number;      // selbst genutzt (kWh/a)
  feedInKwh: number;        // unvergüteter Überschuss (kWh/a)
  savingPerYear: number;    // €/a
  autarky: number;          // 0–1
  invest: number;           // €
  amortYears: number;       // Jahre (Infinity wenn keine Ersparnis)
  co2PerYear: number;       // kg/a
  lifetimeSaving: number;   // € über die Lebensdauer, abzüglich Investition
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export interface BalkonRecommendation {
  bestId: BalkonSetId;
  clear: boolean;   // klarer Sieger (deutlicher Abstand) oder mehrere gleichwertig?
  ranked: { id: BalkonSetId; result: BalkonResult }[]; // nach 20-Jahres-Gewinn absteigend
}

/** Empfiehlt aus den Angaben (Haushalt, Anwesenheit, Ausrichtung, Standort) das
 *  wirtschaftlich beste Set — gemessen am 20-Jahres-Gewinn. `clear` ist false,
 *  wenn der Abstand zum zweitbesten klein ist (dann alle Optionen gleichwertig
 *  anbieten statt eine aufzudrängen). */
export function recommendBalkonSet(
  base: Omit<BalkonInputs, "setId" | "invest">,
  cfg: BalkonConfig = DEFAULT_BALKON_CONFIG,
): BalkonRecommendation {
  const ranked = cfg.sets
    .map(s => ({ id: s.id, result: calcBalkon({ ...base, setId: s.id }, cfg) }))
    .sort((a, b) => b.result.lifetimeSaving - a.result.lifetimeSaving);

  const best = ranked[0].result.lifetimeSaving;
  const second = ranked[1]?.result.lifetimeSaving ?? best;
  // Klarer Sieger, wenn der Vorsprung spürbar ist (mind. 100 € und 8 %).
  const margin = best - second;
  const clear = margin >= 100 && margin >= Math.abs(best) * 0.08;

  return { bestId: ranked[0].id, clear, ranked };
}

export function calcBalkon(inputs: BalkonInputs, cfg: BalkonConfig = DEFAULT_BALKON_CONFIG): BalkonResult {
  const set = cfg.sets.find(s => s.id === inputs.setId) ?? cfg.sets[0];
  const orient = cfg.orientations.find(o => o.id === inputs.orientationId) ?? cfg.orientations[0];
  const presence = cfg.presence.find(p => p.id === inputs.presenceId) ?? cfg.presence[0];

  const moduleKwp = set.moduleWp / 1000;
  const inverterKw = set.inverterW / 1000;

  // Rohertrag aus Modulleistung × Standort-Ertrag × Ausrichtung, gedeckelt durch
  // den Wechselrichter (mehr Module bringen früh/spät mehr, die Mittagsspitze
  // wird abgeschnitten — das bildet die Volllaststunden-Grenze ab).
  const rawYield = moduleKwp * inputs.specificYield * orient.factor;
  const inverterCap = inverterKw * cfg.maxFullLoadHours;
  const annualYield = Math.round(Math.min(rawYield, inverterCap));
  const clipped = inverterCap < rawYield;

  // Eigenverbrauchsanteil: sinkt mit der Anlagengröße relativ zur Grundlast.
  let selfShare = presence.selfShareBase * Math.pow(cfg.refYieldKwh / Math.max(annualYield, 1), cfg.sizeExp);
  selfShare = clamp(selfShare, cfg.selfShareMin, cfg.selfShareMax);

  // Mehr selbst nutzen als der Haushalt verbraucht, ist unmöglich.
  const selfUsedKwh = Math.round(Math.min(annualYield * selfShare, inputs.haushaltKwh));
  const feedInKwh = Math.max(0, annualYield - selfUsedKwh);

  const invest = inputs.invest ?? set.price;
  const savingPerYear = Math.round(selfUsedKwh * inputs.stromPrice);
  const amortYears = savingPerYear > 0 ? invest / savingPerYear : Infinity;
  const autarky = inputs.haushaltKwh > 0 ? clamp(selfUsedKwh / inputs.haushaltKwh, 0, 1) : 0;
  const co2PerYear = Math.round(selfUsedKwh * cfg.gridCo2PerKwh);

  // Lebensdauer-Ersparnis mit Degradation, konstanter Strompreis (konservativ,
  // reale Strompreissteigerung würde es besser machen).
  let lifetimeSaving = 0;
  let yearlyKwh = selfUsedKwh;
  for (let i = 0; i < cfg.lifetimeYears; i++) {
    lifetimeSaving += yearlyKwh * inputs.stromPrice;
    yearlyKwh *= (1 - cfg.degradation);
  }
  lifetimeSaving = Math.round(lifetimeSaving - invest);

  return {
    moduleKwp, inverterKw, annualYield, clipped, selfShare,
    selfUsedKwh, feedInKwh, savingPerYear, autarky, invest,
    amortYears, co2PerYear, lifetimeSaving,
  };
}
