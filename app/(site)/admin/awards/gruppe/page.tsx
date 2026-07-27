import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../../../lib/supabase-server-component";
import { loadAwardStats, loadKreisNames } from "../../../../../lib/awards-server";
import { bundeslandByAgs } from "../../../../../lib/mastr-regions";
import { AWARD_CATEGORY_BY_KEY, formatAwardValue, rankGemeinden, scopeIdOf, type AwardScopeLevel } from "../../../../../lib/awards";
import { v, space, pad } from "../../../../../lib/theme";


const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export const metadata = { title: "Award-Gruppe – Solar Check Admin", robots: { index: false, follow: false } };

const SCOPE_OF: Record<string, AwardScopeLevel> = { kreis: "landkreis", land: "bundesland", bund: "de" };
const nf = (n: number) => Math.round(n).toLocaleString("de-DE");
const MAX_ROWS = 120;

export default async function GruppePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) redirect("/");

  const sp = await searchParams;
  const cat = AWARD_CATEGORY_BY_KEY[sp.cat ?? ""];
  const levelKey = sp.level ?? "";
  const scope = sp.scope ?? "";
  const mark = sp.mark ?? "";
  if (!cat || !SCOPE_OF[levelKey] || !scope) redirect("/admin/awards/anschreiben");

  const level = SCOPE_OF[levelKey];
  const [stats, kreisNames] = await Promise.all([loadAwardStats(), loadKreisNames()]);
  const inScope = stats.filter((g) => scopeIdOf(g.regionId, level) === scope);
  const ranked = rankGemeinden(inScope, cat);

  const scopeName =
    levelKey === "bund" ? "Deutschland" : levelKey === "land" ? bundeslandByAgs(scope)?.name ?? scope : kreisNames[scope] ?? scope;

  const markRank = ranked.find((r) => r.regionId === mark);
  const head = ranked.slice(0, MAX_ROWS);
  const showMarkSeparately = markRank && markRank.rank > MAX_ROWS;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.md }}>
      <div style={{ fontSize: 13 }}>
        <Link href="/admin/awards/anschreiben" style={{ color: v("--color-accent"), textDecoration: "none" }}>← Anschreiben-Aufhänger</Link>
      </div>
      <header>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: v("--color-text-primary"), margin: 0 }}>{cat.label}</h1>
        <p style={{ fontSize: 14, color: v("--color-text-secondary"), marginTop: space.xs }}>
          {levelKey === "bund" ? "bundesweit" : `im ${scopeName}`} · {nf(ranked.length)} wertbare Gemeinden ·{" "}
          {cat.messart === "proKopf" ? "pro Kopf" : "absolut"}
        </p>
      </header>

      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        {head.map((r) => {
          const isMark = r.regionId === mark;
          return (
            <li key={r.regionId} style={{
              display: "grid", gridTemplateColumns: "48px 1fr auto", gap: space.md, alignItems: "baseline",
              padding: pad("xs", "md"), borderRadius: v("--radius-sm"),
              background: isMark ? v("--color-accent-dim") : r.rank % 2 ? "transparent" : v("--color-bg-muted"),
            }}>
              <span style={{ fontFamily: v("--font-mono"), fontSize: 13, color: v("--color-text-muted"), textAlign: "right" }}>{r.rank}.</span>
              <span style={{ fontSize: 14, fontWeight: isMark ? 700 : 500, color: v("--color-text-primary") }}>{r.name}</span>
              <span style={{ fontFamily: v("--font-mono"), fontSize: 13, color: isMark ? v("--color-accent") : v("--color-text-secondary") }}>{formatAwardValue(r.value, cat.format)}</span>
            </li>
          );
        })}
        {showMarkSeparately && markRank && (
          <>
            <li style={{ textAlign: "center", color: v("--color-text-muted"), padding: pad("xs", "md") }}>…</li>
            <li style={{ display: "grid", gridTemplateColumns: "48px 1fr auto", gap: space.md, alignItems: "baseline", padding: pad("xs", "md"), borderRadius: v("--radius-sm"), background: v("--color-accent-dim") }}>
              <span style={{ fontFamily: v("--font-mono"), fontSize: 13, color: v("--color-text-muted"), textAlign: "right" }}>{markRank.rank}.</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: v("--color-text-primary") }}>{markRank.name}</span>
              <span style={{ fontFamily: v("--font-mono"), fontSize: 13, color: v("--color-accent") }}>{formatAwardValue(markRank.value, cat.format)}</span>
            </li>
          </>
        )}
      </ol>
      {ranked.length > MAX_ROWS && !showMarkSeparately && (
        <div style={{ fontSize: 12, color: v("--color-text-muted") }}>Zeige die ersten {MAX_ROWS} von {nf(ranked.length)}.</div>
      )}
    </div>
  );
}
