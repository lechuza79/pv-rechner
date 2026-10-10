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
  if (/^(?:(?:Tsd\.|Mio\.|Mrd\.)\s+)?(?:[kMGT]?W[p h]?|[kMGT]?Wh|%|[kM]?€|ct|kg|t|m²|km²)(?:\s*(?:\/|je)\s*.+)?$/.test(value)) {
    return `in ${value.replace(/\s*\/\s*(Einwohner|Haushalt)/, ' je $1')}`;
  }
  return value;
}

/** Preserve the precision of the supplied date. Never invent a data vintage. */
export function chartDataDate(stand?: string): string {
  if (!stand) return 'nicht verfügbar';
  if (/^\d{4}-\d{2}-\d{2}$/.test(stand)) return stand.split('-').reverse().join('.');
  if (/^\d{4}-\d{2}-\d{2}T/.test(stand) && /(?:Z|[+-]\d{2}:\d{2})$/.test(stand) && Number.isFinite(Date.parse(stand))) {
    return new Intl.DateTimeFormat('de-DE', {timeZone:'Europe/Berlin', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}).format(new Date(stand)) + ' Uhr';
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(stand)) return `${stand.slice(0,10).split('-').reverse().join('.')}, ${stand.slice(11)} Uhr`;
  return stand;
}

export type ChartMetadata = {
  scope?: string;
  dataAsOf?: string;
  unit?: string;
  period?: string;
};

/** One export line, with data vintage distinct from the displayed period. */
export function chartMetadataLabel({scope, dataAsOf, unit, period}: ChartMetadata): string {
  return [...new Set([
    scope?.trim(),
    `Stand ${chartDataDate(dataAsOf?.trim())}`,
    unit ? chartQuantityLabel(unit) : undefined,
    period?.trim(),
  ].filter(Boolean))].join(' · ');
}
