import { calc, calcEigenverbrauch, estimateCost, calcWeightedFeedIn } from "./calc";
import { DEFAULT_PRICES } from "./prices-config";
import { DEFAULT_FEED_IN } from "./feedin-config";
import { calcHeatPump } from "./heatpump";
import { recommendBalkon } from "./balkon";
import { PERSONEN } from "./constants";

// Three different lead scenarios for a region, each anchored to its PV yield:
//   1. what a household loses over 5 years WITHOUT a PV system (10 kWp)
//   2. what a heat pump saves vs. gas over 20 years (location-independent)
//   3. what a balcony system earns per year (recommended set)
// Every number comes from the shared calc base (calc / calcHeatPump /
// recommendBalkon) — the same functions the rechner uses — so nothing is
// invented here.
//
// NOTE: The atlas Gemeinde page (lib/gemeinde-potential.ts, currently on the
// solar-atlas branch) computes the identical PV/WP/Balkon numbers on top of a
// population/coverage model. When that branch lands, both should call THIS
// primitive so the scenario math lives in one place.

export type FundingScenarios = {
  yieldKwhKwp: number;
  pvKwp: number;
  /** Ersparnis + Einspeisung a household forgoes over 5 years without PV. */
  pvFiveYearBenefit: number;
  /** Heat-pump 20-year TCO advantage over gas (tcoGas − tcoWp). */
  wpTco20: number;
  balkonSavingPerYear: number;
  balkonAmortYears: number;
};

export function buildFundingScenarios(yieldKwhKwp: number, monthly: number[] | null = null): FundingScenarios {
  // PV: typical single-family home, 10 kWp, no battery, standard household.
  const pvKwp = 10;
  const ev = calcEigenverbrauch({
    personenIdx: 2, nutzungIdx: 1, speicherKwh: 0,
    wp: "nein", ea: "nein", eaKm: 15000, kwp: pvKwp, ertragKwp: yieldKwhKwp,
  });
  const kosten = estimateCost(pvKwp, 0);
  const einspeisung = calcWeightedFeedIn(pvKwp, DEFAULT_FEED_IN.teilUnder10, DEFAULT_FEED_IN.teilOver10);
  const pv = calc({
    kwp: pvKwp, kosten, strompreis: DEFAULT_PRICES.electricityPrice, eigenverbrauch: ev,
    einspeisung, stromSteigerung: DEFAULT_PRICES.electricityIncrease, ertragKwp: yieldKwhKwp, monthly,
  });
  // "Forgone income over 5 years" = 5-year gross benefit (savings + feed-in):
  // the cumulative cashflow starts at −kosten, so the pure benefit is kum[5] + kosten.
  const pvFiveYearBenefit = Math.max(0, (pv.years[5]?.kum ?? -kosten) + kosten);

  // Heat pump: location-independent (the WP-Rechner deliberately ignores location).
  const wp = calcHeatPump({
    situation: "bestand", wohnflaeche: 140, insulationIdx: 1, personen: 2,
    heizsystem: "hk_neu", wpType: "lwwp",
  });

  // Balcony system: the recommended set for a typical tenant household.
  const balkon = recommendBalkon({
    orientationId: "sued_gelaender", presenceId: "teils",
    haushaltKwh: PERSONEN[1].verbrauch, // 2-Personen-Haushalt ≈ mittlere Größe, gleiche Tabelle wie der Rechner
    specificYield: yieldKwhKwp, monthlyYield: monthly, stromPrice: DEFAULT_PRICES.electricityPrice,
  }).best.result;

  return {
    yieldKwhKwp,
    pvKwp,
    pvFiveYearBenefit,
    wpTco20: wp.tcoEinsparung,
    balkonSavingPerYear: balkon.savingPerYear,
    balkonAmortYears: balkon.amortYears,
  };
}
