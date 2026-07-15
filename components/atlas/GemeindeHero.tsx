"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import DonutChart from "../charts/DonutChart";
import { v } from "../../lib/theme";
import { SEGMENT_OWNER } from "../../lib/atlas";

export type HeroCell = { segment: string; count: number; kwp: number };

export type HeroPeer = {
  region_id: string;
  name: string;
  href: string | null;
  population: number | null;
  /** W per inhabitant under the currently selected owner filter. */
  values: Record<Owner, number | null>;
  rang: Record<Owner, number | null>;
  scope: string;
  isSelf: boolean;
};

type Owner = "alle" | "privat" | "gewerbe";

const OWNERS: { key: Owner; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "privat", label: "Privat" },
  { key: "gewerbe", label: "Gewerbe" },
];

/**
 * Category colours, fixed. They must not follow a theme — a slice that means
 * "Freifläche" cannot change meaning between light and dark (widget convention:
 * theme owns background, text and accent, never semantics).
 */
const SEG: Record<string, { label: string; color: string }> = {
  privat_dach: { label: "Private Dächer", color: "#1365EA" },
  gewerbe_dach: { label: "Gewerbedächer", color: "#6A9EF2" },
  steckersolar: { label: "Balkonkraftwerke", color: "#BCD6FF" },
  freiflaeche: { label: "Freifläche", color: "#073C93" },
};

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

function fmtLeistung(kwp: number): string {
  if (kwp >= 1000) return `${(kwp / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MW`;
  return `${nf(kwp)} kW`;
}

/**
 * The Gemeinde's own mix beside the peers it is measured against, under one
 * owner filter.
 *
 * Both halves answer the same question — where does this place stand — so they
 * share a filter rather than each carrying their own. Splitting them would let
 * the donut show all plants while the table ranks only private ones, which is
 * two different stories side by side.
 */
