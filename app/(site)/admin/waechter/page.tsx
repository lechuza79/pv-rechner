import Link from "next/link";
import { supabase } from "../../../../lib/supabase-server";
import { v, space, pad } from "../../../../lib/theme";
import type { StoredReport } from "../../../../lib/waechter-reports";

export const metadata = {
  title: "Wächter-Berichte – Solar Check Admin",
  robots: { index: false, follow: false },
};

// Die Ablage aller Wächter-Läufe. Der Guard sitzt im Admin-Layout; hier steht
// nur die Liste. Bewusst ohne Filter-UI: Wer hier landet, sucht den letzten Lauf
// eines Wächters, und der steht oben.
export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function WaechterReportsPage() {
  let reports: StoredReport[] = [];
  let problem: string | null = null;

  if (!supabase) {
    problem = "Keine Datenbank-Verbindung konfiguriert.";
  } else {
    const { data, error } = await supabase
      .from("waechter_reports")
      .select("id, created_at, tag, subject, decisions, done, details, delivered, skip_reason")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) problem = error.message;
    else reports = (data ?? []) as StoredReport[];
  }

  return (
    <div style={{ fontFamily: v("--font-text"), color: v("--color-text-primary"), maxWidth: 760 }}>
      <div style={{ marginBottom: space.xl }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: v("--color-accent"), letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: space.xs }}>Admin</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: space.xs }}>Wächter-Berichte</h1>
        <p style={{ fontSize: 13, color: v("--color-text-muted"), lineHeight: 1.5 }}>
          Jeder Lauf wird hier abgelegt — auch die, die keine Mail ausgelöst haben. Die letzten 100.
        </p>
      </div>

      {problem && (
        <p style={{ fontSize: 13, color: v("--color-negative") }}>{problem}</p>
      )}

      {!problem && reports.length === 0 && (
        <p style={{ fontSize: 13, color: v("--color-text-muted") }}>
          Noch kein Lauf abgelegt. Die Ablage füllt sich mit dem nächsten Wächter.
        </p>
      )}

      <div style={{ display: "grid", gap: space.sm }}>
        {reports.map((r) => {
          const decisions = Array.isArray(r.decisions) ? r.decisions.length : 0;
          const done = Array.isArray(r.done) ? r.done.length : 0;
          return (
            <Link
              key={r.id}
              href={`/admin/waechter/${r.id}`}
              style={{
                display: "block", textDecoration: "none",
                background: v("--color-bg"), border: `1px solid ${v("--color-border")}`,
                borderRadius: v("--radius-md"), padding: pad("md", "lg"),
              }}
            >
              <div style={{ display: "flex", gap: space.sm, alignItems: "baseline", flexWrap: "wrap" }}>
                <span style={{ fontFamily: v("--font-mono"), fontSize: 12, color: v("--color-text-muted") }}>{fmtDate(r.created_at)}</span>
                {r.tag && <span style={{ fontSize: 12, color: v("--color-text-muted") }}>{r.tag}</span>}
                {decisions > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: v("--color-accent") }}>
                    {decisions === 1 ? "1 Entscheidung" : `${decisions} Entscheidungen`}
                  </span>
                )}
                {done > 0 && (
                  <span style={{ fontSize: 12, color: v("--color-positive") }}>
                    {done === 1 ? "1 selbst erledigt" : `${done} selbst erledigt`}
                  </span>
                )}
                {!r.delivered && (
                  <span style={{ fontSize: 12, color: v("--color-text-muted") }}>keine Mail{r.skip_reason ? ` (${r.skip_reason})` : ""}</span>
                )}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: space.xs, color: v("--color-text-primary") }}>{r.subject}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
