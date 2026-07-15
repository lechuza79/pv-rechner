"use client";

import Link from "next/link";
import { v } from "../../lib/theme";

export type CompareRow = {
  label: string;
  /** Rank within the scope named in `scope`. */
  rang: number | null;
  scope: string;
  name: string;
  href: string | null;
  population: number | null;
  value: number;
  isSelf: boolean;
};

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

/**
 * Comparison table with bars.
 *
 * The bars are capped at the second-highest value, not the highest. One Gemeinde
 * with a solar park (Riedenheim: 126.865 W per head) would otherwise squash every
 * other bar to a hairline and turn the chart into a single block. The capped bar
 * is cut off visibly and its real number, as always, is printed next to it — the
 * bar is the aid, the number is the truth.
 */
export default function ComparisonTable({ rows }: { rows: CompareRow[] }) {
  const values = rows.map((r) => r.value).sort((a, b) => b - a);
  const cap = values.length > 1 ? Math.max(values[1], 1) : Math.max(values[0], 1);

  return (
    <div style={S.table}>
      {rows.map((r, i) => {
        const over = r.value > cap;
        const pct = Math.min(100, Math.max(2, Math.round((r.value / cap) * 100)));
        return (
          <div key={`${r.name}-${i}`} style={{ ...S.row, ...(r.isSelf ? S.rowSelf : null) }}>
            <div style={S.head}>
              <span style={S.left}>
                <span style={S.scope}>
                  {r.rang !== null ? `${r.rang}.` : "—"} {r.scope}
                </span>
                {r.href && !r.isSelf ? (
                  <Link href={r.href} style={S.name}>
                    {r.name}
                  </Link>
                ) : (
                  <span style={{ ...S.name, fontWeight: r.isSelf ? 700 : 600 }}>{r.name}</span>
                )}
                {r.population !== null && <span style={S.pop}>{nf(r.population)} Einw.</span>}
              </span>
              <span style={S.value}>{nf(r.value)} W</span>
            </div>
            <div style={S.track}>
              <div
                style={{
                  ...S.fill,
                  width: `${pct}%`,
                  background: r.isSelf ? v("--color-accent") : v("--color-accent-light"),
                  // Zigzag right edge marks a bar that ran off the scale.
                  clipPath: over
                    ? "polygon(0 0, calc(100% - 6px) 0, 100% 25%, calc(100% - 6px) 50%, 100% 75%, calc(100% - 6px) 100%, 0 100%)"
                    : undefined,
                }}
              />
            </div>
          </div>
        );
      })}
      {values[0] > cap && (
        <p style={S.note}>
          Der längste Balken ist abgeschnitten — sein Wert sprengt die Skala. Die Zahlen rechts
          gelten unverändert.
        </p>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  table: { display: "flex", flexDirection: "column", gap: 10 },
  row: { padding: "6px 8px", borderRadius: v("--radius-md"), margin: "0 -8px" },
  rowSelf: { background: v("--color-bg-accent") },
  head: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 4 },
  left: { display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap", minWidth: 0 },
  scope: { fontSize: 11, color: v("--color-text-muted"), fontFamily: v("--font-mono"), whiteSpace: "nowrap" },
  name: { fontSize: 13, fontWeight: 600, color: v("--color-text-primary"), textDecoration: "none" },
  pop: { fontSize: 11, color: v("--color-text-muted") },
  value: { fontSize: 13, fontFamily: v("--font-mono"), fontWeight: 600, whiteSpace: "nowrap" },
  track: { height: 8, background: v("--color-bg-muted"), borderRadius: 4 },
  fill: { height: "100%", borderRadius: 4 },
  note: { fontSize: 11, color: v("--color-text-muted"), lineHeight: 1.6, margin: "4px 0 0" },
};
