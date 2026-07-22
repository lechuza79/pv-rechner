"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import DonutChart from "../charts/DonutChart";
import { IconChevronDown, IconChevronLeft, IconChevronRight } from "../Icons";
import { v } from "../../lib/theme";
import { SEGMENT_OWNER, type AtlasOwner, type ChildYearRow, type RankingRegion } from "../../lib/atlas";
import {
  fmtPvLeistung as fmtLeistung,
  fmtSpeicherKwh,
  fmtWattProKopf,
  pvLeistungTeile,
} from "../../lib/atlas-format";
import AtlasKpiRow, { type KpiGroup, type RefLevel } from "./AtlasKpiRow";

export type HeroCell = { segment: string; count: number; kwp: number };

/**
 * Everything the KPI tiles need for ONE owner filter — values and the comparison
 * basis. Both are cut the same way: under "Privat" the tendency measures the
 * Gemeinde's private plants against the private plants of the chosen level, never
 * against its whole stock.
 */
export type KpiOwnerData = {
  /** Zwei Blöcke: alles zur Solaranlage links, alles zum Speicher rechts. Der
   *  Pumpspeicher-Hinweis hängt an der Speicher-Gruppe, wo er hingehört. */
  groups: KpiGroup[];
  perCap: Record<string, number | null>;
  references: RefLevel[];
};

type Owner = AtlasOwner;
type Metric = "perCapita" | "count" | "kwp" | "speicher";

const OWNERS: { key: Owner; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "privat", label: "Privat" },
  { key: "gewerbe", label: "Gewerbe" },
];

const METRICS: { key: Metric; label: string }[] = [
  { key: "perCapita", label: "Leistung je Einwohner" },
  { key: "count", label: "Zahl der Anlagen" },
  { key: "kwp", label: "Installierte Leistung" },
  // Beim Namen genannt: sortiert wird nach Batteriekapazität, Pumpspeicher zählt
  // hier nicht mit (sonst gewinnt jede Rangliste die Gemeinde mit dem Kraftwerk).
  { key: "speicher", label: "Batteriespeicher" },
];

const SEG: Record<string, { label: string }> = {
  privat_dach: { label: "Private Dächer" },
  gewerbe_dach: { label: "Gewerbedächer" },
  steckersolar: { label: "Balkonkraftwerke" },
  freiflaeche: { label: "Freifläche" },
};

/**
 * Donut-Farben nach GRÖSSE, nicht nach Kategorie: das größte Segment am
 * dunkelsten, dann heller. Welcher Anlagentyp welche Farbe hat, steht in der
 * Legende daneben — die Farbe kodiert hier den Rang, damit das Auge die
 * Reihenfolge ohne Prozentlesen erfasst. Hex statt Token, weil der Donut auch
 * im Embed rendert, wo die CSS-Variablen fehlen (Blau-Accent-Familie, dunkel→hell).
 */
const DONUT_RAMP = ["#073C93", "#1365EA", "#6A9EF2", "#BCD6FF"];

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

