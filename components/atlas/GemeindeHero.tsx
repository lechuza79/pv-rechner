"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import DonutChart from "../charts/DonutChart";
import { IconChevronDown, IconChevronLeft, IconChevronRight } from "../Icons";
import { v } from "../../lib/theme";
import { SEGMENT_OWNER, type ChildYearRow, type RankingRegion } from "../../lib/atlas";

export type HeroCell = { segment: string; count: number; kwp: number };

/** A size-class benchmark from outside the Kreis. Per-capita only — see below. */
export type OutsidePeer = {
  region_id: string;
  name: string;
  href: string | null;
  population: number;
  scope: string;
  values: Record<Owner, number | null>;
};

type Owner = "alle" | "privat" | "gewerbe";
type Metric = "perCapita" | "count" | "kwp" | "speicher";

const OWNERS: { key: Owner; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "privat", label: "Privat" },
  { key: "gewerbe", label: "Gewerbe" },
];

const METRICS: { key: Metric; label: string }[] = [
  { key: "perCapita", label: "Solarleistung je Einwohner" },
  { key: "count", label: "Zahl der Anlagen" },
  { key: "kwp", label: "Installierte Leistung" },
  { key: "speicher", label: "Speicherkapazität" },
];

/**
 * Category colours, fixed. A slice that means "Freifläche" cannot change meaning
 * between light and dark (widget convention: theme owns background, text and
 * accent, never semantics).
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

function fmtValue(v: number, m: Metric): string {
  if (m === "perCapita") return `${nf(v)} W`;
  if (m === "kwp") return fmtLeistung(v);
  if (m === "speicher") return v >= 1000 ? `${(v / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MWh` : `${nf(v)} kWh`;
  return nf(v);
}

type PeerRow = {
  region_id: string;
  name: string;
  href: string | null;
  scope: string;
  value: number;
  rang: number | null;
  isSelf: boolean;
};

/**
 * Metric selector in the same shape as the energy charts' year picker: arrows to
 * step through, a dropdown to jump. Consistency with that control is the point —
 * the reader learns one pattern once.
 */
function MetricPicker({ metric, onChange }: { metric: Metric; onChange: (m: Metric) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const idx = METRICS.findIndex((m) => m.key === metric);
  const go = (delta: number) => {
    const next = METRICS[idx + delta];
    if (next) onChange(next.key);
  };
  return (
    <div style={S.pickerBar}>
      <button
        type="button"
        onClick={() => go(-1)}
        disabled={idx <= 0}
        style={{ ...S.pickerArrow, borderRadius: "8px 0 0 8px", borderRight: "none", opacity: idx <= 0 ? 0.4 : 1 }}
        title="Vorherige Kennzahl"
      >
        <IconChevronLeft size={9} />
      </button>
      <div ref={ref} style={{ position: "relative", display: "flex", flex: 1 }}>
        <button type="button" onClick={() => setOpen(!open)} style={S.pickerLabel}>
          {METRICS[idx]?.label}
          <IconChevronDown size={8} />
        </button>
        {open && (
          <div style={S.dropdown}>
            {METRICS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => {
                  onChange(m.key);
                  setOpen(false);
                }}
                style={{ ...S.dropItem, fontWeight: metric === m.key ? 700 : 400 }}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => go(1)}
        disabled={idx >= METRICS.length - 1}
        style={{ ...S.pickerArrow, borderRadius: "0 8px 8px 0", borderLeft: "none", opacity: idx >= METRICS.length - 1 ? 0.4 : 1 }}
        title="Nächste Kennzahl"
      >
        <IconChevronRight size={9} />
      </button>
    </div>
  );
}

function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open, close]);
  return ref;
}

/**
 * The Gemeinde's own mix beside the peers it is measured against, under one
 * owner filter.
 *
 * Both halves answer the same question — where does this place stand — so they
 * share the filter rather than each carrying their own. Splitting them would let
 * the donut show every plant while the table ranks only private ones: two
 * different stories side by side.
 */
