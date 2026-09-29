import type { calc } from './calc';
import { electricityPriceAtYear } from './electricity-projection';

/** Display adapter only: the solar line subtracts the existing benefit ledger. */
export function pvResultRace(result: ReturnType<typeof calc>, consumption: number, price: number, rate: number, startYear: number, monthlyConsumption: number[]) {
  const years = result.years.length - 1;
  const start = Date.UTC(startYear, 0, 1);
  const dayMs = 86_400_000;
  const days = (Date.UTC(startYear + years, 0, 1) - start) / dayMs;
  const grid = new Float64Array(days + 1);
  const solar = new Float64Array(days + 1);
  solar[0] = -result.years[0].kum;
  const firstDay = [0];
  const weightSum = monthlyConsumption.reduce((a, b) => a + b, 0);
  for (let year = 0; year < years; year++) {
    const annualGrid = consumption * electricityPriceAtYear(price, year, rate);
    const annualBenefit = result.years[year + 1].kum - result.years[year].kum;
    const monthly = result.monate?.slice(year * 12, year * 12 + 12);
    const modelBenefit = monthly?.reduce((sum, value) => sum + value, 0) ?? annualBenefit;
    for (let month = 0; month < 12; month++) {
      const begin = (Date.UTC(startYear + year, month, 1) - start) / dayMs;
      const end = (Date.UTC(startYear + year, month + 1, 1) - start) / dayMs;
      firstDay.push(begin + 1);
      const gridCost = annualGrid * (weightSum > 0 ? monthlyConsumption[month] / weightSum : 1 / 12);
      const benefit = (monthly?.[month] ?? annualBenefit / 12) + (month === 11 ? annualBenefit - modelBenefit : 0);
      for (let day = begin + 1; day <= end; day++) {
        const fraction = (day - begin) / (end - begin);
        grid[day] = grid[begin] + gridCost * fraction;
        solar[day] = solar[begin] + (gridCost - benefit) * fraction;
      }
    }
  }
  solar[days] = grid[days] - result.total;
  const dateAt = (day: number) => {
    const date = new Date(start + Math.max(0, Math.round(day) - 1) * dayMs);
    return { jahr: date.getUTCFullYear(), monat: date.getUTCMonth(), tag: date.getUTCDate() };
  };
  return { grid, solar, days, years, firstDay, dateAt };
}
