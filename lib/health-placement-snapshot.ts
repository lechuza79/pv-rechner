export type PlacementSnapshot = { activeRuns: number; metadataRows: number; actual: number; expected: number; publishedCount: number; renewedAt: string | null; sourceAt: string | null };
export function placementSnapshotProblems(snapshot: PlacementSnapshot, now: Date): string[] {
  const problems: string[] = [];
  if (snapshot.activeRuns !== 1 || snapshot.metadataRows !== 1) problems.push('Keine eindeutige aktive Ranglisten-Generation.');
  if (![snapshot.actual, snapshot.expected, snapshot.publishedCount].every(n => Number.isInteger(n) && n > 0) || snapshot.actual !== snapshot.expected || snapshot.actual !== snapshot.publishedCount) problems.push(`Ranglisten unvollständig: ${snapshot.actual} veröffentlicht, ${snapshot.expected} Gemeinden erwartet, ${snapshot.publishedCount} im Freigabebeleg.`);
  const renewed = Date.parse(snapshot.renewedAt ?? '');
  if (!Number.isFinite(renewed) || renewed > now.getTime() || now.getTime() - renewed > 45 * 86400000) problems.push('Ranglisten-Zeitstempel fehlt oder ist veraltet.');
  if (snapshot.sourceAt && renewed < Date.parse(snapshot.sourceAt)) problems.push('Ranglisten sind älter als der aktuelle Anlagen-Datenstand.');
  return problems;
}

export async function readCoherentPlacementSnapshot(reader: {
  active(): Promise<{lauf_id:string}[]>;
  metadata(id: string): Promise<{orte:number; erneuert_am:string}[]>;
  actual(): Promise<number>;
  expected(): Promise<number>;
}, sourceAt: string | null): Promise<PlacementSnapshot> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const before = await reader.active();
    const metadata = before.length === 1 ? await reader.metadata(before[0].lauf_id) : [];
    const actual = await reader.actual();
    const expected = await reader.expected();
    const after = await reader.active();
    if (JSON.stringify(before) !== JSON.stringify(after)) continue;
    return {activeRuns:before.length, metadataRows:metadata.length, actual, expected, publishedCount:metadata[0]?.orte ?? 0, renewedAt:metadata[0]?.erneuert_am ?? null, sourceAt};
  }
  throw new Error('Active placement generation changed during both measurement attempts');
}
