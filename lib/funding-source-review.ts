export type ReviewSource = {
  region_id: string;
  url: string;
  gelesen_am: string | null;
  gelesen_ergebnis: string | null;
  gelesen_notiz: string | null;
  seite_geaendert_am: string | null;
};

// Explicit completed outcomes; free text and unresolved decisions stay in the queue.
//
// EXPORTIERT, DAMIT DAS ABHAKEN DIESELBE LISTE BENUTZT WIE DAS FILTERN.
// Solange nur der Filter sie kannte, konnte ein Lauf ein Ergebnis schreiben,
// das die Zeile im Vorrat ließ — gemessen am 20.09.2026 bei 625 von 2.375
// gelesenen Zeilen. Zwei Listen für dieselbe Frage sind hier gar nicht nötig:
// Es ist eine, und das Werkzeug weist jetzt alles andere ab.
export const ABSCHLIESSENDE_ERGEBNISSE = new Set([
  "aufgenommen", "vorhanden", "keine-foerderung", "ausgelaufen",
  "fachlich geprüft: addable", "fachlich geprüft: existing",
  "fachlich geprüft: no-program", "fachlich geprüft: closed",
]);
const completed = ABSCHLIESSENDE_ERGEBNISSE;

export function pendingFundingSources<T extends ReviewSource>(rows: T[]): T[] {
  return rows.filter((row) => {
    if (!row.gelesen_am || !completed.has((row.gelesen_ergebnis ?? "").trim().toLowerCase())) return true;
    if (!row.seite_geaendert_am) return false;
    let reviewedAt: string | undefined;
    try { reviewedAt = JSON.parse(row.gelesen_notiz ?? "{}").reviewed_at; } catch { /* Legacy plain-text notes. */ }
    // Legacy dates lack intra-day ordering: conservatively reopen same-day changes once.
    if (!reviewedAt) return row.seite_geaendert_am.slice(0, 10) >= row.gelesen_am;
    const changed = Date.parse(row.seite_geaendert_am);
    const reviewed = Date.parse(reviewedAt);
    return !Number.isFinite(changed) || !Number.isFinite(reviewed) || changed > reviewed;
  });
}

/** Share reading work, never infer shared eligibility or municipal completion. */
export function groupedPendingFundingSources<T extends ReviewSource>(rows: T[]) {
  const groups = new Map<string, T[]>();
  for (const row of pendingFundingSources(rows)) {
    groups.set(row.url, [...(groups.get(row.url) ?? []), row]);
  }
  return [...groups].map(([url, sources]) => ({ url, associations: sources.length, sources }))
    .sort((a, b) => b.associations - a.associations || a.url.localeCompare(b.url));
}