export default function GemeindeHero({
  cells,
  siblings,
  siblingCells,
  outside,
  regionId,
  regionName,
  basePath,
}: {
  cells: HeroCell[];
  siblings: RankingRegion[];
  siblingCells: ChildYearRow[];
  outside: OutsidePeer[];
  regionId: string;
  regionName: string;
  basePath: string;
}) {
  const [owner, setOwner] = useState<Owner>("alle");
  const [metric, setMetric] = useState<Metric>("perCapita");
  const [active, setActive] = useState<string | null>(null);

  const keep = (segment: string) =>
    owner === "alle" ? SEGMENT_OWNER[segment] !== null : SEGMENT_OWNER[segment] === owner;

  const slices = useMemo(
    () =>
      cells
        .filter((c) => c.kwp > 0 && SEG[c.segment] && keep(c.segment))
        .map((c) => ({ key: c.segment, label: SEG[c.segment].label, color: SEG[c.segment].color, value: c.kwp, count: c.count }))
        .sort((a, b) => b.value - a.value),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cells, owner],
  );
  const total = slices.reduce((a, s) => a + s.value, 0);
  const shown = active ? slices.find((s) => s.key === active) : null;

  // Rank every Gemeinde in the Kreis, client-side, from the same cells the big
  // table uses — that is what lets owner and metric recombine without a refetch.
  const ranked = useMemo(() => {
    const acc = new Map<string, { count: number; kwp: number; speicher: number }>();
    for (const c of siblingCells) {
      if (!keep(c.segment)) continue;
      const a = acc.get(c.region_id) ?? { count: 0, kwp: 0, speicher: 0 };
      if (c.segment.startsWith("batterie")) a.speicher += c.kwh;
      else {
        a.count += c.count;
        a.kwp += c.kwp;
      }
      acc.set(c.region_id, a);
    }
    const rows = siblings
      .map((r) => {
        const a = acc.get(r.region_id) ?? { count: 0, kwp: 0, speicher: 0 };
        const value =
          metric === "perCapita" ? (r.population ? Math.round((a.kwp * 1000) / r.population) : null) : a[metric];
        return { region: r, value };
      })
      .filter((x): x is { region: RankingRegion; value: number } => x.value !== null);
    rows.sort((a, b) => b.value - a.value);
    return rows.map((x, i) => ({
      region_id: x.region.region_id,
      name: x.region.name,
      href: x.region.slug ? `${basePath}/${x.region.slug}` : null,
      scope: "im Landkreis",
      value: x.value,
      rang: i + 1,
      isSelf: x.region.region_id === regionId,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siblingCells, siblings, owner, metric, basePath, regionId]);

  const { rows, selfDetached } = useMemo(() => {
    // The size-class benchmark only exists per head. On absolute counts a
    // 7.000-inhabitant peer says nothing — the whole point of that row is that
    // population is held constant.
    const ext: PeerRow[] =
      metric === "perCapita"
        ? outside
            .filter((o) => o.values[owner] !== null)
            .map((o) => ({
              region_id: o.region_id,
              name: o.name,
              href: o.href,
              scope: o.scope,
              value: o.values[owner] as number,
              rang: 1,
              isSelf: false,
            }))
        : [];
    // Sort self IN with everyone else, so it lands at its real position: under
    // "Gewerbe" Höchberg may sit in the top few, under "Pro Kopf" near the bottom.
    // Filtering it out first (the old bug) pinned it to the last row forever.
    const all = [...ranked, ...ext].sort((a, b) => b.value - a.value);
    const top = all.slice(0, 6);
    if (top.some((r) => r.isSelf)) return { rows: top, selfDetached: false };
    // Only when self is beyond the top rows is it appended — never cut, but marked
    // as detached so a gap row can show the rows in between are skipped.
    const self = all.find((r) => r.isSelf);
    return { rows: self ? [...top, self] : top, selfDetached: Boolean(self) };
  }, [ranked, outside, owner, metric]);

  // Cap at the runner-up: one Gemeinde with a solar park (126.865 W/head against
  // 17.705 on second place) would flatten every other bar to a hairline.
  const scale = useMemo(() => {
    const vals = rows.map((r) => r.value).sort((a, b) => b - a);
    return Math.max(1, vals[1] ?? vals[0] ?? 1);
  }, [rows]);

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
              <div onMouseLeave={() => setActive(null)} style={{ display: "inline-block" }}>
                <DonutChart segments={slices} size={170}>
                  <div key={shown?.key ?? "total"} style={S.center}>
                    <div style={S.centerValue}>{fmtLeistung(shown ? shown.value : total)}</div>
                    <div style={S.centerLabel}>{shown ? shown.label : "gesamt"}</div>
                    <div style={S.centerSub}>
                      {shown ? `${nf(shown.count)} Anlagen` : `${Math.round(total > 0 ? 100 : 0)} %`}
                    </div>
                  </div>
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
                    style={{ ...S.legendItem, opacity: active && active !== s.key ? 0.4 : 1 }}
                  >
                    <span style={{ ...S.dot, background: s.color }} />
                    <span>{s.label}</span>
                    <span style={S.legendVal}>{Math.round((s.value / total) * 100)} %</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={S.right}>
          <MetricPicker metric={metric} onChange={setMetric} />

          {rows.map((r, i) => (
            <div key={`${r.region_id}-${r.scope}`}>
              {/* A gap row makes clear that ranks between the top and self are
                  skipped — otherwise "6." then "48." reads as a data error. */}
              {selfDetached && r.isSelf && i > 0 && <div style={S.gap}>⋯</div>}
              <div style={{ ...S.peerRow, ...(r.isSelf ? S.peerSelf : null) }}>
                <span style={S.peerRank}>{r.rang}.</span>
                <span style={S.peerName}>
                  {r.href && !r.isSelf ? (
                    <Link href={r.href} style={S.peerLink}>
                      {r.name}
                    </Link>
                  ) : (
                    <span style={{ ...S.peerLink, fontWeight: r.isSelf ? 700 : 500 }}>{r.name}</span>
                  )}
                  <span style={S.peerScope}>{r.scope}</span>
                </span>
                <span style={S.peerVal}>
                  <span>{fmtValue(r.value, metric)}</span>
                  <span style={S.track}>
                    <span
                      style={{
                        ...S.fill,
                        width: `${Math.min(100, Math.max(2, Math.round((r.value / scale) * 100)))}%`,
                        background: r.isSelf ? v("--color-accent") : v("--color-accent-light"),
                      }}
                    />
                  </span>
                </span>
              </div>
            </div>
          ))}

          {metric === "perCapita" && (
            <p style={S.peerNote}>
              Verglichen mit Gemeinden ähnlicher Größe — die bundesweite Spitze wäre ein Koog mit
              55 Einwohnern und sagte über {regionName} nichts.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: { marginBottom: 28 },
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
    // Switching filter redraws every number; without this the table jumps.
    transition: "background 160ms ease, color 160ms ease",
  },
  split: { display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" },
  left: { flex: "1 1 220px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, minWidth: 0 },
  right: { flex: "1 1 300px", minWidth: 0 },
  center: { animation: "fadeUp 0.18s ease-out" },
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
    transition: "opacity 160ms ease",
  },
  dot: { width: 8, height: 8, borderRadius: 2, flex: "0 0 auto" },
  legendVal: { fontFamily: v("--font-mono"), fontWeight: 600, color: v("--color-text-primary") },
  empty: { fontSize: 12, color: v("--color-text-muted"), margin: 0 },
  pickerBar: { display: "flex", alignItems: "stretch", marginBottom: 8 },
  pickerArrow: {
    border: `1px solid ${v("--color-border")}`,
    background: v("--color-bg"),
    color: v("--color-text-secondary"),
    padding: "0 8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerLabel: {
    flex: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    border: `1px solid ${v("--color-border")}`,
    background: v("--color-bg"),
    padding: "6px 10px",
    fontFamily: "inherit",
    fontSize: 12,
    fontWeight: 600,
    color: v("--color-text-primary"),
    cursor: "pointer",
  },
  gap: { textAlign: "center", fontSize: 12, color: v("--color-text-muted"), lineHeight: 1, padding: "2px 0" },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-sm"),
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    zIndex: 20,
    padding: "4px 0",
    minWidth: 190,
  },
  dropItem: {
    display: "block",
    width: "100%",
    background: "none",
    border: "none",
    textAlign: "left",
    padding: "6px 12px",
    fontSize: 12,
    fontFamily: "inherit",
    color: v("--color-text-primary"),
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  peerRow: {
    display: "grid",
    gridTemplateColumns: "26px minmax(0,1fr) 88px",
    alignItems: "center",
    gap: 8,
    padding: "5px 6px",
    margin: "0 -6px",
    borderRadius: v("--radius-sm"),
    fontSize: 12,
    transition: "background 160ms ease",
  },
  peerSelf: { background: v("--color-bg-accent") },
  peerRank: { fontFamily: v("--font-mono"), fontSize: 11, color: v("--color-text-muted") },
  peerName: { display: "flex", flexDirection: "column", minWidth: 0 },
  peerLink: { color: v("--color-text-primary"), textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  peerScope: { fontSize: 9, color: v("--color-text-muted") },
  peerVal: { fontFamily: v("--font-mono"), fontSize: 11, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 },
  track: { display: "block", width: "100%", height: 4, background: v("--color-bg-muted"), borderRadius: 2 },
  fill: { display: "block", height: "100%", borderRadius: 2, marginLeft: "auto", transition: "width 220ms ease" },
  peerNote: { fontSize: 10, color: v("--color-text-muted"), lineHeight: 1.6, margin: "10px 0 0" },
};
