import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../../../lib/supabase-server";
import { v, space } from "../../../../../lib/theme";
import type { StoredReport } from "../../../../../lib/waechter-reports";

export const metadata = {
  title: "Wächter-Bericht – Solar Check Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function WaechterReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!supabase) notFound();

  const { data, error } = await supabase
    .from("waechter_reports")
    .select("id, created_at, tag, subject, decisions, done, details, delivered, skip_reason")
    .eq("id", id)
    .single();

  if (error || !data) notFound();
  const r = data as StoredReport;
  const decisions = Array.isArray(r.decisions) ? r.decisions : [];
  const done = Array.isArray(r.done) ? r.done : [];

  return (
    <div style={{ fontFamily: v("--font-text"), color: v("--color-text-primary"), maxWidth: 760 }}>
      <Link href="/admin/waechter" style={{ fontSize: v("--font-size-small"), color: v("--color-accent"), textDecoration: "none" }}>← Alle Berichte</Link>

      <h1 style={{ fontSize: v("--font-size-h1"), fontWeight: 800, margin: `${space.md}px 0 ${space.xs}px` }}>{r.subject}</h1>
      <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), marginBottom: space.xl }}>
        {new Date(r.created_at).toLocaleString("de-DE")}
        {r.tag ? ` · ${r.tag}` : ""}
        {` · ${r.delivered ? "als Mail zugestellt" : `keine Mail${r.skip_reason ? ` (${r.skip_reason})` : ""}`}`}
      </p>

      {decisions.length > 0 && (
        <section style={{ marginBottom: space.xl }}>
          <h2 style={{ fontSize: v("--font-size-body"), fontWeight: 700, marginBottom: space.sm }}>Deine Entscheidung</h2>
          <ol style={{ margin: 0, paddingLeft: space.lg, fontSize: v("--font-size-body"), lineHeight: 1.7 }}>
            {decisions.map((d, i) => <li key={i} style={{ marginBottom: space.xs }}>{d}</li>)}
          </ol>
        </section>
      )}

      {done.length > 0 && (
        <section style={{ marginBottom: space.xl }}>
          <h2 style={{ fontSize: v("--font-size-body"), fontWeight: 700, marginBottom: space.sm }}>Selbst erledigt</h2>
          <ul style={{ margin: 0, paddingLeft: space.lg, fontSize: v("--font-size-body"), lineHeight: 1.7 }}>
            {done.map((d, i) => <li key={i} style={{ marginBottom: space.xs }}>{d}</li>)}
          </ul>
        </section>
      )}

      {r.details && (
        <section>
          <h2 style={{ fontSize: v("--font-size-body"), fontWeight: 700, marginBottom: space.sm }}>Ganzer Lauf</h2>
          <pre style={{
            whiteSpace: "pre-wrap", wordBreak: "break-word",
            fontFamily: v("--font-mono"), fontSize: v("--font-size-small"), lineHeight: 1.7,
            color: v("--color-text-secondary"),
            background: v("--color-bg-muted"), border: `1px solid ${v("--color-border")}`,
            borderRadius: v("--radius-md"), padding: space.lg, margin: 0,
          }}>{r.details}</pre>
        </section>
      )}
    </div>
  );
}
