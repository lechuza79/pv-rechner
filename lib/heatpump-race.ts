import type { HeatPumpResult } from './heatpump';
import { gradtageJeTag, heizWetterFenster } from './heizkostenrennen';

/** Distribute heating costs using historical weather, preserving each annual balance. */
export function heatPumpRace(result: HeatPumpResult, startYear: number) {
  const costs = result.kostenJeJahr;
  const years = costs.wp.strom.length;
  const weather = heizWetterFenster(years);
  const heatingShare = result.qGes > 0 ? result.qHeiz / result.qGes : 0;
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
    const degreeDays = gradtageJeTag(weather.von + year);
    const cumulative = [0];
    for (const value of degreeDays ?? []) cumulative.push(cumulative[cumulative.length - 1] + value);
    const total = cumulative[cumulative.length - 1];
    // Resample cumulative weights to handle differing leap years without losing energy.
    const heatingFraction = (fraction: number) => {
      if (!degreeDays || total <= 0) return fraction;
      const position = fraction * degreeDays.length;
      const index = Math.min(Math.floor(position), degreeDays.length - 1);
      return (cumulative[index] + degreeDays[index] * (position - index)) / total;
    };
    for (let d = begin + 1; d <= end; d++) {
      const fraction = (d - begin) / (end - begin);
      const seasonal = (heatingFraction(fraction) - fraction) * heatingShare;
      wp[d] = wp[begin] + wpAnnual * fraction + costs.wp.strom[year] * seasonal;
      fossil[d] = fossil[begin] + fossilAnnual * fraction + costs.fossil.brennstoff[year] * seasonal;
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
