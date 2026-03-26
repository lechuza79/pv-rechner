import { YEAR, YEARS, DEGRAD, CONSUMPTION_MONTHLY, FUEL, PERSONEN, NUTZUNG } from "./constants";
import { calcExtraConsumption } from "./consumption";
import { DEFAULT_PRICES, type PriceConfig } from "./prices-config";

// ─── Fuel comparison (WP vs. Gas/Öl) ────────────────────────────────────────
// CO2-Preis: 55€/t 2025, 65€/t 2026, ab 2027 EU ETS2 marktbasiert (konservativ +8€/Jahr)
export function calcFuelCost25(wpKwhElectric: number, fuel: "gas" | "oil"): number {
  const f = FUEL[fuel];
  const thermalKwh = wpKwhElectric * 3.5; // COP 3.5
  const fuelKwh = thermalKwh / f.efficiency;
  let total = 0;
  for (let i = 0; i < YEARS; i++) {
    const co2Price = i === 0 ? 55 : i === 1 ? 65 : 65 + (i - 1) * 8; // €/t, konservativ steigend
    const co2Surcharge = f.co2PerKwh * co2Price / 1000; // €/kWh
    const basePrice = f.price * Math.pow(1.02, i); // 2% Grundpreissteigerung
    total += fuelKwh * (basePrice + co2Surcharge);
  }
  return Math.round(total);
}

export function calcWpGridCost25(wpKwh: number, autarky: number, strompreis: number, stromSteigerung: number): number {
  let total = 0;
  const gridFraction = 1 - autarky;
  for (let i = 0; i < YEARS; i++) {
    const sp = strompreis * Math.pow(1 + stromSteigerung, i);
    total += wpKwh * gridFraction * sp;
  }
  return Math.round(total);
}

// ─── Kostenschätzung ─────────────────────────────────────────────────────────
export function estimateCost(kwp: number, spKwh: number, prices?: PriceConfig): number {
  const p = prices ?? DEFAULT_PRICES;
  const pv = kwp <= p.pvThresholdKwp
    ? kwp * p.pvPriceSmall
    : p.pvThresholdKwp * p.pvPriceSmall + (kwp - p.pvThresholdKwp) * p.pvPriceLarge;
  const sp = spKwh > 0 ? p.batteryBase + spKwh * p.batteryPerKwh : 0;
  return Math.round((pv + sp) / 500) * 500;
}

// ─── Eigenverbrauch (HTW Berlin Modell) ──────────────────────────────────────
export function calcEigenverbrauch({ personenIdx, nutzungIdx, speicherKwh, wp, ea, eaKm, kwp, ertragKwp }: { personenIdx: number; nutzungIdx: number; speicherKwh: number; wp: string; ea: string; eaKm: number; kwp: number; ertragKwp: number }): number {
  const jahresertrag = kwp * ertragKwp;
  const grundverbrauch = PERSONEN[personenIdx].verbrauch;
  const tagQuote = NUTZUNG[nutzungIdx].tagQuote;
  const extra = calcExtraConsumption(wp, ea, eaKm);
  const gesamt = grundverbrauch + extra;
  // x = kWp pro MWh Verbrauch (Anlagengröße relativ zum Verbrauch)
  const x = kwp / (gesamt / 1000);
  // y = kWh Speicher pro MWh Verbrauch
  const y = speicherKwh / (gesamt / 1000);
  // Basis-Eigenverbrauch: kalibriert an HTW Berlin Simulationsdaten
  // (25.000 Konfigurationen, 1-Min-Auflösung, VDI 4655 Lastprofil)
  // Standard-Profil ≈ 0.30, tagQuote skaliert nach Nutzungsprofil
  const evBase = tagQuote * Math.pow(x, -0.69);
  // Speicher-Boost: kalibriert an HTW Berlin Lookup-Tabellen
  // Sättigungseffekt bei größerem Speicher
  const evBoost = speicherKwh > 0
    ? 0.61 * Math.pow(x, -0.72) * (1 - Math.exp(-0.6 * y))
    : 0;
  // Physikalische Grenze: max. Eigenverbrauch = Gesamtverbrauch / Jahresertrag
  const evMax = gesamt / jahresertrag;
  const ev = Math.round(Math.min(evBase + evBoost, evMax, 0.90) * 100);
  return Math.max(10, Math.min(ev, 90));
}

// ─── Amortisation (25 Jahre, monatlich wenn PVGIS-Profil vorhanden) ─────────
export function calc({ kwp, kosten, strompreis, eigenverbrauch, einspeisung, stromSteigerung, ertragKwp, monthly }: { kwp: number; kosten: number; strompreis: number; eigenverbrauch: number; einspeisung: number; stromSteigerung: number; ertragKwp: number; monthly: number[] | null }) {
  const years = [];
  let kum = -kosten;
  // Monatliche Berechnung wenn PVGIS-Profil vorhanden
  const fracs = monthly ? monthly.map(m => m / monthly.reduce((a, b) => a + b, 0)) : null;
  for (let i = 0; i <= YEARS; i++) {
    let j = 0;
    if (i > 0) {
      const deg = Math.pow(1 - DEGRAD, i);
      const sp = strompreis * Math.pow(1 + stromSteigerung, i);
      if (fracs) {
        // Monatlich: EV% variiert saisonal (Winter höher, Sommer niedriger)
        for (let m = 0; m < 12; m++) {
          const mProd = kwp * ertragKwp * fracs[m] * deg;
          // EV% pro Monat: skaliert mit Verbrauch (BDEW H0) und inversem Ertrag
          const mEv = Math.min(eigenverbrauch * CONSUMPTION_MONTHLY[m] / (fracs[m] * 12), 95) / 100;
          j += mProd * mEv * sp + mProd * (1 - mEv) * (einspeisung / 100);
        }
      } else {
        // Jährlich (Fallback ohne Monatsprofil)
        const ertrag = kwp * ertragKwp * deg;
        j = ertrag * (eigenverbrauch / 100) * sp + ertrag * (1 - eigenverbrauch / 100) * (einspeisung / 100);
      }
    }
    kum += j;
    years.push({ year: YEAR + i, i, kum: Math.round(kum), j: Math.round(j) });
  }
  const be = years.find((y, idx) => idx > 0 && y.kum >= 0);
  return { years, be, total: years[YEARS].kum };
}

// ─── URL-Parameter-Helpers ───────────────────────────────────────────────────
export function paramInt(params: Record<string, string | string[] | undefined> | undefined, key: string, fallback: number, min = 0, max = 99): number {
  const v = params?.[key];
  if (typeof v === "string") { const n = parseInt(v); if (!isNaN(n) && n >= min && n <= max) return n; }
  return fallback;
}

export function paramFloat(params: Record<string, string | string[] | undefined> | undefined, key: string, fallback: number, min = 0, max = 99999): number {
  const v = params?.[key];
  if (typeof v === "string") { const n = parseFloat(v); if (!isNaN(n) && isFinite(n) && n >= min && n <= max) return n; }
  return fallback;
}

export function paramStr(params: Record<string, string | string[] | undefined> | undefined, key: string, fallback: string, allowed: string[]): string {
  const v = params?.[key];
  if (typeof v === "string" && allowed.includes(v)) return v;
  return fallback;
}
