/** Shared freshness policy for importers, readers and independent monitoring. */
export const CATALOG_TABLE = "product_catalogs";
export const CATALOG_LIMITS = { wp: 36, bkw: 18 } as const; // hours, including scheduler delay
export type CatalogId = keyof typeof CATALOG_LIMITS;
export interface CatalogStatus { id: CatalogId; fetched_at: string; source_at: string | null; item_count: number }
export function catalogProblems(rows: CatalogStatus[], now = Date.now()): string[] {
  return (Object.keys(CATALOG_LIMITS) as CatalogId[]).flatMap(id => {
    const row = rows.find(r => r.id === id);
    if (!row) return [`${id}: Katalog oder erfolgreicher Import fehlt.`];
    const issues: string[] = [];
    const age = now - Date.parse(row.fetched_at);
    if (!Number.isFinite(age) || age < -300_000 || age > CATALOG_LIMITS[id] * 3_600_000)
      issues.push(`${id}: letzter erfolgreicher Import ${row.fetched_at}; Aktualisierung überfällig.`);
    if (!(row.item_count > 0)) issues.push(`${id}: Katalog ist leer.`);
    if (id === 'wp') {
      const sourceAge = now - Date.parse(row.source_at ?? '');
      if (!Number.isFinite(sourceAge) || sourceAge < -300_000 || sourceAge > 72 * 3_600_000)
        issues.push(`wp: Händlerdatenstand ${row.source_at ?? 'unbekannt'} ist ungültig oder älter als drei Tage.`);
    }
    return issues;
  });
}
/** Offsetless European feed dates use +02:00 conservatively: never credit uncertain extra freshness. */
export function merchantTimestamp(value: string, now = Date.now()): string {
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? value.replace(' ', 'T') + '+02:00' : value;
  const date = Date.parse(normalized), age = now - date;
  if (!Number.isFinite(date) || age < -300_000 || age > 72 * 3_600_000)
    throw new Error(`Händlerdatenstand ${value}: ungültig oder älter als drei Tage; bisheriger Katalog bleibt erhalten.`);
  return new Date(date).toISOString();
}