function fmtValue(v: number, m: Metric): string {
  if (m === "perCapita") return fmtWattProKopf(v);
  if (m === "kwp") return fmtLeistung(v);
  if (m === "speicher") return fmtSpeicherKwh(v);
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
  // Wrap around — the metrics are a ring, not a list with ends. Stepping past the
  // last returns to the first, so the arrows never dead-end.
  const go = (delta: number) => {
    const next = (idx + delta + METRICS.length) % METRICS.length;
    onChange(METRICS[next].key);
  };
  return (
    <div style={S.pickerBar}>
      <button
        type="button"
        onClick={() => go(-1)}
        style={{ ...S.pickerArrow, borderRadius: "8px 0 0 8px", borderRight: "none" }}
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
        style={{ ...S.pickerArrow, borderRadius: "0 8px 8px 0", borderLeft: "none" }}
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
  kpi,
  cells,
  siblings,
  siblingCells,
  regionId,
  regionName,
  kreisName,
  basePath,
}: {
  kpi: Record<Owner, KpiOwnerData>;
  cells: HeroCell[];
  siblings: RankingRegion[];
  siblingCells: ChildYearRow[];
  // Der Größenklassen-Vergleich stand hier einmal als Zeile in der Rangliste und
  // hat sie kaputtgemacht (drei Mal „Platz 1" in einer Liste, weil die Zeilen aus
  // einer anderen Grundgesamtheit kamen). Er lebt jetzt als eigene Kachelreihe
  // über dem Hero — siehe components/atlas/GemeindePeerTiles.tsx.
  regionId: string;
  regionName: string;
  kreisName?: string;
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
        .map((c) => ({ key: c.segment, label: SEG[c.segment].label, value: c.kwp, count: c.count }))
        .sort((a, b) => b.value - a.value)
        // Farbe erst nach dem Sortieren: nach Rang dunkel→hell (siehe DONUT_RAMP).
        .map((s, i) => ({ ...s, color: DONUT_RAMP[Math.min(i, DONUT_RAMP.length - 1)] })),
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
          metric === "perCapita"
            ? r.population
              ? Math.round((a.kwp * 1000) / r.population)
              : null
            : a[metric];
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

  /**
   * Zwei Blöcke statt einer Liste — und das ist kein Layout-Detail.
   *
   * Die Tabelle beantwortet EINE Frage: „Wo stehe ich unter meinen Nachbarn?"
   * Nur Gemeinden desselben Landkreises, durchgehende Ränge, die eigene Gemeinde
   * an ihrer echten Position.
   *
   * Die Größenklassen-Spitze („Wie schlage ich mich gegen ähnlich große Orte
   * bundesweit?") stand hier früher mit drin — eine andere Grundgesamtheit in
   * derselben nummerierten Liste. Das erzeugte drei Zeilen mit einer „1." und
   * eine unerklärte Lücke von Rang 2 auf Rang 5. Sie später ohne Nummer
   * anzuhängen war nur ein Pflaster: die Aussage ist ein Einordnungs-Fakt, keine
   * Ranglisten-Zeile, und gehört deshalb gar nicht in diese Tabelle.
   */
  const { rows, selfDetached } = useMemo(() => {
    // Immer genau fünf Zeilen, und die eigene Gemeinde ist immer eine davon:
    // vier Spitzenreiter plus sie selbst an ihrem echten Rang. Die Sprungmarke
    // sagt, dass die Ränge dazwischen übersprungen sind.
    const selfIdx = ranked.findIndex((r) => r.isSelf);
    if (selfIdx === -1) return { rows: ranked.slice(0, 5), selfDetached: false };
    if (selfIdx < 5) return { rows: ranked.slice(0, 5), selfDetached: false };
    const leaders = ranked.filter((r) => !r.isSelf).slice(0, 4);
    return { rows: [...leaders, ranked[selfIdx]], selfDetached: true };
  }, [ranked]);

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

      {/* Die Kacheln gehören ins Widget, nicht darüber: sonst zeigt der Filter
          „Privat" eine private Rangliste neben Gesamt-Kennzahlen. */}
      <AtlasKpiRow
        groups={kpi[owner].groups}
        regionPerCap={kpi[owner].perCap}
        references={kpi[owner].references}
        defaultRefKey="landkreis"
        note={
          owner === "privat"
            ? "Verglichen werden nur private Anlagen, auch beim Durchschnitt."
            : owner === "gewerbe"
              ? "Verglichen werden nur gewerbliche Anlagen, auch beim Durchschnitt."
              : undefined
        }
      />

      <div style={S.split}>
        <div style={S.left}>
          {slices.length === 0 ? (
            <p style={S.empty}>Für diese Auswahl sind keine Anlagen erfasst.</p>
          ) : (
            <>
              <div onMouseLeave={() => setActive(null)} style={{ display: "inline-block" }}>
                <DonutChart segments={slices} size={170}>
                  <div key={shown?.key ?? "total"} style={S.center}>
                    {/* Zahl groß und zentriert, Einheit klein darunter. Kein
                        „gesamt"/„100 %" mehr — die Summe steht schon als Kennzahl
                        oben, hier war sie doppelt. Beim Überfahren eines Segments
                        tritt dessen Name + Anlagenzahl an die Stelle. */}
                    <div style={S.centerValue}>{pvLeistungTeile(shown ? shown.value : total).value}</div>
                    <div style={S.centerUnit}>{pvLeistungTeile(shown ? shown.value : total).unit}</div>
                    {shown && <div style={S.centerLabel}>{shown.label}</div>}
                    {shown && <div style={S.centerSub}>{nf(shown.count)} Anlagen</div>}
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
          <div style={S.rankHead}>
            <div style={S.rankTitle}>{`Top Kommunen${kreisName ? ` im ${kreisName}` : ""}`}</div>
            <MetricPicker metric={metric} onChange={setMetric} />
          </div>

          {/* Re-keyed on filter+metric so the whole set fades in on a switch —
              softens the reorder that a per-row width transition can't cover. */}
          <div key={`${owner}-${metric}`} style={S.rowsFade}>
            {rows.map((r) => (
              <PeerZeile
                key={`${r.region_id}-${r.scope}`}
                row={r}
                metric={metric}
                scale={scale}
                // Five rows, always the same height. When self is beyond the top
                // it takes the last slot and floats above the table (shadow) —
                // its real rank makes clear the ranks in between are skipped.
                floating={selfDetached && r.isSelf}
              />
            ))}
          </div>

          {/* Reserved height: the note only shows under "Pro Kopf", so without a
              fixed slot the content below the card would jump on every metric
              switch. */}
          <div style={S.peerNoteWrap}>
            {metric === "perCapita" && (
              <p style={S.peerNote}>
                Verglichen werden nur Gemeinden im selben Landkreis — {regionName} steht an seiner
                echten Position, auch wenn die Ränge davor übersprungen sind.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Eine Zeile der Rangliste. Ohne `rang` (Vergleichsblock) bleibt die Spalte leer
 * statt eine Nummer zu erfinden — genau die erfundene "1." war der Fehler.
 */
function PeerZeile({
  row,
  metric,
  scale,
  floating = false,
}: {
  row: PeerRow;
  metric: Metric;
  scale: number;
  floating?: boolean;
}) {
  return (
    <div
      style={{ ...S.peerRow, ...(row.isSelf ? S.peerSelf : null), ...(floating ? S.peerFloat : null) }}
    >
      <span style={S.peerRank}>{row.rang === null ? "" : `${row.rang}.`}</span>
      <span style={S.peerName}>
        {row.href && !row.isSelf ? (
          <Link href={row.href} style={S.peerLink}>
            {row.name}
          </Link>
        ) : (
          <span style={{ ...S.peerLink, fontWeight: row.isSelf ? 700 : 500 }}>{row.name}</span>
        )}
        <span style={S.peerScope}>{row.scope}</span>
      </span>
      <span style={S.peerVal}>
        <span>{fmtValue(row.value, metric)}</span>
        <span style={S.track}>
          <span
            style={{
              ...S.fill,
              width: `${Math.min(100, Math.max(2, Math.round((row.value / scale) * 100)))}%`,
              background: row.isSelf ? v("--color-accent") : v("--color-accent-light"),
            }}
          />
        </span>
      </span>
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
    // Fliesstextgroesse aus der Token-Skala, wie die Tendenz-Zeile darunter.
    fontSize: v("--font-size-body"),
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
  center: { animation: "fu 0.18s ease-out", textAlign: "center" },
  rowsFade: { animation: "fu 0.28s ease-out" },
  centerValue: { fontFamily: v("--font-mono"), fontSize: 22, fontWeight: 700, lineHeight: 1.1 },
  // Einheit als eigene Zeile unter dem Wert, kleiner und heller.
  centerUnit: { fontSize: v("--font-size-small"), fontWeight: 600, color: v("--color-text-secondary"), marginTop: 1 },
  centerLabel: { fontSize: 11, color: v("--color-text-secondary"), marginTop: 4 },
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
  // Titel links (darf 2-zeilig umbrechen), Multitool rechts.
  rankHead: { display: "flex", alignItems: "center", gap: 12, marginBottom: 10 },
  rankTitle: {
    flex: "1 1 auto",
    minWidth: 0,
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.25,
    color: v("--color-text-primary"),
  },
  pickerBar: { display: "flex", alignItems: "stretch", flex: "0 0 auto", maxWidth: "58%" },
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
  peerSelf: { background: v("--color-bg-accent"), boxShadow: `inset 0 0 0 1.5px ${v("--color-accent")}` },
  // Detached self: lifted off the table with a drop shadow (keeps the blue outline).
  peerFloat: {
    background: v("--color-bg"),
    boxShadow: `inset 0 0 0 1.5px ${v("--color-accent")}, 0 3px 12px rgba(0,0,0,0.12)`,
    position: "relative",
    zIndex: 1,
  },
  peerRank: { fontFamily: v("--font-mono"), fontSize: 11, color: v("--color-text-muted") },
  peerName: { display: "flex", flexDirection: "column", minWidth: 0 },
  peerLink: { color: v("--color-text-primary"), textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  peerScope: { fontSize: 9, color: v("--color-text-muted") },
  peerVal: { fontFamily: v("--font-mono"), fontSize: 11, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 },
  track: { display: "block", width: "100%", height: 4, background: v("--color-border"), borderRadius: 2 },
  // Links verankert → Balken wächst nach rechts (kein marginLeft:auto).
  fill: { display: "block", height: "100%", borderRadius: 2, transition: "width 220ms ease" },
  peerNoteWrap: { minHeight: 44 },
  peerNote: { fontSize: 10, color: v("--color-text-muted"), lineHeight: 1.6, margin: "10px 0 0" },
};
