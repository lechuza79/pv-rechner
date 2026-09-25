import type {GemeindePaket, MonitorObservation} from "../gemeinde-paket";
import type {KpiDefinition} from "./model";
import {reihenMassstab} from "../gemeinde-einheiten";

export function monitorKpiGroups({history,population,registerStand,populationStand}: {history: NonNullable<GemeindePaket["monitorHistory"]>;population:number;registerStand:string;populationStand:string|null}) {
  const observations: MonitorObservation[] = history.observations;
  const current = observations[0];
  const metric = (
    id: string,
    label: string,
    value: (row: MonitorObservation) => number,
    unit?: string,
    digits = 0,
    kind: KpiDefinition["kind"] = "stock",
  ): KpiDefinition => {
    const basis = `${history.method}:${registerStand}:${id}:population-${populationStand ?? ""}`;
    const observation = (row: MonitorObservation) => ({
      end: row.end,
      value: value(row),
      basis,
      ...(kind === "period-total" ? { start: row.end.slice(0, 4) + "-01-01" } : {}),
    });
    return { id, label, unit, digits, kind, cadence: "month-end", current: observation(current), history: observations.slice(1).map(observation) };
  };
  return [
    {
      title: "Solaranlagen",
      items: [
        metric("solar-count", "Anlagen", (r) => r.solarCount, "Stk.", 0),
        // Einheit nach der Größe des Orts: ein Dorf mit einem Balkonkraftwerk
        // zeigte sonst „0,0 MWp" — eine Null, wo eine Anlage steht.
        (() => {
          const m = reihenMassstab(current.solarKwp, "kWp", "MWp");
          return metric("solar-power", "Installierte Leistung", (r) => r.solarKwp / m.teiler, m.unit, m.digits);
        })(),
        // Without a population figure a per-resident value would be invented.
        ...(population > 0 ? [metric("solar-per-resident", "Leistung je Einwohner", (r) => (r.solarKwp * 1000) / population, "Wp")] : []),
        metric("solar-additions", "Neue Anlagen dieses Jahr", (r) => r.solarAdditions, "Stk.", 0, "period-total"),
      ],
    },
    {
      title: "Batteriespeicher",
      items: [
        metric("battery-count", "Speicher", (r) => r.batteryCount, "Stk.", 0),
        (() => {
          const m = reihenMassstab(current.batteryKwh, "kWh", "MWh");
          return metric("battery-capacity", "Kapazität", (r) => r.batteryKwh / m.teiler, m.unit, m.digits);
        })(),
      ],
    },
  ];
}
