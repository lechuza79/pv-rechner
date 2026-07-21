"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { v } from "../../lib/theme";
import { IconArrowUp, IconArrowDown, IconChevronDown, IconArrowRight } from "../Icons";
import { useHomeGemeinde, lookupPlz, type GemeindeHit } from "../../lib/home-gemeinde";
import { SEGMENT_OWNER, type ChildYearRow, type RankingRegion } from "../../lib/atlas";
import { fmtPvLeistung, fmtSpeicherKwh, fmtWattProKopf } from "../../lib/atlas-format";

type Owner = "alle" | "privat" | "gewerbe";
type Metric = "count" | "kwp" | "perCapita" | "speicher";
/** Sort key: a numeric metric column (descending), the name column (A–Z), or
 *  population (descending). Name and population share the name-column dropdown. */
type Sort = Metric | "name" | "population";
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
};

const COLUMNS: { key: Metric; label: string; hint: string }[] = [
  {
    key: "count",
    label: "Anlagen",
    hint: "Zahl der Solaranlagen in Betrieb. Ein Balkonkraftwerk zählt wie eine Dachanlage — die Zahl sagt, wie viele mitmachen, nicht wie viel Leistung steht.",
  },
  {
    key: "kwp",
    label: "Leistung",
    hint: "Installierte Spitzenleistung aller Solaranlagen zusammen. Ein Einfamilienhaus liegt typisch bei 10 kWp, ein Freiflächen-Park bei mehreren Tausend.",
  },
  {
    key: "perCapita",
    label: "Pro Kopf",
    hint: "Installierte Leistung geteilt durch die Einwohnerzahl. Macht große und kleine Gemeinden vergleichbar — Gemeinden mit viel Freifläche liegen hier zwangsläufig vorn.",
  },
  {
    key: "speicher",
    label: "Batteriespeicher",
    hint: "Nutzbare Kapazität der Batteriespeicher, nicht ihre Leistung. Eine Hausbatterie hält typisch 5 bis 15 kWh. Pumpspeicherwerke sind nicht enthalten.",
  },
];

const OWNERS: { key: Owner; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "privat", label: "Privat" },
  { key: "gewerbe", label: "Gewerbe" },
];

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

/** Write (or clear) ?plz on the current URL without a navigation, so the address
 *  bar stays a shareable deep-link to the marked Gemeinde. */
function setUrlPlz(plz: string | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (plz) url.searchParams.set("plz", plz);
  else url.searchParams.delete("plz");
  window.history.replaceState(null, "", url.toString());
}


const fmtLeistung = fmtPvLeistung;
const fmtSpeicher = fmtSpeicherKwh;

function fmtCell(row: Row, m: Metric): string {
  if (m === "kwp") return fmtLeistung(row.kwp);
  if (m === "speicher") return fmtSpeicher(row.speicher);
  if (m === "perCapita") return row.perCapita === null ? "—" : fmtWattProKopf(row.perCapita);
  return nf(row[m] as number);
}

/** Small inhabitant count shown behind the name. Bundesländer carry millions —
 *  shorten those to "17,9 Mio."; Kreise and Gemeinden stay whole numbers. */
function fmtPop(pop: number, inMillions: boolean): string {
  if (inMillions) return `${(pop / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Mio.`;
  return nf(pop);
}

function valueOf(row: Row, m: Sort): number | null {
  if (m === "name") return null;
  if (m === "perCapita") return row.perCapita;
  if (m === "population") return row.population;
  return row[m] as number;
}

