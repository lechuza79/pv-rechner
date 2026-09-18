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

/**
 * Hat JEDE Ortsseite ihre Rangliste?
 *
 * Die Prüfung darüber vergleicht die veröffentlichten Ranglisten mit der
 * Award-Tabelle — also mit genau der Tabelle, aus der sie gebaut werden. Sie
 * kann deshalb nur beantworten, ob die Veröffentlichung durchgelaufen ist, nie,
 * ob sie alle Orte erreicht, für die es eine Seite gibt. Genau diese Lücke war
 * am 18.09.2026 offen: 10.749 Ortsseiten, 10.742 Ranglisten, und die Prüfung
 * meldete „vollständig". Die sieben fehlenden Orte warfen bei jedem Aufruf einen
 * Fehler ins Protokoll, darunter Hanau mit knapp 98.000 Einwohnern.
 *
 * Gemessen wird deshalb gegen die Zahl der SEITEN (Gemeinden mit Adress-Kürzel).
 * Beide Richtungen zählen: Fehlt eine Rangliste, zeigt die Seite keinen
 * Vergleich; ist eine zu viel da, steht ein Ort in fremden Ranglisten, den es
 * als Seite nicht mehr gibt.
 */
export function ortsseitenOhneRangliste(seiten: number, platzierungen: number): string[] {
  if (!Number.isInteger(seiten) || !Number.isInteger(platzierungen) || seiten <= 0 || platzierungen <= 0) {
    return ["Ortsseiten und Ranglisten nicht zählbar — keine Aussage über die Vollständigkeit."];
  }
  if (seiten > platzierungen) {
    return [
      `${seiten - platzierungen} Ortsseiten ohne Rangliste (${platzierungen} Ranglisten, ${seiten} Seiten): ` +
        `Diese Seiten zeigen keinen Vergleich und melden bei jedem Aufruf einen Fehler.`,
    ];
  }
  if (platzierungen > seiten) {
    return [
      `${platzierungen - seiten} Ranglisten ohne Ortsseite (${platzierungen} Ranglisten, ${seiten} Seiten): ` +
        `Ein Ort ohne eigene Seite steht damit in den Ranglisten anderer Orte.`,
    ];
  }
  return [];
}
