"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { v } from "../../lib/theme";
import { useHomeGemeinde, lookupPlz, type GemeindeHit } from "../../lib/home-gemeinde";

export type RankingRow = {
  region_id: string;
  name: string;
  href: string | null;
  population: number | null;
  count: number;
  kwp: number;
  wPerCapita: number | null;
  wPerCapitaDach: number | null;
  countRecent: number;
  /** Places gained since the end of the year before last; positive = moved up. */
  rankDelta: number | null;
  rankDachDelta: number | null;
};

type SortKey = "wPerCapita" | "wPerCapitaDach" | "count" | "kwp" | "countRecent";

const COLUMNS: { key: SortKey; label: string; short: string }[] = [
  { key: "count", label: "Anlagen", short: "Anlagen" },
  { key: "kwp", label: "Leistung", short: "Leistung" },
  { key: "wPerCapita", label: "W/Kopf gesamt", short: "W/Kopf" },
  { key: "wPerCapitaDach", label: "W/Kopf Dach", short: "Dach" },
  { key: "countRecent", label: "Neu im Vorjahr", short: "Neu" },
];

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

/**
 * Rank change for the metric currently sorted by. Only the two per-capita columns
 * have a historical ranking to compare against — sorting by plant count or
 * capacity shows no delta rather than a made-up one.
 */
function deltaFor(row: RankingRow, sort: SortKey): number | null {
  if (sort === "wPerCapita") return row.rankDelta;
  if (sort === "wPerCapitaDach") return row.rankDachDelta;
  return null;
}

function RankDelta({ value }: { value: number | null }) {
  if (value === null || value === 0) return null;
  const up = value > 0;
  return (
    <span
      title={`${Math.abs(value)} ${Math.abs(value) === 1 ? "Platz" : "Plätze"} ${up ? "gutgemacht" : "verloren"} im letzten vollen Jahr`}
      style={{
        fontFamily: v("--font-mono"),
        fontSize: 10,
        fontWeight: 700,
        color: up ? v("--color-positive") : v("--color-negative"),
        whiteSpace: "nowrap",
      }}
    >
      {up ? "▲" : "▼"}
      {Math.abs(value)}
    </span>
  );
}

function fmtLeistung(kwp: number): string {
  if (kwp >= 1000) return `${(kwp / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MW`;
  return `${nf(kwp)} kW`;
}

function cell(row: RankingRow, key: SortKey): string {
  const val = row[key];
  if (val === null) return "—";
  if (key === "kwp") return fmtLeistung(val);
  if (key === "wPerCapita" || key === "wPerCapitaDach") return `${nf(val)} W`;
  return nf(val);
}

/**
 * Sortable ranking of a region's children.
 *
 * The user's home Gemeinde floats along the bottom edge while it is off-screen
 * and drops back into the list once its real row scrolls into view — so "where do
 * we stand?" is answerable without hunting through 52 rows, and the answer sits
 * next to the leaders it is being compared against.
 */