/** Rank movement, sized to sit inline with the rank number beside it. */
function RankDelta({ value, sinceYear }: { value: number | null; sinceYear: number }) {
  if (value === null || value === 0) return null;
  const up = value > 0;
  const Icon = up ? IconArrowUp : IconArrowDown;
  return (
    <span
      title={`${Math.abs(value)} ${Math.abs(value) === 1 ? "Platz" : "Plätze"} ${up ? "gutgemacht" : "verloren"} seit Ende ${sinceYear}`}
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
 * Every filter runs on the raw segment × year cells the server shipped, so owner
 * and metric recombine without a round trip. The owner filter applies to every
 * column at once — a table where "Anlagen" counted everything while "Pro Kopf"
 * counted only private roofs would put two different worlds in one row.
 */
export default function RankingTable({
  regions,
  cells,
  basePath,
  lastFullYear,
  popInMillions = false,
}: {
  regions: RankingRegion[];
  cells: ChildYearRow[];
  basePath: string;
  lastFullYear: number;
  /** Bundesländer carry millions of inhabitants — show the Einwohner column in
   *  millions there (unit in the header, plain number in the cell). Kreise and
   *  Gemeinden stay whole numbers. */
  popInMillions?: boolean;
}) {
  const [owner, setOwner] = useState<Owner>("alle");
  const [sort, setSort] = useState<Sort>("perCapita");
  const [rankMode, setRankMode] = useState<RankMode>("platz");
  const { home, setHome, ready } = useHomeGemeinde();
  // A shared link can mark a Gemeinde via ?plz=. Resolved on the client (like the
  // saved-home marker already is) so the page itself stays ISR-cached — reading
  // searchParams on the server would force every atlas view to render fresh.
  const [pinnedChildId, setPinnedChildId] = useState<string | null>(null);
  // "andere Gemeinde" has to be able to drop a pin that came in through the URL,
  // not just the saved home — so the pin is dismissable in local state.
  const [pinDismissed, setPinDismissed] = useState(false);
  // The floating row lives outside the horizontal scroller (see below) and has to
  // be shifted by hand to stay under the columns it belongs to.
  const [scrollLeft, setScrollLeft] = useState(0);

  // Resolve ?plz= to the child region it belongs to. A postcode can span several
  // Gemeinden; the one that appears in this very list is the right match, so the
  // list membership is the scope — no separate Kreis filter needed.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const plz = new URLSearchParams(window.location.search).get("plz") ?? "";
    if (!/^\d{5}$/.test(plz)) {
      setPinnedChildId(null);
      return;
    }
    const childLen = regions[0]?.region_id.length ?? 8;
    const ids = new Set(regions.map((r) => r.region_id));
    let cancelled = false;
    lookupPlz(plz)
      .then((hits) => {
        if (cancelled) return;
        const match = hits.map((h) => h.region_id.slice(0, childLen)).find((id) => ids.has(id));
        setPinnedChildId(match ?? null);
      })
      .catch(() => {
        if (!cancelled) setPinnedChildId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [regions]);

  /** Aggregate the cells into rows; yearMax rewinds the state to that year. */
  const build = useMemo(() => {
    const keep = (segment: string) =>
      owner === "alle" ? SEGMENT_OWNER[segment] !== null : SEGMENT_OWNER[segment] === owner;
    return (yearMax: number | null): Row[] => {
      const acc = new Map<string, { count: number; kwp: number; speicher: number }>();
      for (const c of cells) {
        if (!keep(c.segment)) continue;
        if (yearMax !== null && c.year > yearMax) continue;
        const a = acc.get(c.region_id) ?? { count: 0, kwp: 0, speicher: 0 };
        if (c.segment.startsWith("batterie")) {
          a.speicher += c.kwh;
        } else {
          a.count += c.count;
          a.kwp += c.kwp;
        }
        acc.set(c.region_id, a);
      }
      return regions.map((r) => {
        const a = acc.get(r.region_id) ?? { count: 0, kwp: 0, speicher: 0 };
        return {
          region_id: r.region_id,
          name: r.name,
          href: r.slug ? `${basePath}/${r.slug}` : null,
          population: r.population,
          count: a.count,
          kwp: a.kwp,
          speicher: a.speicher,
          perCapita: r.population ? Math.round((a.kwp * 1000) / r.population) : null,
        };
      });
    };
  }, [cells, regions, basePath, owner]);

  const rows = useMemo(() => build(null), [build]);

  // Current rank against the rank at the end of the last complete year. Naming
  // this "Veränderung zum Vorjahr" would be a lie: it spans that year-end to
  // today, which in July is seven months, not twelve. The header says what it is.
  const deltas = useMemo(() => {
    // Rank movement is only meaningful for the growth metrics. Alphabetical order
    // has no "rank", and population barely moves year to year — no delta there.
    if (sort === "name" || sort === "population") return new Map<string, number | null>();
    const rank = (list: Row[]) => {
      const m = new Map<string, number>();
      list
        .filter((r) => valueOf(r, sort) !== null)
        .sort((a, b) => (valueOf(b, sort) as number) - (valueOf(a, sort) as number))
        .forEach((r, i) => m.set(r.region_id, i + 1));
      return m;
    };
    const now = rank(rows);
    const before = rank(build(lastFullYear));
    const out = new Map<string, number | null>();
    for (const r of rows) {
      const a = before.get(r.region_id);
      const b = now.get(r.region_id);
      out.set(r.region_id, a != null && b != null ? a - b : null);
    }
    return out;
  }, [rows, build, sort, lastFullYear]);

  const sorted = useMemo(() => {
    if (sort === "name") return [...rows].sort((a, b) => a.name.localeCompare(b.name, "de"));
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

  // The children of this region carry keys at one fixed length (5 for Kreise under
  // a Bundesland, 8 for Gemeinden under a Kreis). A saved home is always an 8-digit
  // Gemeinde, so it has to be cut to the child length to match the right row — on a
  // Bundesland page it marks the Kreis the home sits in.
  const childLen = regions[0]?.region_id.length ?? 8;
  const effectivePin = pinDismissed ? null : pinnedChildId;
  const markedId = effectivePin ?? (home ? home.region_id.slice(0, childLen) : null);
  const markedRow = markedId ? display.find((r) => r.region_id === markedId) ?? null : null;

  // Keep the address bar in step with what is marked, so the link the viewer sees
  // is the link they can share. Never overwrite a ?plz that is already there: a
  // shared link owns the URL (and its pin may still be resolving), and once the
  // user enters their own postcode that write already happened. Only a bare URL
  // gets the saved home's postcode injected, once its row is on this page.
  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).has("plz")) return;
    if (home?.plz && markedRow) setUrlPlz(home.plz);
  }, [ready, home, markedRow]);

  // Die schwebende Zeile rastet an der echten ein: sobald die markierte Zeile
  // selbst im Blick ist, blenden wir die schwebende aus (kein Doppel).
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [realRowVisible, setRealRowVisible] = useState(false);
  useEffect(() => {
    if (!markedId) {
      setRealRowVisible(false);
      return;
    }
    const el = rootRef.current?.querySelector('[data-marked="true"]');
    if (!el) {
      setRealRowVisible(false);
      return;
    }
    const obs = new IntersectionObserver(([e]) => setRealRowVisible(e.isIntersecting), { threshold: 0.9 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [markedId, sort, owner, rankMode, display]);

  const pick = (hit: GemeindeHit, plz: string) => {
    setHome({ ...hit, plz });
    // The viewer just chose their own Gemeinde — the link's pin is stale (its
    // prop can't change without a navigation), so keep it dismissed and let the
    // fresh home drive the marker.
    setPinDismissed(true);
    setUrlPlz(plz);
  };

  const reset = () => {
    setHome(null);
    setPinDismissed(true);
    setUrlPlz(null);
  };

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
    <div ref={rootRef}>
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
      </div>

      <div style={S.scroller} onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}>
        <div style={S.table}>
          {/* Header: every column sorts, the first also picks what it shows. */}
          <div style={{ ...S.row, ...S.header }}>
            <RankHeader mode={rankMode} onChange={setRankMode} sinceYear={lastFullYear} />
            <NameHeader sort={sort} onChange={setSort} />
            {COLUMNS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setSort(c.key)}
                title={c.hint}
                style={{
                  ...S.headBtn,
                  color: sort === c.key ? v("--color-accent") : v("--color-text-muted"),
                  fontWeight: sort === c.key ? 700 : 600,
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Re-keyed on metric+filter so the rows fade in on a switch instead of
              snapping — the reorder and the value change land at once otherwise. */}
          <div key={`${sort}-${owner}-${rankMode}`} style={S.rowsFade}>
            {display.map((r, i) => {
              const isMarked = markedId === r.region_id;
              // Highlight-Zeile ohne Tabellenlinie oben und unten: diese Zeile UND
              // die darüber verlieren ihre Trennlinie, damit nichts durch den
              // Rahmen läuft.
              const nextMarked = markedId !== null && display[i + 1]?.region_id === markedId;
              const val = valueOf(r, sort);
              const inner = (
                <>
                  <span style={S.rank}>
                    {val === null ? "—" : `${rankOf.get(r.region_id)}.`}
                    <RankDelta value={deltas.get(r.region_id) ?? null} sinceYear={lastFullYear} />
                  </span>
                  <span style={S.nameCell}>
                    <span style={{ ...S.name, fontWeight: isMarked ? 700 : 500 }}>{r.name}</span>
                    <span style={S.hint}>
                      {r.population === null ? "unbewohnt" : fmtPop(r.population, popInMillions)}
                    </span>
                  </span>
                  {COLUMNS.map((c) => (
                    <span key={c.key} style={cellStyle(c.key)}>
                      <span>{fmtCell(r, c.key)}</span>
                      {c.key === sort && (
                        <span aria-hidden style={S.track}>
                          <span
                            style={{
                              ...S.fill,
                              width: `${barPct(val)}%`,
                              background: isMarked ? v("--color-accent") : v("--color-accent-light"),
                            }}
                          />
                        </span>
                      )}
                    </span>
                  ))}
                </>
              );
              const style = {
                ...S.row,
                ...(isMarked || nextMarked ? { borderBottom: "none" as const } : null),
                ...(isMarked ? S.rowHome : null),
              };
              const marker = isMarked ? { "data-marked": "true" } : {};
              // The whole row leads to the Gemeinde, not just its name — a 60px
              // link inside a 620px row is a target nobody hits on a phone.
              // Uninhabited areas have no page, so they stay a plain row.
              return r.href ? (
                <Link key={r.region_id} href={r.href} {...marker} className="atlas-rank-row" style={{ ...style, ...S.rowLink }}>
                  {inner}
                  <span className="atlas-go" style={S.go} aria-hidden>
                    <IconArrowRight size={13} />
                  </span>
                </Link>
              ) : (
                <div key={r.region_id} {...marker} style={style}>
                  {inner}
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
      {ready && markedRow && !realRowVisible && (
        <div style={S.stickyWrap}>
          {/* Keyed like the list, so the marked row's value fades to the new metric
              in step with it. The wrapper above stays mounted — it must not move. */}
          <div key={`${sort}-${owner}-${rankMode}`} style={{ ...S.table, ...S.rowsFade, transform: `translateX(${-scrollLeft}px)` }}>
            <Link href={markedRow.href ?? "#"} style={{ ...S.row, ...S.stickyRow, ...S.rowLink }}>
              <span style={S.rank}>
                {rankOf.get(markedRow.region_id) ?? "—"}.
                <RankDelta value={deltas.get(markedRow.region_id) ?? null} sinceYear={lastFullYear} />
              </span>
              <span style={S.nameCell}>
                <span style={{ ...S.name, fontWeight: 700 }}>{markedRow.name}</span>
                <span style={S.hint}>
                  {markedRow.population === null ? "unbewohnt" : fmtPop(markedRow.population, popInMillions)}
                </span>
              </span>
              {COLUMNS.map((c) => (
                <span key={c.key} style={cellStyle(c.key)}>
                  <span>{fmtCell(markedRow, c.key)}</span>
                  {c.key === sort && (
                    <span aria-hidden style={S.track}>
                      <span style={{ ...S.fill, width: `${barPct(valueOf(markedRow, sort))}%`, background: v("--color-accent") }} />
                    </span>
                  )}
                </span>
              ))}
            </Link>
          </div>
        </div>
      )}

      {/* PLZ-CTA sticht wie die aktive Kommune am unteren Rand — sobald eine
          Gemeinde gewählt ist, ersetzt die schwebende Kommunen-Zeile darüber diese
          Karte (sich gegenseitig ausschließende Bedingungen, gleicher Slot). */}
      {ready && !markedRow && !home && (
        <div style={S.stickyPicker}>
          <HomePicker onPick={pick} />
        </div>
      )}
      {ready && markedRow && (
        <p style={S.note}>
          Hervorgehoben: <strong>{markedRow.name}</strong>
          {effectivePin && !home && " (aus geteiltem Link)"} ·{" "}
          <button type="button" onClick={reset} style={S.linkBtn}>
            andere Gemeinde
          </button>
        </p>
      )}
      {ready && home && !markedRow && (
        <p style={S.note}>
          <strong>{home.name}</strong> liegt nicht in dieser Liste.{" "}
          <Link href={home.path} style={S.link}>
            Zur Seite von {home.name}
          </Link>{" "}
          ·{" "}
          <button type="button" onClick={reset} style={S.linkBtn}>
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

function RankHeader({ mode, onChange, sinceYear }: { mode: RankMode; onChange: (m: RankMode) => void; sinceYear: number }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={
          mode === "platz"
            ? "Platzierung nach der Spalte, nach der gerade sortiert wird."
            : `Gewonnene oder verlorene Plätze seit Ende ${sinceYear}. Das laufende Jahr ist noch unvollständig und daher nicht als Vorjahr gerechnet.`
        }
        style={S.headBtnLeft}
      >
        {mode === "platz" ? "Platz" : `Δ ${sinceYear}`}
        <IconChevronDown size={7} />
      </button>
      {open && (
        <div style={S.dropdown}>
          {(
            [
              ["platz", "Platzierung"],
              ["delta", `Veränderung seit Ende ${sinceYear}`],
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

/**
 * Name column header — a dropdown twin of RankHeader. It flips the sort between
 * alphabetical (A–Z) and by inhabitants: the two orderings that have no value
 * column of their own. "(Einwohner)" in the label names the small number shown
 * behind each place name.
 */
function NameHeader({ sort, onChange }: { sort: Sort; onChange: (s: Sort) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const active = sort === "name" || sort === "population";
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title="Sortieren: alphabetisch oder nach Einwohnerzahl"
        style={{
          ...S.headNameBtn,
          color: active ? v("--color-accent") : v("--color-text-muted"),
          fontWeight: active ? 700 : 600,
        }}
      >
        Name (Einwohner)
        <IconChevronDown size={7} />
      </button>
      {open && (
        <div style={S.dropdown}>
          {(
            [
              ["name", "Name (A–Z)"],
              ["population", "Einwohner"],
            ] as [Sort, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                onChange(k);
                setOpen(false);
              }}
              style={{ ...S.dropItem, fontWeight: sort === k ? 700 : 400 }}
            >
              {label}
            </button>
          ))}
        </div>
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
      <p style={S.pickerTitle}>Eigene Gemeinde eingeben</p>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <label htmlFor="home-plz" style={S.pickerLabel}>
          Postleitzahl eingeben — deine Gemeinde wird in dieser und jeder weiteren Liste markiert.
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

/**
 * Rank · name · one cell per column. Header, rows and floating row share it — the
 * floating row exists to be compared against the list, so its columns have to land
 * on the same pixels.
 */
const GRID = "58px minmax(120px,1fr) repeat(4, minmax(66px, 86px)) 14px";

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
  table: { minWidth: 500 },
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
  headNameBtn: {
    background: "none",
    border: "none",
    padding: 0,
    fontFamily: "inherit",
    fontSize: 11,
    textAlign: "left",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
  },
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
  rowHome: { background: v("--color-bg-accent"), borderRadius: v("--radius-md"), boxShadow: `inset 0 0 0 1.5px ${v("--color-accent")}` },
  rank: { fontFamily: v("--font-mono"), fontSize: 12, color: v("--color-text-muted"), display: "flex", alignItems: "center", gap: 4 },
  delta: { fontFamily: v("--font-mono"), fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 1 },
  nameCell: { display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 },
  name: { color: v("--color-text-primary"), textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  hint: { fontSize: 10, color: v("--color-text-muted") },
  // The bar sits under the number in the sorted column, not in a column of its
  // own: a header names a measure, and "the bar" is not one — it is that measure,
  // drawn.
  val: {
    fontFamily: v("--font-mono"),
    fontSize: 11,
    whiteSpace: "nowrap",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 3,
  },
  track: { display: "block", width: "100%", height: 4, background: v("--color-border"), borderRadius: 2 },
  // Links verankert → der Balken wächst nach rechts (kein marginLeft:auto mehr).
  fill: { display: "block", height: "100%", borderRadius: 2 },
  // Mirrors S.scroller's box exactly (same negative margin, same padding), so the
  // row inside starts on the same pixel as a row in the list. Getting this wrong
  // by 8px is what broke the alignment twice.
  rowsFade: { animation: "fu 0.28s ease-out" },
  stickyWrap: {
    position: "sticky",
    bottom: 4,
    margin: "10px -8px 0",
    // Vertical padding gives the row's shadow room; overflow: hidden would crop it
    // flat against the wrapper otherwise.
    padding: "6px 8px",
    overflow: "hidden",
  },
  // Same sticky-bottom slot as the marked-Gemeinde row: the PLZ-CTA floats here
  // until a Gemeinde is picked, then the marked row (rendered above) takes over.
  stickyPicker: { position: "sticky", bottom: 4, zIndex: 2 },
  stickyRow: {
    borderBottom: "none",
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border-accent")}`,
    borderRadius: v("--radius-md"),
    boxShadow: "0 4px 14px rgba(0,0,0,0.10)",
  },
  rowLink: { textDecoration: "none", color: "inherit", cursor: "pointer" },
  // Blauer „→" am Zeilenende, erst bei Hover sichtbar (Klickbarkeits-Affordanz).
  // Opacity/Slide-Transition steuert die globale CSS-Regel .atlas-rank-row (theme.ts),
  // weil Inline-Styles kein :hover können. Die 14px-Spur dafür steckt in GRID.
  go: { display: "flex", alignItems: "center", justifyContent: "flex-end", color: v("--color-accent") },
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
  picker: { marginTop: 16, padding: "14px 16px", background: v("--color-bg-accent"), border: `1px solid ${v("--color-border-accent")}`, borderRadius: v("--radius-md") },
  pickerTitle: { fontSize: 14, fontWeight: 700, color: v("--color-text-primary"), margin: "0 0 8px" },
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
