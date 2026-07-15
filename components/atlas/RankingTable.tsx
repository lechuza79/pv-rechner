"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { v } from "../../lib/theme";
import { IconArrowUp, IconArrowDown, IconChevronDown, IconChevronLeft, IconChevronRight } from "../Icons";
import { useHomeGemeinde, lookupPlz, type GemeindeHit } from "../../lib/home-gemeinde";
import { SEGMENT_OWNER, type ChildYearRow, type RankingRegion } from "../../lib/atlas";

type Owner = "alle" | "privat" | "gewerbe";
type Metric = "count" | "kwp" | "perCapita" | "speicher" | "zubau";
/** What the first column shows — position, or movement. */
type RankMode = "platz" | "delta";

type Row = {
  region_id: string;
  name: string;
  href: string | null;
  population: number | null;
  count: number;
  kwp: number;
  speicher: number;
  perCapita: number | null;
  zubau: number;
};

const COLUMNS: { key: Metric; label: string }[] = [
  { key: "count", label: "Anlagen" },
  { key: "kwp", label: "Leistung" },
  { key: "perCapita", label: "Pro Kopf" },
  { key: "speicher", label: "Speicher" },
  { key: "zubau", label: "Zubau" },
];

const OWNERS: { key: Owner; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "privat", label: "Privat" },
  { key: "gewerbe", label: "Gewerbe" },
];

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

function fmtLeistung(kwp: number): string {
  if (kwp >= 1_000_000) return `${(kwp / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} GW`;
  if (kwp >= 1000) return `${(kwp / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MW`;
  return `${nf(kwp)} kW`;
}

function fmtSpeicher(kwh: number): string {
  if (kwh >= 1_000_000) return `${(kwh / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} GWh`;
  if (kwh >= 1000) return `${(kwh / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MWh`;
  return `${nf(kwh)} kWh`;
}

function fmtCell(row: Row, m: Metric): string {
  if (m === "kwp") return fmtLeistung(row.kwp);
  if (m === "speicher") return fmtSpeicher(row.speicher);
  if (m === "perCapita") return row.perCapita === null ? "—" : `${nf(row.perCapita)} W`;
  return nf(row[m] as number);
}

function valueOf(row: Row, m: Metric): number | null {
  return m === "perCapita" ? row.perCapita : (row[m] as number);
}

/** Rank movement, sized to sit inline with the rank number beside it. */
function RankDelta({ value }: { value: number | null }) {
  if (value === null || value === 0) return null;
  const up = value > 0;
  const Icon = up ? IconArrowUp : IconArrowDown;
  return (
    <span
      title={`${Math.abs(value)} ${Math.abs(value) === 1 ? "Platz" : "Plätze"} ${up ? "gutgemacht" : "verloren"} im letzten vollen Jahr`}
      style={{ ...S.delta, color: up ? v("--color-positive") : v("--color-negative") }}
    >
      <Icon size={9} />
      {Math.abs(value)}
    </span>
  );
}

/**
 * Sortable ranking of a region's children.
 *
 * Every filter runs on the raw segment × year cells the server shipped, so owner,
 * metric and Zubau year recombine without a round trip. The owner filter applies
 * to every column at once — a table where "Anlagen" counted everything while
 * "Pro Kopf" counted only private roofs would put two different worlds in one row.
 */