export default function RankingTable({
  rows,
  scopeLabel,
}: {
  rows: RankingRow[];
  /** e.g. "im Landkreis Würzburg" — used in the sticky row's caption. */
  scopeLabel: string;
}) {
  const [sort, setSort] = useState<SortKey>("wPerCapita");
  const { home, setHome, ready } = useHomeGemeinde();
  const homeRowRef = useRef<HTMLDivElement | null>(null);
  const [homeVisible, setHomeVisible] = useState(true);

  const sorted = useMemo(() => {
    const withVal = rows.filter((r) => r[sort] !== null);
    const without = rows.filter((r) => r[sort] === null);
    withVal.sort((a, b) => (b[sort] as number) - (a[sort] as number));
    return [...withVal, ...without];
  }, [rows, sort]);

  const homeIndex = home ? sorted.findIndex((r) => r.region_id === home.region_id) : -1;
  const homeRow = homeIndex >= 0 ? sorted[homeIndex] : null;

  // One scale for the list and the floating row. Capped at the runner-up: a
  // single Gemeinde with a solar park (Riedenheim: 126.865 W/head against a
  // second place of 17.705) would otherwise flatten every other bar to nothing.
  const scale = useMemo(() => {
    const vals = sorted.map((r) => r[sort]).filter((x): x is number => x !== null);
    return Math.max(1, vals[1] ?? vals[0] ?? 1);
  }, [sorted, sort]);
  const barPct = (val: number | null) =>
    val === null ? 0 : Math.min(100, Math.max(1, Math.round((val / scale) * 100)));
  const stickyPct = barPct(homeRow ? homeRow[sort] : null);

  // Float the home row only while its real position is off-screen.
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
  }, [homeRow?.region_id, sort]);

  return (
    <div>
      <div style={S.tabs}>
        {COLUMNS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setSort(c.key)}
            style={{
              ...S.tab,
              background: sort === c.key ? v("--color-accent") : "transparent",
              color: sort === c.key ? v("--color-text-on-accent") : v("--color-text-secondary"),
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div style={S.list}>
        {sorted.map((r, i) => {
          const isHome = home?.region_id === r.region_id;
          const val = r[sort];
          const pct = barPct(val);
          return (
            <div
              key={r.region_id}
              ref={isHome ? homeRowRef : undefined}
              style={{ ...S.row, ...(isHome ? S.rowHome : null) }}
            >
              <span style={S.rank}>
                {val === null ? "—" : `${i + 1}.`}
                <RankDelta value={deltaFor(r, sort)} />
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
                      width: `${pct}%`,
                      background: isHome ? v("--color-accent") : v("--color-accent-light"),
                    }}
                  />
                </span>
              </span>
              <span style={S.val}>{cell(r, sort)}</span>
            </div>
          );
        })}
      </div>

      {ready && homeRow && !homeVisible && (
        <div style={S.sticky}>
          <span style={S.rank}>
            {homeIndex + 1}.
            <RankDelta value={deltaFor(homeRow, sort)} />
          </span>
          <span style={{ ...S.nameCell, fontWeight: 700 }}>
            {homeRow.name}
            <span style={S.stickyScope}>Ihre Gemeinde {scopeLabel}</span>
          </span>
          {/* Same bar and scale as the list, so the floating row reads as the row
              it stands in for — not as a separate summary. */}
          <span style={S.barCell}>
            <span style={S.track}>
              <span
                style={{
                  ...S.fill,
                  width: `${stickyPct}%`,
                  background: v("--color-accent"),
                }}
              />
            </span>
          </span>
          <span style={S.val}>{cell(homeRow, sort)}</span>
        </div>
      )}

      {ready && !home && <HomePicker onPick={(hit, plz) => setHome({ ...hit, plz })} />}
      {ready && home && homeIndex < 0 && (
        <p style={S.note}>
          Ihre Gemeinde <strong>{home.name}</strong> liegt nicht in dieser Liste.{" "}
          <Link href={home.path} style={S.link}>
            Zur Seite von {home.name}
          </Link>{" "}
          ·{" "}
          <button type="button" onClick={() => setHome(null)} style={S.linkBtn}>
            ändern
          </button>
        </p>
      )}
      {ready && home && homeIndex >= 0 && (
        <p style={S.note}>
          Hervorgehoben: <strong>{home.name}</strong> ·{" "}
          <button type="button" onClick={() => setHome(null)} style={S.linkBtn}>
            andere Gemeinde wählen
          </button>
        </p>
      )}
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
      <form onSubmit={submit} style={S.pickerForm}>
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

const S: Record<string, React.CSSProperties> = {
  tabs: { display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 },
  tab: {
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 999,
    padding: "5px 11px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  list: { display: "flex", flexDirection: "column" },
  row: {
    display: "grid",
    gridTemplateColumns: "52px minmax(0,1fr) minmax(60px,90px) 88px",
    alignItems: "center",
    gap: 8,
    padding: "7px 8px",
    margin: "0 -8px",
    borderBottom: `1px solid ${v("--color-border-muted")}`,
    fontSize: 13,
  },
  rowHome: { background: v("--color-bg-accent"), borderRadius: v("--radius-md") },
  rank: { fontFamily: v("--font-mono"), fontSize: 12, color: v("--color-text-muted"), display: "flex", alignItems: "baseline", gap: 3 },
  nameCell: { display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 },
  name: { color: v("--color-text-primary"), textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  hint: { fontSize: 10, color: v("--color-text-muted") },
  barCell: { display: "block" },
  track: { display: "block", height: 6, background: v("--color-bg-muted"), borderRadius: 3 },
  fill: { display: "block", height: "100%", borderRadius: 3 },
  val: { fontFamily: v("--font-mono"), fontSize: 12, textAlign: "right", whiteSpace: "nowrap" },
  sticky: {
    position: "sticky",
    bottom: 12,
    display: "grid",
    gridTemplateColumns: "52px minmax(0,1fr) minmax(60px,90px) 88px",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    marginTop: 10,
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border-accent")}`,
    borderRadius: v("--radius-md"),
    boxShadow: "0 4px 14px rgba(0,0,0,0.10)",
    fontSize: 13,
  },
  stickyScope: { fontSize: 10, color: v("--color-text-muted"), fontWeight: 400, marginLeft: 6 },
  picker: {
    marginTop: 16,
    padding: "12px 14px",
    background: v("--color-bg-muted"),
    borderRadius: v("--radius-md"),
  },
  pickerForm: { display: "flex", flexDirection: "column", gap: 7 },
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