export default function GemeindeHero({
  cells,
  peers,
  regionName,
}: {
  cells: HeroCell[];
  peers: HeroPeer[];
  regionName: string;
}) {
  const [owner, setOwner] = useState<Owner>("alle");
  const [active, setActive] = useState<string | null>(null);

  const slices = useMemo(() => {
    const keep = (segment: string) =>
      owner === "alle" ? SEGMENT_OWNER[segment] !== null : SEGMENT_OWNER[segment] === owner;
    return cells
      .filter((c) => c.kwp > 0 && SEG[c.segment] && keep(c.segment))
      .map((c) => ({ key: c.segment, label: SEG[c.segment].label, color: SEG[c.segment].color, value: c.kwp, count: c.count }))
      .sort((a, b) => b.value - a.value);
  }, [cells, owner]);

  const total = slices.reduce((a, s) => a + s.value, 0);
  const shown = active ? slices.find((s) => s.key === active) : null;

  const rows = useMemo(() => {
    const withVal = peers.filter((p) => p.values[owner] !== null);
    const self = withVal.find((p) => p.isSelf);
    const others = withVal.filter((p) => !p.isSelf).sort((a, b) => (b.values[owner] as number) - (a.values[owner] as number));
    // Self is never cut: it is 8th of 52 here, and a comparison table that drops
    // the place it is about answers nothing.
    return self ? [...others.slice(0, 6), self] : others.slice(0, 7);
  }, [peers, owner]);
  // Cap at the runner-up: one Gemeinde with a solar park (126.865 W/head against
  // 17.705 on second place) would flatten every other bar to a hairline.
  const scale = useMemo(() => {
    const vals = rows.map((r) => r.values[owner] as number).sort((a, b) => b - a);
    return Math.max(1, vals[1] ?? vals[0] ?? 1);
  }, [rows, owner]);

  return (
    <div style={S.card}>
      <div style={S.chips}>
        {OWNERS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setOwner(o.key)}
            style={{
              ...S.chip,
              background: owner === o.key ? v("--color-accent") : "transparent",
              color: owner === o.key ? v("--color-text-on-accent") : v("--color-text-secondary"),
            }}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div style={S.split}>
        <div style={S.left}>
          {slices.length === 0 ? (
            <p style={S.empty}>Für diese Auswahl sind keine Anlagen erfasst.</p>
          ) : (
            <>
              <div
                onMouseLeave={() => setActive(null)}
                onPointerDown={() => setActive(null)}
                style={{ display: "inline-block" }}
              >
                <DonutChart segments={slices} size={170}>
                  <div style={S.centerValue}>{fmtLeistung(shown ? shown.value : total)}</div>
                  <div style={S.centerLabel}>{shown ? shown.label : "gesamt"}</div>
                  {shown && <div style={S.centerSub}>{nf(shown.count)} Anlagen</div>}
                </DonutChart>
              </div>
              <div style={S.legend}>
                {slices.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onMouseEnter={() => setActive(s.key)}
                    onMouseLeave={() => setActive(null)}
                    onClick={() => setActive(active === s.key ? null : s.key)}
                    style={{
                      ...S.legendItem,
                      opacity: active && active !== s.key ? 0.45 : 1,
                    }}
                  >
                    <span style={{ ...S.dot, background: s.color }} />
                    <span style={S.legendLabel}>{s.label}</span>
                    <span style={S.legendVal}>{Math.round((s.value / total) * 100)} %</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={S.right}>
          <div style={S.rightHead}>Solarleistung je Einwohner</div>
          {rows.map((r) => {
            const val = r.values[owner] as number;
            return (
              <div key={r.region_id} style={{ ...S.peerRow, ...(r.isSelf ? S.peerSelf : null) }}>
                <span style={S.peerRank}>{r.rang[owner] ?? "—"}.</span>
                <span style={S.peerName}>
                  {r.href && !r.isSelf ? (
                    <Link href={r.href} style={S.peerLink}>
                      {r.name}
                    </Link>
                  ) : (
                    <span style={{ fontWeight: r.isSelf ? 700 : 500 }}>{r.name}</span>
                  )}
                  <span style={S.peerScope}>{r.scope}</span>
                </span>
                <span style={S.peerVal}>
                  <span>{nf(val)} W</span>
                  <span style={S.track}>
                    <span
                      style={{
                        ...S.fill,
                        width: `${Math.min(100, Math.max(2, Math.round((val / scale) * 100)))}%`,
                        background: r.isSelf ? v("--color-accent") : v("--color-accent-light"),
                      }}
                    />
                  </span>
                </span>
              </div>
            );
          })}
          <p style={S.peerNote}>
            Verglichen mit Gemeinden ähnlicher Größe — die bundesweite Spitze wäre ein Koog mit
            55 Einwohnern und sagte über {regionName} nichts.
          </p>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: {
    background: v("--color-bg-accent"),
    border: `1px solid ${v("--color-border-accent")}`,
    borderRadius: v("--radius-lg"),
    padding: "16px 18px",
    marginBottom: 28,
  },
  chips: { display: "flex", gap: 4, marginBottom: 14 },
  chip: {
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 999,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    background: "transparent",
  },
  split: { display: "flex", flexWrap: "wrap", gap: 22, alignItems: "flex-start" },
  left: { flex: "1 1 240px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, minWidth: 0 },
  right: { flex: "1 1 280px", minWidth: 0 },
  rightHead: { fontSize: 11, color: v("--color-text-muted"), fontWeight: 600, marginBottom: 8 },
  centerValue: { fontFamily: v("--font-mono"), fontSize: 19, fontWeight: 700, lineHeight: 1.1 },
  centerLabel: { fontSize: 11, color: v("--color-text-secondary"), marginTop: 2 },
  centerSub: { fontSize: 10, color: v("--color-text-muted"), fontFamily: v("--font-mono") },
  legend: { display: "flex", flexWrap: "wrap", gap: "4px 10px", justifyContent: "center" },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    background: "none",
    border: "none",
    padding: "2px 0",
    fontFamily: "inherit",
    fontSize: 11,
    color: v("--color-text-secondary"),
    cursor: "pointer",
  },
  dot: { width: 8, height: 8, borderRadius: 2, flex: "0 0 auto" },
  legendLabel: {},
  legendVal: { fontFamily: v("--font-mono"), fontWeight: 600, color: v("--color-text-primary") },
  empty: { fontSize: 12, color: v("--color-text-muted"), margin: 0 },
  peerRow: {
    display: "grid",
    gridTemplateColumns: "24px minmax(0,1fr) 86px",
    alignItems: "center",
    gap: 8,
    padding: "5px 6px",
    margin: "0 -6px",
    borderRadius: v("--radius-sm"),
    fontSize: 12,
  },
  peerSelf: { background: v("--color-bg") },
  peerRank: { fontFamily: v("--font-mono"), fontSize: 11, color: v("--color-text-muted") },
  peerName: { display: "flex", flexDirection: "column", minWidth: 0 },
  peerLink: { color: v("--color-text-primary"), textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  peerScope: { fontSize: 9, color: v("--color-text-muted") },
  peerVal: { fontFamily: v("--font-mono"), fontSize: 11, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 },
  track: { display: "block", width: "100%", height: 4, background: v("--color-bg"), borderRadius: 2 },
  fill: { display: "block", height: "100%", borderRadius: 2, marginLeft: "auto" },
  peerNote: { fontSize: 10, color: v("--color-text-muted"), lineHeight: 1.6, margin: "10px 0 0" },
};
