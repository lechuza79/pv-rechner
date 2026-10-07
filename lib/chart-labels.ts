/** Standalone chart headings, never suffixes attached to numeric values. */
export function chartQuantityLabel(unit: string): string {
  const value = unit.trim();
  const count = value.match(/^(?:(Tsd\.|Mio\.|Mrd\.)\s+)?(Anlagen?|Einwohner|Haushalte|Gebäude|Balkonkraftwerke|Speicher|Stück)((?:\s.*|\/.*)?)$/);
  if (count) {
    const noun = count[2] === 'Anlage' ? 'Anlagen' : count[2];
    const reference = count[3].replace(/\s*\/\s*/, ' je ');
    return `Anzahl ${noun}${reference}${count[1] ? ` (in ${count[1]})` : ''}`;
  }
  // Descriptive labels already carry their meaning; only actual units get “in”.
  if (/^(?:[kMGT]?W[p h]?|[kMGT]?Wh|%|€|ct|kg|t|m²|km²)(?:\s*(?:\/|je)\s*.+)?$/.test(value)) {
    return `in ${value.replace(/\s*\/\s*(Einwohner|Haushalt)/, ' je $1')}`;
  }
  return value;
}

/** Preserve the precision of the supplied date. Never invent a data vintage. */
export function chartDataDate(stand?: string): string {
  if (!stand) return 'nicht verfügbar';
  return /^\d{4}-\d{2}-\d{2}$/.test(stand) ? stand.split('-').reverse().join('.') : stand;
}
