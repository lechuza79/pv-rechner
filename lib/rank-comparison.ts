/**
 * Compare retained ranking editions only; never infer a historical rank from
 * today's stock. Ported unchanged from the reviewed municipality prototype
 * (scripts/municipality-preview/rank-comparison.mjs), which stays a reference.
 */
import type { MonthlyRank, RankMonthSnapshot } from "./story-ranking-month";

export type RankComparison =
  | { status: "missing"; month: string }
  | { status: "changed-basis"; month: string }
  | { status: "comparable"; month: string; previousRank: number; delta: number };

export type ComparedRank = MonthlyRank & { comparisons: { month: RankComparison; year: RankComparison } };

export function comparisonMonth(month: string, years = 0, months = 0): string {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() - years);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString().slice(0, 7);
}

const valid = (r: MonthlyRank) =>
  Number.isInteger(r.rank) && r.rank > 0 && Number.isInteger(r.size) && r.rank <= r.size && Number.isFinite(r.value);

export function compareRanks(current: RankMonthSnapshot, history: RankMonthSnapshot[] = []): ComparedRank[] {
  const compare = (row: MonthlyRank, month: string): RankComparison => {
    const edition = history.find((s) => s.month === month);
    const previous = edition?.ranks.find((r) => r.key === row.key && valid(r));
    if (!previous) return { status: "missing", month };
    if (!row.cohort || !row.rules || previous.cohort !== row.cohort || previous.rules !== row.rules || previous.size !== row.size)
      return { status: "changed-basis", month };
    return { status: "comparable", month, previousRank: previous.rank, delta: previous.rank - row.rank };
  };
  return current.ranks.filter(valid).map((row) => ({
    ...row,
    comparisons: {
      month: compare(row, comparisonMonth(current.month, 0, 1)),
      year: compare(row, comparisonMonth(current.month, 1)),
    },
  }));
}

export function comparisonText(row: ComparedRank, kind: "month" | "year"): string | null {
  const comparison = row.comparisons[kind];
  if (comparison.status !== "comparable") return null;
  const period = kind === "month" ? "gegenüber dem Vormonat" : "gegenüber demselben Monat des Vorjahres";
  if (!comparison.delta) return `Platz ${row.rank} ${period} gehalten.`;
  const amount = Math.abs(comparison.delta);
  return `Von Platz ${comparison.previousRank} auf Platz ${row.rank}: ${amount} ${amount === 1 ? "Platz" : "Plätze"} ${period} ${comparison.delta > 0 ? "aufgestiegen" : "zurückgefallen"}.`;
}
