import { calc, calcEigenverbrauch, estimateCost, calcWeightedFeedIn } from "./calc";
import { DEFAULT_PRICES } from "./prices-config";
import { DEFAULT_FEED_IN } from "./feedin-config";
import { calcHeatPump } from "./heatpump";
import { calcWpAnnualElectricity } from "./heatpump-core";
import { recommendBalkon } from "./balkon";
import { PERSONEN } from "./constants";
import { NATIONAL_AVG_YIELD } from "./pvgis";

// „Angebot trifft Nachfrage" für eine Gemeinde plus drei greifbare Beispiele.
//
// Bewusst reine Funktion auf der GETEILTEN Rechen-Basis: Standort-Ertrag (PVGIS),
// Haushaltsverbrauch (PERSONEN), WP-Strom (heatpump-core) und die drei Rechner
// selbst kommen alle aus ihren kanonischen Quellen — nichts wird hier nachgebaut.
// Der Bedarf auf Gemeindeebene ist eine Modellrechnung (Einwohner × Standardwerte)
// und in der UI als solche gekennzeichnet.

// Destatis: im Schnitt ~1,99 Personen je Haushalt. Der einzige demografische
// Näherungswert hier — alles andere ist geteilte Rechen-Basis.
const AVG_HOUSEHOLD_SIZE = 2.0;

// Destatis: ~92 m² durchschnittliche Wohnfläche je Wohnung (Wohnungen UND Häuser
// gemischt). Bewusst nicht das 140-m²-Einfamilienhaus des WP-Rechners — sonst
// würde der Heizstrom für Gemeinden mit vielen Wohnungen deutlich überschätzt.
const AVG_DWELLING_M2 = 92;

export type GemeindePotential = {
  yieldKwhKwp: number;
  /** Abweichung vom groben Bundesschnitt, als Anteil (+0,07 = 7 % über Schnitt). */
  yieldVsAvg: number;
  generationKwh: number;
  /** Erzeugung ausgedrückt in „so viele Haushalte" (rechnerische Äquivalenz). */
  householdEquiv: number;
  households: number;
  householdElecKwh: number;
  heatElecKwh: number;
  /** Deckung als Anteil — kann > 1 sein (Netto-Exporteur). */
  coverageToday: number;
  coverageAfterHeat: number;
  pvKwp: number;
  pvFiveYearBenefit: number;
  wpTco20: number;
  balkonSavingPerYear: number;
  balkonAmortYears: number;
  balkonLifetimeSaving: number;
};

export function computeGemeindePotential({
  totalKwp,
  population,
  annual,
  monthly,
}: {
  totalKwp: number;
  population: number;
  annual: number;
  monthly: number[] | null;
}): GemeindePotential {
  const generationKwh = totalKwp * annual;
  const households = Math.max(1, Math.round(population / AVG_HOUSEHOLD_SIZE));
  // Haushaltsstrom aus dem 2-Personen-Wert (≈ mittlere Haushaltsgröße) — dieselbe
  // Tabelle wie im Rechner, nicht eine eigene Pro-Kopf-Zahl.
  const perHouseholdElec = PERSONEN[1].verbrauch;
  const householdElecKwh = households * perHouseholdElec;
  // Elektrifiziertes Heizen: WP-Jahresstrom je Haushalt bei DURCHSCHNITTLICHER
  // Wohnfläche (nicht dem 140-m²-EFH) — gleiche WP-Rechnung wie der Rechner,
  // nur die Fläche ist der Gemeindeschnitt.
  const heatElecPerHousehold = calcWpAnnualElectricity({
    situation: "bestand",
    wohnflaeche: AVG_DWELLING_M2,
    insulationIdx: 1,
    heizsystem: "hk_neu",
    wpType: "lwwp",
    personen: 2,
  });
  const heatElecKwh = households * heatElecPerHousehold;
  const coverageToday = householdElecKwh > 0 ? generationKwh / householdElecKwh : 0;
  const coverageAfterHeat =
    householdElecKwh + heatElecKwh > 0 ? generationKwh / (householdElecKwh + heatElecKwh) : 0;
  const householdEquiv = Math.round(generationKwh / perHouseholdElec);
  const yieldVsAvg = annual / NATIONAL_AVG_YIELD - 1;

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
    yieldVsAvg,
    generationKwh,
    householdEquiv,
    households,
    householdElecKwh,
    heatElecKwh,
    coverageToday,
    coverageAfterHeat,
    pvKwp,
    pvFiveYearBenefit,
    wpTco20: wp.tcoEinsparung,
    balkonSavingPerYear: balkon.savingPerYear,
    balkonAmortYears: balkon.amortYears,
    balkonLifetimeSaving: balkon.lifetimeSaving,
  };
}
