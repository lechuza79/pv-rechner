/** Optional, device-backed storage parameters shared by all solar calculators. */
export interface SolarStorageOptions {
  /** Overrides the legacy capacity input. Do not infer this from nominal capacity. */
  usableBatteryKwh?: number;
  /** Default AC keeps the legacy dispatch. DC charges before the shared inverter. */
  batteryCoupling?: "ac" | "dc";
  /** Charge at storage input; discharge at AC output, in kW. Missing = unbounded. */
  batteryPowerLimits?: { chargeKw?: number; dischargeKw?: number };
}

export function storageCapacity(nominalOrLegacyKwh: number, options: SolarStorageOptions): number {
  for (const value of [options.usableBatteryKwh, options.batteryPowerLimits?.chargeKw, options.batteryPowerLimits?.dischargeKw]) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      throw new RangeError("Storage capacity and power limits must be finite and nonnegative");
    }
  }
  if (options.usableBatteryKwh !== undefined && options.usableBatteryKwh > nominalOrLegacyKwh) {
    throw new RangeError("Usable capacity cannot exceed nominal capacity");
  }
  return options.usableBatteryKwh ?? nominalOrLegacyKwh;
}

/** One hour, no grid charging. Round-trip losses remain assigned to discharge.
 * PVGIS generation already includes system losses; this is not a DC electronics
 * model. DC here only describes the storage position relative to the AC limit.
 */
export function dispatchSolarHour(
  generationKwh: number, loadKwh: number, socKwh: number,
  inverterKw: number, capacityKwh: number, roundtrip: number,
  options: SolarStorageOptions = {},
) {
  const ac = Math.min(generationKwh, inverterKw);
  const direct = Math.min(ac, loadKwh);
  const dcCoupled = options.batteryCoupling === "dc";
  let surplus = (dcCoupled ? generationKwh : ac) - direct;
  let soc = socKwh;
  let charge = 0;
  if (surplus > 0 && capacityKwh > 0) {
    charge = Math.min(surplus, capacityKwh - soc, options.batteryPowerLimits?.chargeKw ?? Infinity);
    soc += charge;
    surplus -= charge;
  }
  if (dcCoupled) surplus = Math.min(surplus, Math.max(0, inverterKw - direct));
  const deficit = loadKwh - direct;
  let discharge = 0;
  if (deficit > 0 && soc > 0) {
    const outputLimit = Math.min(
      options.batteryPowerLimits?.dischargeKw ?? Infinity,
      dcCoupled ? Math.max(0, inverterKw - direct) : Infinity,
    );
    const needed = Math.min(deficit, outputLimit) / roundtrip;
    const taken = Math.min(needed, soc);
    soc -= taken;
    discharge = taken * roundtrip;
  }
  // Preserve the original floating-point production total for legacy AC calls.
  const production = dcCoupled ? direct + charge + surplus : ac;
  return { direct, charge, discharge, feedIn: surplus, soc,
    production, clipped: generationKwh - production, grid: deficit - discharge };
}
