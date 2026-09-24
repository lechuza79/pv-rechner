import type { HeatPumpResult } from './heatpump';

/** Interpolate the calculator's annual costs for animation, without adding a daily forecast. */
export function heatPumpRace(result: HeatPumpResult, startYear: number) {
  const costs = result.kostenJeJahr;
  const years = costs.wp.strom.length;
  const start = Date.UTC(startYear, 0, 1);
  const dayMs = 86_400_000;
  const days = Math.round((Date.UTC(startYear + years, 0, 1) - start) / dayMs);
  const wp = new Float64Array(days + 1);
  const fossil = new Float64Array(days + 1);
  const firstDay = [0];
  wp[0] = costs.wp.invest;
  fossil[0] = costs.fossil.invest;
  for (let year = 0; year < years; year++) {
    const begin = Math.round((Date.UTC(startYear + year, 0, 1) - start) / dayMs);
    const end = Math.round((Date.UTC(startYear + year + 1, 0, 1) - start) / dayMs);
    const wpAnnual = costs.wp.strom[year] + costs.wp.neben - costs.wp.pvNutzen[year];
    const fossilAnnual = costs.fossil.brennstoff[year] + costs.fossil.neben;
    for (let d = begin + 1; d <= end; d++) {
      const fraction = (d - begin) / (end - begin);
      wp[d] = wp[begin] + wpAnnual * fraction;
      fossil[d] = fossil[begin] + fossilAnnual * fraction;
    }
    for (let month = 0; month < 12; month++) {
      firstDay.push(Math.round((Date.UTC(startYear + year, month, 1) - start) / dayMs) + 1);
    }
  }
  // The calculator rounds cost totals separately; use its published endpoint.
  wp[days] = result.tcoWp;
  fossil[days] = result.tcoGas;
  const dateAt = (day: number) => {
    const date = new Date(start + Math.max(0, Math.round(day) - 1) * dayMs);
    return { jahr: date.getUTCFullYear(), monat: date.getUTCMonth(), tag: date.getUTCDate() };
  };
  return { wp, fossil, firstDay, dateAt, days, years };
}