export default function RankingTable({
  regions,
  cells,
  scopeLabel,
  basePath,
  lastFullYear,
}: {
  regions: RankingRegion[];
  cells: ChildYearRow[];
  /** e.g. "im Landkreis Würzburg" — caption of the floating row. */
  scopeLabel: string;
  basePath: string;
  lastFullYear: number;
}) {
  const [owner, setOwner] = useState<Owner>("alle");
  const [sort, setSort] = useState<Metric>("perCapita");
  const [rankMode, setRankMode] = useState<RankMode>("platz");
  const [zubauYear, setZubauYear] = useState(lastFullYear);
  const { home, setHome, ready } = useHomeGemeinde();
  const homeRowRef = useRef<HTMLDivElement | null>(null);
  const [homeVisible, setHomeVisible] = useState(true);
  // The floating row lives outside the horizontal scroller (see below) and has to
  // be shifted by hand to stay under the columns it belongs to.
  const [scrollLeft, setScrollLeft] = useState(0);

  const years = useMemo(
    () => Array.from(new Set(cells.map((c) => c.year))).sort((a, b) => b - a),
    [cells],
  );

  /** Aggregate the cells into rows; yearMax rewinds the state to that year. */
  const build = useMemo(() => {
    const keep = (segment: string) =>
      owner === "alle" ? SEGMENT_OWNER[segment] !== null : SEGMENT_OWNER[segment] === owner;
    return (yearMax: number | null): Row[] => {
      const acc = new Map<string, { count: number; kwp: number; speicher: number; zubau: number }>();
      for (const c of cells) {
        if (!keep(c.segment)) continue;
        if (yearMax !== null && c.year > yearMax) continue;
        const a = acc.get(c.region_id) ?? { count: 0, kwp: 0, speicher: 0, zubau: 0 };
        if (c.segment.startsWith("batterie")) {
          a.speicher += c.kwh;
        } else {
          a.count += c.count;
          a.kwp += c.kwp;
          if (c.year === zubauYear) a.zubau += c.count;
        }
        acc.set(c.region_id, a);
      }
      return regions.map((r) => {
        const a = acc.get(r.region_id) ?? { count: 0, kwp: 0, speicher: 0, zubau: 0 };
        return {
          region_id: r.region_id,
          name: r.name,
          href: r.slug ? `${basePath}/${r.slug}` : null,
          population: r.population,
          count: a.count,
          kwp: a.kwp,
          speicher: a.speicher,
          zubau: a.zubau,
          perCapita: r.population ? Math.round((a.kwp * 1000) / r.population) : null,
        };
      });
    };
  }, [cells, regions, basePath, owner, zubauYear]);

  const rows = useMemo(() => build(null), [build]);

  // Ranks now against ranks at the end of the year before last. The difference is
  // the movement during the last complete year; the running year is excluded from
  // both sides, or every Gemeinde would appear to collapse each January.
  const deltas = useMemo(() => {
    const rank = (list: Row[]) => {
      const m = new Map<string, number>();
      list
        .filter((r) => valueOf(r, sort) !== null)
        .sort((a, b) => (valueOf(b, sort) as number) - (valueOf(a, sort) as number))
        .forEach((r, i) => m.set(r.region_id, i + 1));
      return m;
    };
    const now = rank(rows);
    const before = rank(build(lastFullYear - 1));
    const out = new Map<string, number | null>();
    for (const r of rows) {
      const a = before.get(r.region_id);
      const b = now.get(r.region_id);
      out.set(r.region_id, a != null && b != null ? a - b : null);
    }
    return out;
  }, [rows, build, sort, lastFullYear]);

  const sorted = useMemo(() => {
    const withVal = rows.filter((r) => valueOf(r, sort) !== null);
    const without = rows.filter((r) => valueOf(r, sort) === null);
    withVal.sort((a, b) => (valueOf(b, sort) as number) - (valueOf(a, sort) as number));
    return [...withVal, ...without];
  }, [rows, sort]);

  /** Position always comes from the metric sort, even when the list is ordered by movement. */
  const rankOf = useMemo(() => {
    const m = new Map<string, number>();
    sorted.forEach((r, i) => m.set(r.region_id, i + 1));
    return m;
  }, [sorted]);

  const display = useMemo(() => {
    if (rankMode !== "delta") return sorted;
    return [...sorted].sort((a, b) => (deltas.get(b.region_id) ?? -Infinity) - (deltas.get(a.region_id) ?? -Infinity));
  }, [sorted, rankMode, deltas]);

  const homeRow = home ? display.find((r) => r.region_id === home.region_id) ?? null : null;

  useEffect(() => {
    const el = homeRowRef.current;
    if (!el) {
      setHomeVisible(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setHomeVisible(entry.isIntersecting), {
      rootMargin: "-40px 0px -80px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [homeRow?.region_id, sort, owner, rankMode]);

  // One scale for the list and the floating row, capped at the runner-up: a single
  // Gemeinde with a solar park (126.865 W/head against 17.705 on second place)
  // would otherwise flatten every other bar to a hairline.
  const scale = useMemo(() => {
    const vals = display
      .map((r) => valueOf(r, sort))
      .filter((x): x is number => x !== null)
      .sort((a, b) => b - a);
    return Math.max(1, vals[1] ?? vals[0] ?? 1);
  }, [display, sort]);
  const barPct = (val: number | null) =>
    val === null ? 0 : Math.min(100, Math.max(1, Math.round((val / scale) * 100)));

  const cellStyle = (key: Metric): React.CSSProperties => ({
    ...S.val,
    color: sort === key ? v("--color-text-primary") : v("--color-text-muted"),
    fontWeight: sort === key ? 600 : 400,
  });

  return (
    <div>
      <div style={S.controls}>
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
        <YearPicker years={years} value={zubauYear} onChange={setZubauYear} />
      </div>

      <div style={S.scroller} onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}>
        <div style={S.table}>
          {/* Header: every column sorts, the first also picks what it shows. */}
          <div style={{ ...S.row, ...S.header }}>
            <RankHeader mode={rankMode} onChange={setRankMode} />
            <span style={S.headName}>Gemeinde</span>
            <span />
            {COLUMNS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setSort(c.key)}
                style={{
                  ...S.headBtn,
                  color: sort === c.key ? v("--color-accent") : v("--color-text-muted"),
                  fontWeight: sort === c.key ? 700 : 600,
                }}
              >
                {c.key === "zubau" ? `Zubau ${zubauYear}` : c.label}
              </button>
            ))}
          </div>

          <div>
            {display.map((r) => {
              const isHome = home?.region_id === r.region_id;
              const val = valueOf(r, sort);
              return (
                <div
                  key={r.region_id}
                  ref={isHome ? homeRowRef : undefined}
                  style={{ ...S.row, ...(isHome ? S.rowHome : null) }}
                >
                  <span style={S.rank}>
                    {val === null ? "—" : `${rankOf.get(r.region_id)}.`}
                    <RankDelta value={deltas.get(r.region_id) ?? null} />
                  </span>
                  <span style={S.nameCell}>
                    {r.href ? (
                      <Link href={r.href} style={{ ...S.name, fontWeight: isHome ? 700 : 500 }}>
                        {r.name}
                      </Link>
                    ) : (
                      <span style={S.name}>{r.name}</span>
                    )}
                    {r.population === null && <span style={S.hint}>unbewohnt</span>}
                  </span>
                  <span style={S.barCell}>
                    <span style={S.track}>
                      <span
                        style={{
                          ...S.fill,
                          width: `${barPct(val)}%`,
                          background: isHome ? v("--color-accent") : v("--color-accent-light"),
                        }}
                      />
                    </span>
                  </span>
                  {COLUMNS.map((c) => (
                    <span key={c.key} style={cellStyle(c.key)}>
                      {fmtCell(r, c.key)}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/*
        Outside the scroller on purpose. A parent with overflow-x: auto becomes the
        containing block for position: sticky, and since that scroller is only as
        tall as its content, "bottom: 10" inside it never fires — the row simply
        stopped floating. Out here it sticks to the viewport again; the horizontal
        offset is applied by hand so it still lines up with the columns.
      */}
      {ready && homeRow && !homeVisible && (
        <div style={S.stickyWrap}>
          <div style={{ ...S.table, transform: `translateX(${-scrollLeft}px)` }}>
            <div style={{ ...S.row, ...S.stickyRow }}>
              <span style={S.rank}>
                {rankOf.get(homeRow.region_id) ?? "—"}.
                <RankDelta value={deltas.get(homeRow.region_id) ?? null} />
              </span>
              <span style={S.nameCell}>
                <span style={{ ...S.name, fontWeight: 700 }}>{homeRow.name}</span>
                <span style={S.stickyScope}>{scopeLabel}</span>
              </span>
              <span style={S.barCell}>
                <span style={S.track}>
                  <span
                    style={{ ...S.fill, width: `${barPct(valueOf(homeRow, sort))}%`, background: v("--color-accent") }}
                  />
                </span>
              </span>
              {COLUMNS.map((c) => (
                <span key={c.key} style={cellStyle(c.key)}>
                  {fmtCell(homeRow, c.key)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {ready && !home && <HomePicker onPick={(hit, plz) => setHome({ ...hit, plz })} />}
      {ready && home && (
        <p style={S.note}>
          {homeRow ? (
            <>
              Hervorgehoben: <strong>{home.name}</strong>
            </>
          ) : (
            <>
              <strong>{home.name}</strong> liegt nicht in dieser Liste.{" "}
              <Link href={home.path} style={S.link}>
                Zur Seite von {home.name}
              </Link>
            </>
          )}{" "}
          ·{" "}
          <button type="button" onClick={() => setHome(null)} style={S.linkBtn}>
            andere Gemeinde
          </button>
        </p>
      )}
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

function RankHeader({ mode, onChange }: { mode: RankMode; onChange: (m: RankMode) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(!open)} style={S.headBtnLeft}>
        {mode === "platz" ? "Platz" : "Veränd."}
        <IconChevronDown size={7} />
      </button>
      {open && (
        <div style={S.dropdown}>
          {(
            [
              ["platz", "Platzierung"],
              ["delta", "Veränderung"],
            ] as [RankMode, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                onChange(k);
                setOpen(false);
              }}
              style={{ ...S.dropItem, fontWeight: mode === k ? 700 : 400 }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function YearPicker({ years, value, onChange }: { years: number[]; value: number; onChange: (y: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const idx = years.indexOf(value);
  return (
    <div style={S.yearBar}>
      <button
        type="button"
        onClick={() => idx < years.length - 1 && onChange(years[idx + 1])}
        disabled={idx >= years.length - 1}
        style={{ ...S.yearBtn, borderRadius: "8px 0 0 8px", borderRight: "none", opacity: idx >= years.length - 1 ? 0.4 : 1 }}
        title="Früheres Jahr"
      >
        <IconChevronLeft size={9} />
      </button>
      <div ref={ref} style={{ position: "relative", display: "flex" }}>
        <button type="button" onClick={() => setOpen(!open)} style={{ ...S.yearBtn, borderRadius: 0, gap: 4, minWidth: 62 }}>
          Zubau {value}
          <IconChevronDown size={7} />
        </button>
        {open && (
          <div style={{ ...S.dropdown, right: 0, left: "auto", maxHeight: 200, overflowY: "auto" }}>
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => {
                  onChange(y);
                  setOpen(false);
                }}
                style={{ ...S.dropItem, fontWeight: y === value ? 700 : 400 }}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => idx > 0 && onChange(years[idx - 1])}
        disabled={idx <= 0}
        style={{ ...S.yearBtn, borderRadius: "0 8px 8px 0", borderLeft: "none", opacity: idx <= 0 ? 0.4 : 1 }}
        title="Späteres Jahr"
      >
        <IconChevronRight size={9} />
      </button>
    </div>
  );
}

function HomePicker({ onPick }: { onPick: (hit: GemeindeHit, plz: string) => void }) {
  const [plz, setPlz] = useState("");
  const [hits, setHits] = useState<GemeindeHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const found = await lookupPlz(plz);
      // One postcode can cover several Gemeinden — ask instead of guessing.
      if (found.length === 1) onPick(found[0], plz);
      else setHits(found);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={S.picker}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <label htmlFor="home-plz" style={S.pickerLabel}>
          Ihre Postleitzahl markiert Ihre Gemeinde in jeder Liste
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            id="home-plz"
            value={plz}
            onChange={(e) => setPlz(e.target.value.replace(/\D/g, "").slice(0, 5))}
            inputMode="numeric"
            placeholder="z. B. 97204"
            style={S.input}
          />
          <button type="submit" disabled={plz.length !== 5 || busy} style={S.submit}>
            {busy ? "…" : "Merken"}
          </button>
        </div>
      </form>
      {error && <p style={S.error}>{error}</p>}
      {hits && hits.length > 1 && (
        <div style={{ marginTop: 10 }}>
          <p style={S.pickerLabel}>Diese Postleitzahl deckt mehrere Gemeinden ab:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {hits.map((h) => (
              <button key={h.region_id} type="button" onClick={() => onPick(h, plz)} style={S.hitBtn}>
                {h.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Rank · name · bar · one cell per column. Header, rows and floating row share it. */
const GRID = "62px minmax(120px,1fr) minmax(44px,64px) repeat(5, minmax(56px, 76px))";

const S: Record<string, React.CSSProperties> = {
  controls: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 },
  chips: { display: "flex", gap: 4 },
  chip: {
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 999,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  // Eight columns do not fit a phone. Scroll the table, never the page.
  scroller: { overflowX: "auto", margin: "0 -8px", padding: "0 8px" },
  table: { minWidth: 620 },
  row: {
    display: "grid",
    gridTemplateColumns: GRID,
    alignItems: "center",
    gap: 8,
    padding: "7px 8px",
    margin: "0 -8px",
    borderBottom: `1px solid ${v("--color-border-muted")}`,
    fontSize: 13,
  },
  header: { borderBottom: `1px solid ${v("--color-border")}`, paddingBottom: 6, marginBottom: 2 },
  headName: { fontSize: 11, color: v("--color-text-muted"), fontWeight: 600 },
  headBtn: { background: "none", border: "none", padding: 0, fontFamily: "inherit", fontSize: 11, textAlign: "right", cursor: "pointer" },
  headBtnLeft: {
    background: "none",
    border: "none",
    padding: 0,
    fontFamily: "inherit",
    fontSize: 11,
    fontWeight: 600,
    color: v("--color-text-muted"),
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
  },
  rowHome: { background: v("--color-bg-accent"), borderRadius: v("--radius-md") },
  rank: { fontFamily: v("--font-mono"), fontSize: 12, color: v("--color-text-muted"), display: "flex", alignItems: "center", gap: 4 },
  delta: { fontFamily: v("--font-mono"), fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 1 },
  nameCell: { display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 },
  name: { color: v("--color-text-primary"), textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  hint: { fontSize: 10, color: v("--color-text-muted") },
  barCell: { display: "block" },
  track: { display: "block", height: 6, background: v("--color-bg-muted"), borderRadius: 3 },
  fill: { display: "block", height: "100%", borderRadius: 3 },
  val: { fontFamily: v("--font-mono"), fontSize: 11, textAlign: "right", whiteSpace: "nowrap" },
  stickyWrap: {
    position: "sticky",
    bottom: 10,
    marginTop: 10,
    overflow: "hidden",
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border-accent")}`,
    borderRadius: v("--radius-md"),
    boxShadow: "0 4px 14px rgba(0,0,0,0.10)",
  },
  stickyRow: { borderBottom: "none", margin: 0 },
  stickyScope: { fontSize: 10, color: v("--color-text-muted"), fontWeight: 400 },
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
    minWidth: 110,
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
  yearBar: { display: "flex", alignItems: "stretch" },
  yearBtn: {
    border: `1px solid ${v("--color-border")}`,
    background: v("--color-bg"),
    color: v("--color-text-primary"),
    fontFamily: v("--font-mono"),
    fontSize: 12,
    padding: "5px 8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  picker: { marginTop: 16, padding: "12px 14px", background: v("--color-bg-muted"), borderRadius: v("--radius-md") },
  pickerLabel: { fontSize: 12, color: v("--color-text-secondary"), margin: 0 },
  input: {
    flex: "0 0 110px",
    padding: "8px 10px",
    fontSize: 16,
    fontFamily: v("--font-mono"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    background: v("--color-bg"),
    color: v("--color-text-primary"),
  },
  submit: {
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
    border: "none",
    borderRadius: v("--radius-md"),
    background: v("--color-accent"),
    color: v("--color-text-on-accent"),
    cursor: "pointer",
  },
  hitBtn: {
    padding: "6px 10px",
    fontSize: 12,
    fontFamily: "inherit",
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    background: v("--color-bg"),
    color: v("--color-text-primary"),
    cursor: "pointer",
  },
  error: { fontSize: 12, color: v("--color-negative"), margin: "8px 0 0" },
  note: { fontSize: 12, color: v("--color-text-muted"), margin: "12px 0 0" },
  link: { color: v("--color-accent"), textDecoration: "none" },
  linkBtn: {
    background: "none",
    border: "none",
    padding: 0,
    font: "inherit",
    fontSize: 12,
    color: v("--color-accent"),
    cursor: "pointer",
    textDecoration: "underline",
  },
};
