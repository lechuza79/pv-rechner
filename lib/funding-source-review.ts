export type ReviewSource = {
  region_id: string;
  url: string;
  gelesen_am: string | null;
  gelesen_ergebnis: string | null;
  gelesen_notiz: string | null;
  seite_geaendert_am: string | null;
};

// Explicit completed outcomes; free text and unresolved decisions stay in the queue.
const completed = new Set([
  "aufgenommen", "vorhanden", "keine-foerderung", "ausgelaufen",
  "fachlich geprüft: addable", "fachlich geprüft: existing",
  "fachlich geprüft: no-program", "fachlich geprüft: closed",
]);

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
