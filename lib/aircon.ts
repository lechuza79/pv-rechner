// ─── Klimaanlagen-Rechner — Pure Functions ──────────────────────────────────
// Betriebskosten + Anschaffung + PV-Deckung einer Klimaanlage (nur Kühlung).
// Modell weather-driven: Kühlbedarf aus Fläche × Kühlgradstunden(Standort,
// Wunschtemperatur, Zeitfenster). Strom = Kühlenergie / SEER(Gerätetyp).
// Alle Konstanten in lib/aircon-config.ts (zentral, auf /datenstand gepflegt).

import { DEFAULT_AIRCON_CONFIG, type AcConfig, type AcDevice, type AcDeviceId } from "./aircon-config";

export type CoolingWindow = "allday" | "day" | "night";

export interface AcInputs {
  deviceId: AcDeviceId;
  rooms: number;
  roomM2: number;            // gekühlte Fläche je Raum
  targetTemp: number;        // Wunsch-Innentemperatur °C
  window: CoolingWindow;
  cdh: number;               // Kühlgradstunden/Jahr am Standort (aus API/Config)
  stromPrice: number;        // €/kWh
  pvActive: boolean;         // eigene PV-Anlage vorhanden/geplant?
  battery?: boolean;         // Batteriespeicher vorhanden? (Default true)
}

export interface AcResult {
  device: AcDevice;
  cooledArea: number;        // m² gesamt (rooms × roomM2)
  coolingDemandKwh: number;  // thermische Kühlenergie/Jahr
  electricityKwh: number;    // Stromverbrauch/Jahr
  runningCost: number;       // €/Jahr
  co2Kg: number;             // kg CO₂/Jahr
  capacityKw: number;        // benötigte Kühlleistung (Dimensionierung)
  acquisition: number;       // Anschaffung €
  pvCoverage: number;        // 0–1 Anteil Kühlstrom durch eigene PV
  pvSavings: number;         // €/Jahr Ersparnis durch PV-Deckung
  netRunningCost: number;    // €/Jahr Reststromkosten nach PV
}

/** Effektive Kühlgradstunden für Wunschtemperatur + Zeitfenster. */
export function effectiveCdh(cdh: number, targetTemp: number, window: CoolingWindow, cfg: AcConfig = DEFAULT_AIRCON_CONFIG): number {
  // Wunschtemperatur: exakter Tabellenwert oder linear interpoliert/extrapoliert
  // um 24 °C (≈ −0,2 je °C kälter), damit auch frei editierte Werte tragen.
  const tf = cfg.targetFactor[targetTemp] ?? Math.max(0.2, 1 + (24 - targetTemp) * 0.2);
  const wf = cfg.windowFactor[window];
  return cdh * tf * wf;
}

/** Kühlleistung (kW) für die Dimensionierung — Spitzenlast aus Fläche. */
export function sizingKw(cooledArea: number, cfg: AcConfig = DEFAULT_AIRCON_CONFIG): number {
  return Math.round((cooledArea * cfg.sizingWPerM2) / 100) / 10; // 1 Nachkommastelle
}

/** Anschaffungskosten je Gerätetyp. */
export function acquisitionCost(device: AcDevice, rooms: number, cooledArea: number, cfg: AcConfig = DEFAULT_AIRCON_CONFIG): number {
  if (device.perRoom) {
    return (device.pricePerUnit ?? 0) * Math.max(1, rooms);
  }
  // Fest installierte Split: Sockel + €/kW über die dimensionierte Leistung
  const kw = sizingKw(cooledArea, cfg);
  return Math.round(((device.priceBase ?? 0) + (device.pricePerKw ?? 0) * kw) / 50) * 50;
}

