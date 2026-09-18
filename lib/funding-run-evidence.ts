export type RunObservation = { attempted_at?: string; readable?: boolean; failure_reason?: string | null; extracted?: number; reviewed_at?: string; url?: string };
export function summarizeEvidence(rows: RunObservation[]) {
  return {
    attempted: rows.filter(r => r.attempted_at).length,
    readable: rows.filter(r => r.attempted_at && r.readable === true).length,
    extracted: rows.filter(r => typeof r.extracted === "number" && r.extracted > 0).length,
    reviewed: rows.filter(r => r.reviewed_at && r.url).length,
    failures: rows.filter(r => r.attempted_at && r.failure_reason).reduce<Record<string, number>>((a, r) => {
      a[r.failure_reason!] = (a[r.failure_reason!] ?? 0) + 1; return a;
    }, {}),
  };
}
