import { calc, calcEigenverbrauch, estimateCost, calcWeightedFeedIn } from "./calc";
import { DEFAULT_PRICES } from "./prices-config";
import { DEFAULT_FEED_IN } from "./feedin-config";
import { calcHeatPump } from "./heatpump";
import { recommendBalkon } from "./balkon";
import { PERSONEN } from "./constants";

// Drei greifbare Beispiele (PV / Wärmepumpe / Balkon) für eine Gemeinde, alle auf
// der GETEILTEN Rechen-Basis: Standort-Ertrag (PVGIS) fließt in die PV-/Balkon-
// Beispiele, die drei Rechner selbst kommen aus ihren kanonischen Quellen —
// nichts wird hier nachgebaut. Standortspezifisch ist nur der Ertrag (annual).

export type GemeindePotential = {
  yieldKwhKwp: number;
  pvKwp: number;
  pvFiveYearBenefit: number;
  wpTco20: number;
  balkonSavingPerYear: number;
  balkonAmortYears: number;
};

export function computeGemeindePotential({
  annual,
  monthly,
}: {
  annual: number;
  monthly: number[] | null;
}): GemeindePotential {
  // Haushaltsstrom aus dem 2-Personen-Wert (≈ mittlere Haushaltsgröße) — dieselbe
  // Tabelle wie im Rechner. Speist das Balkon-Beispiel.
  const perHouseholdElec = PERSONEN[1].verbrauch;

  // PV-Beispiel: typisches EFH, 10 kWp, ohne Speicher, Standard-Haushalt.
  const pvKwp = 10;
  const ev = calcEigenverbrauch({
    personenIdx: 2,
    nutzungIdx: 1,
    speicherKwh: 0,
    wp: "nein",
    ea: "nein",
    eaKm: 15000,
    kwp: pvKwp,
    ertragKwp: annual,
  });
  const kosten = estimateCost(pvKwp, 0);
  const einspeisung = calcWeightedFeedIn(pvKwp, DEFAULT_FEED_IN.teilUnder10, DEFAULT_FEED_IN.teilOver10);
  const pv = calc({
    kwp: pvKwp,
    kosten,
    strompreis: DEFAULT_PRICES.electricityPrice,
    eigenverbrauch: ev,
    einspeisung,
    stromSteigerung: DEFAULT_PRICES.electricityIncrease,
    ertragKwp: annual,
    monthly,
  });
  // „Entgangene Einnahmen in 5 Jahren" = 5-Jahres-Bruttonutzen (Ersparnis +
  // Einspeisung), nicht der Netto-Stand: der kumulierte Cashflow startet bei
  // −kosten, der reine Nutzen ist also kum[5] + kosten.
  const pvFiveYearBenefit = Math.max(0, (pv.years[5]?.kum ?? -kosten) + kosten);

  // WP-Beispiel: standortunabhängig (der WP-Rechner rechnet bewusst ohne Standort).
  const wp = calcHeatPump({
    situation: "bestand",
    wohnflaeche: 140,
    insulationIdx: 1,
    personen: 2,
    heizsystem: "hk_neu",
    wpType: "lwwp",
  });

  // Balkon-Beispiel: das empfohlene Set für einen typischen Mieterhaushalt.
  const balkon = recommendBalkon({
    orientationId: "sued_gelaender",
    presenceId: "teils",
    haushaltKwh: perHouseholdElec,
    specificYield: annual,
    monthlyYield: monthly,
    stromPrice: DEFAULT_PRICES.electricityPrice,
  }).best.result;

  return {
    yieldKwhKwp: annual,
    pvKwp,
    pvFiveYearBenefit,
    wpTco20: wp.tcoEinsparung,
    balkonSavingPerYear: balkon.savingPerYear,
    balkonAmortYears: balkon.amortYears,
  };
}
