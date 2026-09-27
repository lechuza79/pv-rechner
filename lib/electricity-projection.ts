/** Shared nominal electricity assumptions. No market feed may redefine them.
 * Source: UBA/Prognos, Rahmendaten 2026, 3rd edition, May 2026,
 * tables 3 (GDP deflator, p. 21) and 13 (household prices, p. 59).
 * Archived original: docs/quellen/UBA-Rahmendaten-THG-Projektionen-2026.pdf.
 * The source includes allocated standing charges. We transfer its percentage
 * trend to the user's current marginal tariff; we never credit standing charges
 * as PV savings. This is a smoothed model approximation, not the annual table.
 */
export const ELECTRICITY_PROJECTION_SOURCE = {
  url: 'https://www.umweltbundesamt.de/publikationen/rahmendaten-endverbrauchspreise-fur-die-0',
  title: 'UBA/Prognos: Rahmendaten 2026, Tabellen 3 und 13',
  checkedAt: '2026-09-26',
  from: 2025,
  to: 2045,
  householdRealCt: { from: 38.3, to: 33.4 },
  deflator: { 2024: 100, 2030: 118.2, 2045: 156 },
} as const;

const source = ELECTRICITY_PROJECTION_SOURCE;
const startIndex = source.deflator[2024] * (source.deflator[2030] / source.deflator[2024]) ** (1 / 6);
export const HOUSEHOLD_ELECTRICITY_INCREASE =
  ((source.householdRealCt.to / source.householdRealCt.from) * (source.deflator[2045] / startIndex)) ** (1 / (source.to - source.from)) - 1;

// Deliberate sensitivity assumption, NOT a confidence interval or source bound.
export const HOUSEHOLD_SENSITIVITY_DELTA = 0.01;
export const HOUSEHOLD_ELECTRICITY_SCENARIOS = [
  { id: 'pessimistic', label: 'Vorsichtig', resultLabel: 'vorsichtiger Preisentwicklung', rate: HOUSEHOLD_ELECTRICITY_INCREASE - HOUSEHOLD_SENSITIVITY_DELTA,
    explain: 'Strom wird nur wenig teurer. Dadurch sparst du mit deiner Solaranlage weniger. Das ist eine vorsichtige Annahme, keine Vorhersage.' },
  { id: 'realistic', label: 'Realistisch', resultLabel: 'realistischer Preisentwicklung', rate: HOUSEHOLD_ELECTRICITY_INCREASE,
    explain: 'Wir gehen davon aus, dass Strom langfristig etwas teurer wird. Dafür nutzen wir eine Untersuchung des Umweltbundesamts. Dein tatsächlicher Tarif kann sich anders entwickeln.' },
  { id: 'optimistic', label: 'Optimistisch', resultLabel: 'optimistischer Preisentwicklung', rate: HOUSEHOLD_ELECTRICITY_INCREASE + HOUSEHOLD_SENSITIVITY_DELTA,
    explain: 'Strom wird stärker teurer. Jede selbst genutzte Kilowattstunde spart dir dann mehr Geld. Das ist eine günstige Annahme, keine Vorhersage.' },
] as const;

/** Existing heat-pump assumptions, unchanged; their derivation lives in heatpump.ts. */
export const HEATPUMP_ELECTRICITY_INCREASE = { low: 0.00636, central: 0.023, high: 0.04382 } as const;

/** Year zero is today's tariff in every calculator. */
export function electricityPriceAtYear(price: number, year: number, rate = HOUSEHOLD_ELECTRICITY_INCREASE): number {
  return price * (1 + rate) ** year;
}

export function electricityRateLabel(rate: number): string {
  return `${rate >= 0 ? '+' : ''}${(rate * 100).toLocaleString('de-DE', { maximumFractionDigits: 2 })} %/Jahr`;
}
