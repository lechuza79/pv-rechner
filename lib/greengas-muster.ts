// Geteilte Muster-Berechnung für das Grüngas-Widget: zwei Beispiel-EFH
// (unsaniert / teilsaniert), gerechnet mit denselben reinen Funktionen wie der
// Wärmepumpen-Rechner (calcHeatPump + Grüngas-Preispfad). Client-sicher — sowohl
// der Artikel (Server) als auch das Embed-Widget (Client) rechnen daraus, damit
// beide identisch bleiben und nie driften.
import { calcHeatPump, heatPumpScenarioAdj, type HeatPumpInputs } from "./heatpump";
import { DEFAULT_HEATPUMP_CONFIG } from "./heatpump-config";
import { annualHeatingCostSeries, type HeatCostPoint } from "./greengas";
import { GREEN_GAS_CONFIG } from "./greengas-config";
import { CO2_PRICE } from "./co2-config";
import { PERSONEN, HAUSTYP_WP } from "./constants";

export interface MusterVariant {
  key: string;
  label: string;
  sub: string;
  explain: string;
  series: HeatCostPoint[];
  totals: { gas: number; wp: number; wpPv: number };
}

/** Anteil des WP-Stroms, den die PV in der WP+PV-Reihe deckt (konservativ). */
export const PV_COVERAGE = 0.3;

const cfg = DEFAULT_HEATPUMP_CONFIG;

function musterVariant(
  key: string,
  label: string,
  insulationIdx: number,
  heizsystem: HeatPumpInputs["heizsystem"],
  explain: string,
): MusterVariant {
  const inputs: HeatPumpInputs = {
    situation: "bestand", wohnflaeche: 140, insulationIdx,
    personen: PERSONEN[2].count, heizsystem, wpType: "lwwp",
    haustypFaktor: HAUSTYP_WP[0].faktor, override: { klimaBonus: true },
  };
  const r = calcHeatPump({ ...inputs, greenGas: true }, cfg, heatPumpScenarioAdj("realistic"));
  const fuelKwh = r.qGes / cfg.gasEfficiency;
  const { series, totals } = annualHeatingCostSeries({
    years: 20, fuelKwh, eWpKwh: r.eWp, wpTarifEurKwh: cfg.wpTarif, stromInflation: cfg.stromInflation, pvCoverage: PV_COVERAGE,
  });
  return {
    key, label,
    sub: `Freistehendes Einfamilienhaus, 140 m² · Arbeitszahl ${r.jaz.toLocaleString("de-DE")} · rund ${(Math.round(fuelKwh / 100) / 10).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MWh Gas im Jahr`,
    explain, series, totals,
  };
}

/** Die zwei Muster-Häuser — unsaniert zuerst (Default, der stärkere Fall). */
export function greengasMusterVariants(): MusterVariant[] {
  return [
    musterVariant("unsan", "Unsaniert", 0, "hk_alt",
      "Auch im unsanierten Altbau — wo viele die Wärmepumpe für unmöglich halten — bleibt sie über 20 Jahre klar günstiger, gerade weil die Gasheizung so teuer wird."),
    musterVariant("teil", "Teilsaniert", 1, "hk_neu",
      "Im teilsanierten Haus fällt die Ersparnis etwas kleiner aus — schlicht weil weniger (teures) Gas gebraucht wird. Günstiger als die Gasheizung bleibt die Wärmepumpe trotzdem klar."),
  ];
}

/**
 * Stand der Musterrechnung: der ÄLTESTE der beteiligten Werte-Stände.
 *
 * Die Rechnung mischt drei gepflegte Größen (Grüngas-Preispfad, Anschaffung und
 * Förderung der Wärmepumpe, CO₂-Preispfad). Den jüngsten davon anzuschreiben
 * hieße, für die anderen eine Aktualität zu behaupten, die sie nicht haben —
 * und ohne jede Angabe setzt der Quellenvermerk das Abrufdatum ein, also das
 * heutige. Beides ist eine Aussage über die Daten, die nicht stimmt.
 */
export const MUSTER_STAND_ISO = [
  GREEN_GAS_CONFIG.validFrom,
  DEFAULT_HEATPUMP_CONFIG.validFrom,
  CO2_PRICE.validFrom,
].sort()[0];
