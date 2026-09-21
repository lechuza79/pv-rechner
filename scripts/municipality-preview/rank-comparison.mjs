/** Compare retained editions only; never infer a historical rank from today's stock. */
export function comparisonMonth(month, years = 0, months = 0) {
 const date = new Date(`${month}-01T12:00:00Z`);
 date.setUTCFullYear(date.getUTCFullYear() - years);
 date.setUTCMonth(date.getUTCMonth() - months);
 return date.toISOString().slice(0, 7);
}
export function compareRanks(current, history = []) {
 const valid = r => Number.isInteger(r.rank) && r.rank > 0 && Number.isInteger(r.size) && r.rank <= r.size && Number.isFinite(r.value);
 const compare = (row, month) => {
  const edition = history.find(s => s.month === month);
  const previous = edition?.ranks.find(r => r.key === row.key && valid(r));
  if (!previous) return {status: 'missing', month};
  if (!row.cohort || !row.rules || previous.cohort !== row.cohort || previous.rules !== row.rules || previous.size !== row.size) return {status: 'changed-basis', month};
  return {status: 'comparable', month, previousRank: previous.rank, delta: previous.rank - row.rank};
 };
 return current.ranks.filter(valid).map(row => ({...row,
  comparisons: {month: compare(row, comparisonMonth(current.month, 0, 1)), year: compare(row, comparisonMonth(current.month, 1))}
 }));
}
export function comparisonText(row, kind) {
 const comparison = row.comparisons[kind];
 if (comparison.status !== 'comparable') return null;
 const period = kind === 'month' ? 'gegenüber dem Vormonat' : 'gegenüber demselben Monat des Vorjahres';
 if (!comparison.delta) return `Platz ${row.rank} ${period} gehalten.`;
 const amount = Math.abs(comparison.delta);
 return `Von Platz ${comparison.previousRank} auf Platz ${row.rank}: ${amount} ${amount === 1 ? 'Platz' : 'Plätze'} ${period} ${comparison.delta > 0 ? 'aufgestiegen' : 'zurückgefallen'}.`;
}