export function calcAircon(inputs: AcInputs, cfg: AcConfig = DEFAULT_AIRCON_CONFIG): AcResult {
  const device = cfg.devices.find(d => d.id === inputs.deviceId) ?? cfg.devices[0];
  const rooms = Math.max(1, Math.round(inputs.rooms));
  const cooledArea = rooms * inputs.roomM2;

  const cdhEff = effectiveCdh(inputs.cdh, inputs.targetTemp, inputs.window, cfg);
  // Kühlenergie [kWh] = gain[Wh/(m²·K·h)] × Fläche[m²] × Kühlgradstunden[K·h] / 1000
  const coolingDemandKwh = Math.round((cfg.buildingGain * cooledArea * cdhEff) / 1000);
  const electricityKwh = Math.round(coolingDemandKwh / device.seer);
  const runningCost = Math.round(electricityKwh * inputs.stromPrice);
  const co2Kg = Math.round(electricityKwh * cfg.gridCo2PerKwh);
  const capacityKw = sizingKw(cooledArea, cfg);
  const acquisition = acquisitionCost(device, rooms, cooledArea, cfg);

  // Mit Speicher ist Default (battery !== false). Akku hebt vor allem die Nacht.
  const coverageSet = (inputs.battery ?? true) ? cfg.pvCoverage.battery : cfg.pvCoverage.noBattery;
  const pvCoverage = inputs.pvActive ? coverageSet[inputs.window] : 0;
  const pvSavings = Math.round(electricityKwh * pvCoverage * inputs.stromPrice);
  const netRunningCost = runningCost - pvSavings;

  return {
    device, cooledArea, coolingDemandKwh, electricityKwh, runningCost, co2Kg,
    capacityKw, acquisition, pvCoverage, pvSavings, netRunningCost,
  };
}

/** Vergleich aller Gerätetypen bei gleichem Bedarf (für die Vergleichstabelle). */
export function compareDevices(inputs: Omit<AcInputs, "deviceId">, cfg: AcConfig = DEFAULT_AIRCON_CONFIG): AcResult[] {
  return cfg.devices.map(d => calcAircon({ ...inputs, deviceId: d.id }, cfg));
}

/** Kühlgradstunden für eine PLZ-Region (Bundesland-Fallback aus Config). */
export function fallbackCdh(bundesland: string | null, cfg: AcConfig = DEFAULT_AIRCON_CONFIG): number {
  if (bundesland && cfg.cdhByBundesland[bundesland]) return cfg.cdhByBundesland[bundesland];
  return cfg.cdhNational;
}

// ─── Kühlgradstunden-Berechnung ─────────────────────────────────────────────
// Σ max(0, T_außen − Schwelle) über alle Stunden. Maß dafür, wie oft und wie
// weit es über der „ab hier wird gekühlt"-Temperatur lag.

/** Kühlgradstunden aus einer echten Stundenreihe (Wetterarchiv). Roh (ungerundet);
 *  der Aufrufer rundet, damit Mittelwerte über mehrere Jahre nicht durch
 *  Zwischenrundung driften. */
export function cdhFromHourly(temps: number[], base: number): number {
  let sum = 0;
  for (const t of temps) if (typeof t === "number" && t > base) sum += t - base;
  return sum;
}

/** Kühlgradstunden aus Tages-Min/Max via synthetischem Tagesgang (Sinus, Maximum
 *  ~15 Uhr, Minimum ~3 Uhr). Für Klimamodell-Daten, die nur Tageswerte liefern —
 *  derselbe Stunden-Maßstab wie cdhFromHourly, damit die Modi vergleichbar bleiben. */
export function cdhFromDailyMinMax(tmax: number[], tmin: number[], base: number): number {
  let sum = 0;
  const n = Math.min(tmax.length, tmin.length);
  for (let d = 0; d < n; d++) {
    const hi = tmax[d], lo = tmin[d];
    if (typeof hi !== "number" || typeof lo !== "number") continue;
    const mean = (hi + lo) / 2;
    const amp = (hi - lo) / 2;
    for (let h = 0; h < 24; h++) {
      const t = mean + amp * Math.cos((2 * Math.PI * (h - 15)) / 24);
      if (t > base) sum += t - base;
    }
  }
  return sum;
}
