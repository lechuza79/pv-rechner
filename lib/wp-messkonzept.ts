// Metering options for a heat pump next to rooftop PV — which one costs less?
//
// Three ways to connect a heat pump that the household can actually choose:
//   gemeinsam  one household meter; the grid operator grants the flat §14a
//              reduction (module 1). Solar power reaches the heat pump.
//   getrennt   a second meter on a heat-pump tariff (module 2 lowers the
//              grid-fee share of the working price). Solar power cannot reach
//              the heat pump; it is fed in instead.
//   kaskade    second meter wired behind the household meter (cascade): heat
//              pump tariff for its grid draw AND solar power for the heat pump.
//
// Source for both modules: Bundesnetzagentur, "Integration von steuerbaren
// Verbrauchseinrichtungen" (read 06.10.2026):
//   module 1: flat reduction "zwischen 110 und 190 Euro im Jahr" depending on
//             the grid area (Stand 2023), granted per market location, no
//             separate meter needed;
//   module 2: grid-fee working price reduced "auf 40 Prozent"; technical
//             condition "ein separater Zähler"; no grid-fee standing charge on
//             that meter.
// https://www.bundesnetzagentur.de/DE/Vportal/Energie/SteuerbareVBE/start.html
//
// What this does NOT know, and therefore names instead of guessing:
//   - the module-1 amount of the user's grid operator (we compute both ends);
//   - the one-off cost of a second meter or cascade wiring (user input);
//   - whether a given supplier still offers a heat-pump tariff; the tariff level
//     is a market assumption from the heat-pump config, not an official value.
// Module 1 is also available with a separate meter; we compare the separate
// meter with module 2 because that is what a heat-pump tariff is built on.
// Adversarial check of all statements: 06.10.2026 against the BNetzA page and
// § 14a EnWG (the determination BK8-22/010-A itself was not reachable).
// The heat-pump tariff and the second meter's standing charge come from the
// heat-pump calculator config (one source, maintained by its watcher).
//
// Energy quantities come from the shared hourly simulation, for every option
// alike. The PV money result elsewhere uses the HTW power law; this block is a
// relative comparison between metering options and must not mix the two.

export const PARAGRAF_14A = {
  modul1EuroProJahr: { min: 110, max: 190 },
  modul1Stand: 2023,
  modul2ArbeitspreisAnteil: 0.4,
  quelle: "https://www.bundesnetzagentur.de/DE/Vportal/Energie/SteuerbareVBE/start.html",
  gelesenIso: "2026-10-06",
} as const;

export type MesskonzeptId = "gemeinsam" | "getrennt" | "kaskade";

/** Annual energy totals of one simulation run, kWh. */
export interface MesskonzeptEnergie {
  gridKwh: number;
  feedInKwh: number;
  wpLoadKwh: number;
  wpSelfCoveredKwh: number;
}

export interface MesskonzeptEingabe {
  /** Household incl. heat pump, solar power reaches the heat pump. */
  mitWp: MesskonzeptEnergie;
  /** Same household and PV without the heat pump (for the separate meter). */
  ohneWp: Pick<MesskonzeptEnergie, "gridKwh" | "feedInKwh">;
  haushaltsPreis: number;      // €/kWh
  wpTarif: number;             // €/kWh
  wpZaehlerGrundpreis: number; // €/a, second meter
  einspeiseSatz: number;       // €/kWh
  /** One-off cost of a second meter or cascade wiring, € (user input). */
  umbauKosten?: number;
}

export interface MesskonzeptKosten {
  id: MesskonzeptId;
  /** Annual electricity cost net of feed-in revenue, €/a; min/max span the module-1 range. */
  min: number;
  max: number;
  umbau: number;
}

export function messkonzeptKosten(e: MesskonzeptEingabe): MesskonzeptKosten[] {
  const umbau = Math.max(0, e.umbauKosten ?? 0);
  const { mitWp, ohneWp } = e;
  const erloesMit = mitWp.feedInKwh * e.einspeiseSatz;

  const gemeinsamBrutto = mitWp.gridKwh * e.haushaltsPreis - erloesMit;
  const wpGrid = Math.max(0, mitWp.wpLoadKwh - mitWp.wpSelfCoveredKwh);
  const haushaltGrid = Math.max(0, mitWp.gridKwh - wpGrid);
  const kaskade = haushaltGrid * e.haushaltsPreis + wpGrid * e.wpTarif + e.wpZaehlerGrundpreis - erloesMit;
  const getrennt = ohneWp.gridKwh * e.haushaltsPreis + mitWp.wpLoadKwh * e.wpTarif
    + e.wpZaehlerGrundpreis - ohneWp.feedInKwh * e.einspeiseSatz;

  return [
    // Module 1 is a reduction: the larger amount gives the lower cost.
    { id: "gemeinsam", min: gemeinsamBrutto - PARAGRAF_14A.modul1EuroProJahr.max, max: gemeinsamBrutto - PARAGRAF_14A.modul1EuroProJahr.min, umbau: 0 },
    { id: "getrennt", min: getrennt, max: getrennt, umbau },
    { id: "kaskade", min: kaskade, max: kaskade, umbau },
  ];
}

export interface MesskonzeptEmpfehlung {
  kosten: MesskonzeptKosten[];
  /** Cheapest option for every module-1 amount, or null if the grid area decides. */
  empfohlen: MesskonzeptId | null;
  /** Options that win somewhere in the module-1 range. */
  kandidaten: MesskonzeptId[];
}

/** Ranks options by annual cost; a one-off conversion is spread over `jahre`. */
export function empfiehlMesskonzept(e: MesskonzeptEingabe, jahre: number): MesskonzeptEmpfehlung {
  const kosten = messkonzeptKosten(e);
  const jaehrlich = (k: MesskonzeptKosten, ende: "min" | "max") => k[ende] + (jahre > 0 ? k.umbau / jahre : 0);
  const sieger = (ende: "min" | "max") =>
    [...kosten].sort((a, b) => jaehrlich(a, ende) - jaehrlich(b, ende)
      // Tie: the option without conversion wins.
      || a.umbau - b.umbau)[0].id;
  const kandidaten = [...new Set([sieger("min"), sieger("max")])];
  return { kosten, empfohlen: kandidaten.length === 1 ? kandidaten[0] : null, kandidaten };
}
