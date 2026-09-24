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
 * Beide Richtungen zählen: Fehlt eine Platzierung, fehlen der Seite ihre
 * Ortsgeschichten; ist eine zu viel da, steht ein Ort in fremden Ranglisten,
 * den es als Seite nicht mehr gibt.
 *
 * WAS FEHLT, IST DIE VORBERECHNETE PLATZIERUNG — NICHT DER VERGLEICH AUF DER
 * SEITE. Bis zum 20.09.2026 behauptete die Meldung „Diese Seiten zeigen keinen
 * Vergleich". Nachgesehen an Gröde: Die Seite nennt ihre 0 Anlagen, ihren
 * letzten Platz im Kreis (133 von 133) und die vollständige Dörfer-Rangliste.
 * Wer die alte Meldung las, suchte einen Nutzerschaden, den es nicht gibt.
 *
 * DIE LÜCKE IST DAUERHAFT, NICHT VORÜBERGEHEND, und auch das stand hier falsch
 * („ein Ort unter einem alten Schlüssel" — das war die Ursache vom 18.09.).
 * Die Platzierungen entstehen aus `mastr_gemeinde_award`, und die entsteht über
 * einen INNEREN Verbund mit den Anlagendaten: Eine Gemeinde ohne eine einzige
 * gemeldete Anlage hat dort keine Zeile und fällt heraus. Die drei am
 * 20.09.2026 betroffenen Orte — Gröde (7 Einwohner), Dierfeld (15), Sengerich
 * (26) — haben Einwohner und ein Adress-Kürzel, erfüllen die Bedingungen also;
 * sie scheitern allein daran, dass dort noch nichts steht. Kein Datenlauf
 * behebt das, solange dort niemand eine Anlage baut.
 */
export function ortsseitenOhneRangliste(seiten: number, platzierungen: number): string[] {
  if (!Number.isInteger(seiten) || !Number.isInteger(platzierungen) || seiten <= 0 || platzierungen <= 0) {
    return ["Ortsseiten und Ranglisten nicht zählbar — keine Aussage über die Vollständigkeit."];
  }
  if (seiten > platzierungen) {
    return [
      `${seiten - platzierungen} Ortsseiten ohne vorberechnete Platzierung (${platzierungen} Platzierungen, ` +
        `${seiten} Seiten): Diesen Seiten fehlen die Ortsgeschichten, und sie melden bei jedem Aufruf einen ` +
        `Fehler ins Protokoll. Der Vergleich im Kreis steht trotzdem auf der Seite — das ist eine andere Quelle.`,
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
