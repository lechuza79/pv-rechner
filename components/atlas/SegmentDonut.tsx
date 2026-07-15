"use client";

import DonutChart from "../charts/DonutChart";
import { v } from "../../lib/theme";

export type SegmentSlice = { segment: string; count: number; kwp: number };

/**
 * Where a Gemeinde's solar power sits, by installed capacity.
 *
 * Fixed colours, not theme tokens: these are category colours and must stay put
 * across themes and embeds (widget convention — theme owns background, text and
 * accent, never semantics).
 */
const SEG: Record<string, { label: string; color: string }> = {
  privat_dach: { label: "Private Dächer", color: "#1365EA" },
  gewerbe_dach: { label: "Gewerbedächer", color: "#6A9EF2" },
  steckersolar: { label: "Steckersolar", color: "#BCD6FF" },
  freiflaeche: { label: "Freifläche", color: "#073C93" },
};

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

function fmtLeistung(kwp: number): string {
  if (kwp >= 1000) return `${(kwp / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MW`;
  return `${nf(kwp)} kW`;
}

export default function SegmentDonut({ segments }: { segments: SegmentSlice[] }) {
  const slices = segments
    .filter((s) => s.kwp > 0 && SEG[s.segment])
    .map((s) => ({
      key: s.segment,
      label: SEG[s.segment].label,
      color: SEG[s.segment].color,
      value: s.kwp,
    }));
  if (slices.length === 0) return null;

  const total = slices.reduce((a, s) => a + s.value, 0);
  const byKey = new Map(segments.map((s) => [s.segment, s]));

  return (
    <div style={S.wrap}>
      <div style={S.chart}>
        <DonutChart segments={slices} size={180}>
          <div style={S.centerValue}>{fmtLeistung(total)}</div>
          <div style={S.centerLabel}>gesamt</div>
        </DonutChart>
      </div>
      <div style={S.legend}>
        {slices.map((s) => {
          const raw = byKey.get(s.key);
          return (
            <div key={s.key} style={S.item}>
              <span style={{ ...S.dot, background: s.color }} />
              <span style={S.itemLabel}>{s.label}</span>
              <span style={S.itemVal}>
                {Math.round((s.value / total) * 100)} %
                <span style={S.itemSub}>
                  {fmtLeistung(s.value)} · {nf(raw?.count ?? 0)} Anlagen
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" },
  chart: { flex: "0 0 auto" },
  centerValue: { fontFamily: v("--font-mono"), fontSize: 20, fontWeight: 700, lineHeight: 1.1 },
  centerLabel: { fontSize: 11, color: v("--color-text-muted") },
  legend: { flex: "1 1 220px", display: "flex", flexDirection: "column", gap: 10, minWidth: 0 },
  item: { display: "flex", alignItems: "baseline", gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 3, flex: "0 0 auto" },
  itemLabel: { fontSize: 13, flex: 1, minWidth: 0 },
  itemVal: {
    fontFamily: v("--font-mono"),
    fontSize: 13,
    fontWeight: 600,
    textAlign: "right",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  itemSub: { fontSize: 10, fontWeight: 400, color: v("--color-text-muted"), marginTop: 2 },
};
