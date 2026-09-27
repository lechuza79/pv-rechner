import type { BalkonResult } from './balkon';

/** Interpolate the simulator's monthly ledger; no invented daily weather. */
export function balkonRace(result: BalkonResult, startYear: number) {
  const years = result.annualCosts.grid.length;
  const start = Date.UTC(startYear, 0, 1);
  const dayMs = 86_400_000;
  const days = Math.round((Date.UTC(startYear + years, 0, 1) - start) / dayMs);
  const balcony = new Float64Array(days + 1);
  const grid = new Float64Array(days + 1);
  const firstDay = [0];
  balcony[0] = result.invest;
  for (let year = 0; year < years; year++) {
    for (let month = 0; month < 12; month++) {
      const begin = (Date.UTC(startYear + year, month, 1) - start) / dayMs;
      const end = (Date.UTC(startYear + year, month + 1, 1) - start) / dayMs;
      firstDay.push(begin + 1);
      for (let day = begin + 1; day <= end; day++) {
        const fraction = (day - begin) / (end - begin);
        balcony[day] = balcony[begin] + result.monthlyCosts.balcony[year][month] * fraction;
        grid[day] = grid[begin] + result.monthlyCosts.grid[year][month] * fraction;
      }
    }
  }
  grid[days] = Math.round(grid[days]);
  balcony[days] = grid[days] - result.lifetimeSaving;
  const dateAt = (day: number) => {
    const date = new Date(start + Math.max(0, Math.round(day) - 1) * dayMs);
    return { jahr: date.getUTCFullYear(), monat: date.getUTCMonth(), tag: date.getUTCDate() };
  };
  return { balcony, grid, firstDay, dateAt, days, years };
}
