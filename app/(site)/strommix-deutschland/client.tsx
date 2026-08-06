"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useGenerationMix, useNuclearImport, type GenerationDataPoint } from "../../../lib/energy";
import StackedAreaChart from "../../../components/charts/StackedAreaChart";
import StackedBarChart from "../../../components/charts/StackedBarChart";
import {
  formatGWhIn, energyUnit, calcPeriodStats, CATEGORY_COLORS,
} from "../../../lib/chart-utils";
import { v, iconSizes, space, pad } from "../../../lib/theme";
import { DATA_SOURCES, sourceLabel } from "../../../lib/data-sources";
import { STROMMIX_MILESTONES, milestonesForYear } from "../../../lib/strommix-milestones";
import { useChartExport } from "../../../lib/useChartExport";
import ChartExportBar from "../../../components/ChartExportBar";
import { IconChevronLeft, IconChevronRight, IconChevronDown } from "../../../components/Icons";
import { LoadingDots as BouncingDots } from "../../../components/LoadingDots";

// ─── Time Range Selector ─────────────────────────────────────────────────────

const LETZTE_RANGES = [
  { label: "24 Stunden", value: "24h", hours: 24 },
  { label: "7 Tage", value: "7d", hours: 168 },
  { label: "30 Tage", value: "30d", hours: 720 },
  { label: "12 Monate", value: "12M", hours: 8760 },
] as const;

// Available full years (Energy-Charts has data from 2015+)
function getAvailableYears(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 1; y >= 2015; y--) {
    years.push(y);
  }
  return years;
}

// Validate a ?range= query value against the known range vocabulary.
// Accepts the fixed tokens plus any year string between 2015 and the current
// year. Invalid/missing values return null so the caller can fall back to "24h".
function parseRangeParam(raw: string | null): string | null {
  if (!raw) return null;
  if (["24h", "7d", "30d", "12M", "YTD", "MAX"].includes(raw)) return raw;
  if (/^\d{4}$/.test(raw)) {
    const year = Number(raw);
    if (year >= 2015 && year <= new Date().getFullYear()) return raw;
  }
  return null;
}

// ─── Main Component ──────────────────────────────────────────────────────────

function getYtdHours(): number {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  return Math.floor((now.getTime() - jan1.getTime()) / (1000 * 60 * 60));
}

function getYearRange(year: number): { start: string; end: string } {
  const currentYear = new Date().getFullYear();
  const end = year === currentYear
    ? new Date().toISOString().slice(0, 10)
    : `${year}-12-31`;
  return { start: `${year}-01-01`, end };
}

function splitValueUnit(formatted: string): [string, string] {
  const parts = formatted.split(" ");
  if (parts.length === 2) return [parts[0], parts[1]];
  return [formatted, ""];
}

// ─── Shared Button Style ────────────────────────────────────────────────────

function rangeButtonStyle(active: boolean) {
  return {
    padding: "6px 10px",
    borderRadius: v("--radius-sm"),
    border: `1px solid ${active ? v("--color-accent") : v("--color-border")}`,
    background: active ? v("--color-accent") : v("--color-bg"),
    color: active ? v("--color-text-on-accent") : v("--color-text-secondary"),
    fontSize: 11,
    fontWeight: 600 as const,
    cursor: "pointer" as const,
    fontFamily: v("--font-text"),
  };
}

// ─── Solar-Trend: letzter abgeschlossener Monat vs. Vorjahresmonat ──────────

// 1.–3. eines Monats: der Vormonat kann in den Quelldaten noch einen
// unvollständigen Schwanz haben — dann einen Monat weiter zurückgehen.
function lastCompletedMonth(): { year: number; month: number } {
  const now = new Date();
  const d = now.getDate() <= 3
    ? new Date(now.getFullYear(), now.getMonth() - 2, 1)
    : new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function monthDateRange(year: number, month: number): { start: string; end: string } {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const mm = String(month + 1).padStart(2, "0");
  return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${String(lastDay).padStart(2, "0")}` };
}

/** Summe eines Erzeugungs-Schlüssels über eine Roh-Zeitreihe (MW) → GWh. */
function sumKeyGWh(data: GenerationDataPoint[], key: string): number {
  if (data.length < 2) return 0;
  const t0 = new Date(data[0].ts).getTime();
  const t1 = new Date(data[1].ts).getTime();
  const intervalHours = (t1 - t0) / 3600000;
  if (!(intervalHours > 0)) return 0;
  let mwh = 0;
  for (const d of data) {
    const val = d[key];
    if (typeof val === "number" && val > 0) mwh += val * intervalHours;
  }
  return mwh / 1000;
}

/** Kompakte Karte: Solarerzeugung des letzten abgeschlossenen Monats gegen
 *  denselben Monat des Vorjahres — aus denselben Daten wie der Chart. Bei
 *  fehlenden/unvollständigen Daten rendert die Karte nichts. */
function SolarTrendCard() {
  const { year, month } = useMemo(() => lastCompletedMonth(), []);
  const thisRange = useMemo(() => monthDateRange(year, month), [year, month]);
  const prevRange = useMemo(() => monthDateRange(year - 1, month), [year, month]);
  const cur = useGenerationMix("de", 720, thisRange);
  const prev = useGenerationMix("de", 720, prevRange);

  const monthLabel = new Date(year, month, 1).toLocaleString("de-DE", { month: "long" });
  const curGWh = useMemo(() => sumKeyGWh(cur.data.data, "solar"), [cur.data.data]);
  const prevGWh = useMemo(() => sumKeyGWh(prev.data.data, "solar"), [prev.data.data]);

  if (cur.loading || prev.loading || curGWh <= 0 || prevGWh <= 0) return null;

  const deltaPct = Math.round((curGWh / prevGWh - 1) * 100);
  const unit = energyUnit(Math.max(curGWh, prevGWh));
  const mehr = deltaPct >= 0;

  return (
    <div
      style={{
        background: v("--color-bg-muted"),
        border: `1px solid ${v("--color-border")}`,
        borderRadius: v("--radius-md"),
        padding: pad("md", "lg"),
        marginBottom: 20,
        fontSize: 13,
        lineHeight: 1.65,
        color: v("--color-text-secondary"),
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: v("--color-text-primary"), marginBottom: 4 }}>
        Solar-Trend: {monthLabel} {year} gegen {monthLabel} {year - 1}
      </div>
      Im {monthLabel} {year} lieferten Deutschlands Solaranlagen{" "}
      <strong style={{ color: v("--color-text-primary"), fontFamily: v("--font-mono") }}>{formatGWhIn(curGWh, unit)}</strong>{" "}
      Strom — {mehr ? "" : "das sind "}
      <strong style={{ color: mehr ? v("--color-positive") : v("--color-text-primary"), fontFamily: v("--font-mono") }}>
        {Math.abs(deltaPct)} %
      </strong>{" "}
      {mehr ? "mehr" : "weniger"} als im {monthLabel} {year - 1} ({formatGWhIn(prevGWh, unit)}).{" "}
      {mehr
        ? "Ein Treiber neben dem Wetter: Es sind schlicht mehr Module am Netz."
        : "Kurzfristig schlägt das Wetter den Zubau — übers Jahr wächst die Solarerzeugung trotzdem."}{" "}
      <a href="/photovoltaik-zubau-deutschland" style={{ color: v("--color-accent"), fontWeight: 600, textDecoration: "none" }}>
        Zum PV-Zubau in Deutschland
      </a>
    </div>
  );
}

// ─── Jahres-Marken ──────────────────────────────────────────────────────────

/** Ereignis-Einordnung unter dem Chart: für ein gewähltes Jahr dessen Marken,
 *  in der Max-Ansicht die ganze Reihe. */
function MilestoneBlock({ selected, isMax }: { selected: string; isMax: boolean }) {
  const items = isMax ? STROMMIX_MILESTONES : milestonesForYear(Number(selected));
  if (items.length === 0) return null;
  return (
    <div
      style={{
        background: v("--color-bg-muted"),
        border: `1px solid ${v("--color-border")}`,
        borderRadius: v("--radius-md"),
        padding: pad("md", "lg"),
        marginBottom: 20,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: v("--color-text-primary"), marginBottom: space.sm }}>
        {isMax ? "Was die Jahre geprägt hat" : `Was ${selected} geprägt hat`}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: space.md }}>
        {items.map((m) => (
          <div key={`${m.year}-${m.title}`} style={{ display: "flex", gap: space.md, alignItems: "baseline" }}>
            {isMax && (
              <span
                style={{
                  flexShrink: 0,
                  fontFamily: v("--font-mono"),
                  fontWeight: 700,
                  fontSize: 12,
                  color: v("--color-accent"),
                }}
              >
                {m.year}
              </span>
            )}
            <div style={{ fontSize: 13, lineHeight: 1.6, color: v("--color-text-secondary") }}>
              <strong style={{ color: v("--color-text-primary") }}>{m.title}.</strong> {m.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Loading Spinner ────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div style={{
      height: 300,
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      color: v("--color-text-muted"),
      fontSize: 13,
    }}>
      <div style={{
        width: 28, height: 28,
        border: `3px solid ${v("--color-border")}`,
        borderTopColor: v("--color-accent"),
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      Lade Daten…
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

// BouncingDots → components/LoadingDots (imported above as aliased BouncingDots).

// ─── Component ──────────────────────────────────────────────────────────────

export default function EnergieClient() {
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState(() => parseRangeParam(searchParams.get("range")) ?? "24h");
  const [showNuclear, setShowNuclear] = useState(true);

  // Mirror range changes into the URL without a reload or new history entry,
  // so the existing share button (which shares window.location.href) carries the
  // current view. Other query params are preserved.
  const selectRange = useCallback((value: string) => {
    setSelected(value);
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("range", value);
    const query = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
    );
  }, []);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);
  const availableYears = useMemo(() => getAvailableYears(), []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!yearDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target as Node)) {
        setYearDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [yearDropdownOpen]);

  const isYear = /^\d{4}$/.test(selected);
  const isMax = selected === "MAX";
  const hours = useMemo(() => {
    if (selected === "YTD") return getYtdHours();
    if (isMax) {
      const now = new Date();
      const start = new Date(2015, 0, 1);
      return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60));
    }
    if (isYear) return 8760;
    const range = LETZTE_RANGES.find(r => r.value === selected);
    return range?.hours || 24;
  }, [selected, isYear, isMax]);

  const dateRange = useMemo(() => {
    if (isMax) return { start: "2015-01-01", end: new Date().toISOString().slice(0, 10) };
    if (isYear) return getYearRange(Number(selected));
    return undefined;
  }, [selected, isYear, isMax]);

  const { data: genData, loading, error, isStale, refetch } = useGenerationMix("de", hours, dateRange);
  const { data: nuclearData, loading: nuclearLoading, error: nuclearError } = useNuclearImport(hours, dateRange);

  const stats = useMemo(() => calcPeriodStats(genData.data, genData.resolution), [genData.data, genData.resolution]);

  // Check if domestic nuclear data is present (only before April 2023)
  const hasDomesticNuclear = useMemo(() => {
    return genData.data.some(d => typeof d.nuclear === "number" && (d.nuclear as number) > 0);
  }, [genData.data]);

  // Calculate domestic nuclear total for summary widget
  const domesticNuclearStats = useMemo(() => {
    if (!hasDomesticNuclear || genData.data.length < 2) return { avgGw: 0, totalGWh: 0 };
    const isWeekly = genData.resolution === "weekly";
    let intervalHours = 0.25;
    if (!isWeekly) {
      const t0 = new Date(genData.data[0].ts).getTime();
      const t1 = new Date(genData.data[1].ts).getTime();
      intervalHours = (t1 - t0) / (1000 * 60 * 60);
    }
    let totalGWh = 0;
    let totalMw = 0;
    let count = 0;
    for (const d of genData.data) {
      const val = d.nuclear;
      if (typeof val === "number" && val > 0) {
        if (isWeekly) {
          totalGWh += val; // already GWh
        } else {
          totalGWh += val * intervalHours / 1000;
          totalMw += val;
        }
        count++;
      }
    }
    const avgGw = isWeekly
      ? (totalGWh / genData.data.length / 168) // GWh/week → avg GW
      : count > 0 ? totalMw / count / 1000 : 0;
    return { avgGw, totalGWh };
  }, [genData.data, genData.resolution, hasDomesticNuclear]);

  // Nuclear import total GWh — from Supabase (preAggregated) or live API data
  const nuclearImportGWh = useMemo(() => {
    // From preAggregated weekly data (Max view)
    if (genData.resolution === "weekly") {
      let total = 0;
      for (const d of genData.data) {
        const val = d.nuclear_import;
        if (typeof val === "number" && val > 0) total += val;
      }
      return total;
    }
    // From live API data: nuclear_gw × intervalHours = GWh
    if (nuclearData.data.length >= 2) {
      const t0 = new Date(nuclearData.data[0].ts).getTime();
      const t1 = new Date(nuclearData.data[1].ts).getTime();
      const intervalHours = (t1 - t0) / (1000 * 60 * 60);
      let total = 0;
      for (const d of nuclearData.data) {
        if (d.nuclear_gw > 0) total += d.nuclear_gw * intervalHours;
      }
      return total;
    }
    return 0;
  }, [genData.data, genData.resolution, nuclearData.data]);

  // Time range display label
  const rangeLabel = useMemo(() => {
    if (selected === "MAX") return "2015 – heute";
    if (selected === "YTD") return `${new Date().getFullYear()} bis heute`;
    if (/^\d{4}$/.test(selected)) return selected;
    const r = LETZTE_RANGES.find(r => r.value === selected);
    return r ? `Die letzten ${r.label}` : selected;
  }, [selected]);

  const energyChartExport = useChartExport({
    context: {
      title: "Stromerzeugung nach Energieträger in Deutschland",
      kind: "chart",
      subtitle: rangeLabel,
      stats: stats ? (() => {
        const u = energyUnit(stats.totalGenerationGWh);
        const f = (v: number) => formatGWhIn(v, u);
        return [
          { label: "Erneuerbare", value: `${Math.round(stats.eeSharePct)}`, unit: "%" },
          { label: "Erzeugt", value: f(stats.totalGenerationGWh).replace(/[^\d.,]/g, ''), unit: u },
          { label: "davon EE", value: f(stats.renewableGWh).replace(/[^\d.,]/g, ''), unit: u },
          ...(stats.netImportGWh !== 0 ? [{ label: "Netto-Import", value: `${stats.netImportGWh > 0 ? "+" : ""}${f(Math.abs(stats.netImportGWh)).replace(/[^\d.,]/g, '')}`, unit: u }] : []),
        ];
      })() : undefined,
      legend: [
        { color: CATEGORY_COLORS.renewable, label: "Erneuerbare" },
        { color: CATEGORY_COLORS.fossil, label: "Fossil" },
        { color: CATEGORY_COLORS.other, label: "Sonstige" },
        ...(hasDomesticNuclear ? [{ color: CATEGORY_COLORS.nuclear, label: "Kernenergie (erzeugt)" }] : []),
        ...(showNuclear && nuclearImportGWh > 0 ? [{ color: CATEGORY_COLORS.nuclearImport, label: "Kernenergie (importiert)" }] : []),
      ],
      heading: rangeLabel,
      notes: [
        {
          title: "Gelesen wird",
          text: "die Stromerzeugung in Deutschland, gestapelt nach Energieträgern. Die Höhe der Fläche ist die Leistung zum jeweiligen Zeitpunkt; die Farbabstufungen innerhalb Grün sind die einzelnen erneuerbaren Träger (Wind, Solar, Wasser, Biomasse).",
        },
        ...(showNuclear && nuclearImportGWh > 0 ? [{
          title: "Kernenergie (importiert)",
          text: "Rechnerischer Wert: Stromflüsse über die Grenze multipliziert mit dem Kernenergie-Anteil des Nachbarlands. Heimische Kernkraft läuft seit April 2023 nicht mehr.",
        }] : []),
      ],
      source: sourceLabel(DATA_SOURCES.energyCharts),
    },
    filename: `solar-check-strommix-${selected}.png`,
    shareText: `Strommix Deutschland (${rangeLabel}) – ${stats ? `${Math.round(stats.eeSharePct)}% Erneuerbare` : ""}`,
  });

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
          Strommix Deutschland – live
        </h1>
        <p style={{ fontSize: 13, color: v("--color-text-secondary"), marginTop: 6, lineHeight: 1.5 }}>
          Welche Energieträger gerade Strom liefern — aktuell, im Monats- und im Jahresvergleich.
        </p>
      </div>

      {/* Time Range Toggle — two groups */}
      <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
        {/* Letzte */}
        <div>
          <div style={{ fontSize: 10, color: v("--color-text-muted"), marginBottom: 4, fontWeight: 600 }}>Letzte</div>
          <div style={{ display: "flex", gap: 6 }}>
            {LETZTE_RANGES.map((range) => (
              <button key={range.value} onClick={() => selectRange(range.value)} style={rangeButtonStyle(selected === range.value)}>
                {range.label}
              </button>
            ))}
          </div>
        </div>
        {/* Andere Zeiträume */}
        <div>
          <div style={{ fontSize: 10, color: v("--color-text-muted"), marginBottom: 4, fontWeight: 600 }}>Andere Zeiträume</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {/* Current year button */}
            <button onClick={() => selectRange("YTD")} style={rangeButtonStyle(selected === "YTD")}>
              {new Date().getFullYear()}
            </button>

            {/* Year selector with arrows + dropdown */}
            <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
              <button
                onClick={() => {
                  if (isYear) {
                    const y = Number(selected);
                    if (y > 2015) selectRange(String(y - 1));
                  } else {
                    selectRange(String(new Date().getFullYear() - 1));
                  }
                }}
                style={{
                  ...rangeButtonStyle(false),
                  borderRadius: `${v("--radius-sm")} 0 0 ${v("--radius-sm")}`,
                  borderRight: "none",
                  padding: "0 6px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                title="Vorheriges Jahr"
              >
                <IconChevronLeft size={iconSizes.xs} />
              </button>
              <div ref={yearDropdownRef} style={{ position: "relative", display: "flex" }}>
                <button
                  onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
                  style={{
                    ...rangeButtonStyle(isYear),
                    borderRadius: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    minWidth: 64,
                    justifyContent: "center",
                  }}
                >
                  {isYear ? selected : "Jahre"}
                  <IconChevronDown size={iconSizes.xs} />
                </button>
                {yearDropdownOpen && (
                  <div style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: v("--color-bg"),
                    border: `1px solid ${v("--color-border")}`,
                    borderRadius: v("--radius-sm"),
                    boxShadow: v("--shadow-md"),
                    zIndex: 20,
                    padding: "4px 0",
                    minWidth: 80,
                    maxHeight: 200,
                    overflowY: "auto",
                  }}>
                    {availableYears.map((year) => (
                      <button
                        key={year}
                        onClick={() => { selectRange(String(year)); setYearDropdownOpen(false); }}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "6px 14px",
                          border: "none",
                          background: selected === String(year) ? v("--color-bg-accent") : "transparent",
                          color: selected === String(year) ? v("--color-accent") : v("--color-text-secondary"),
                          fontSize: 12,
                          fontWeight: selected === String(year) ? 700 : 400,
                          fontFamily: v("--font-text"),
                          cursor: "pointer",
                          textAlign: "center",
                        }}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  if (isYear) {
                    const y = Number(selected);
                    const maxYear = new Date().getFullYear() - 1;
                    if (y < maxYear) selectRange(String(y + 1));
                  }
                }}
                disabled={!isYear || Number(selected) >= new Date().getFullYear() - 1}
                style={{
                  ...rangeButtonStyle(false),
                  borderRadius: `0 ${v("--radius-sm")} ${v("--radius-sm")} 0`,
                  borderLeft: "none",
                  padding: "0 6px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: !isYear || Number(selected) >= new Date().getFullYear() - 1 ? 0.4 : 1,
                }}
                title="Nächstes Jahr"
              >
                <IconChevronRight size={iconSizes.xs} />
              </button>
            </div>

            <button onClick={() => selectRange("MAX")} style={rangeButtonStyle(selected === "MAX")}>
              Max
            </button>
          </div>
        </div>
      </div>

      {/* Summary Widgets — horizontal row (always visible) */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 20,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {(() => {
          // Determine consistent unit for all energy widgets based on total generation
          const wUnit = stats ? energyUnit(stats.totalGenerationGWh) : "TWh";
          const fmtW = (v: number) => splitValueUnit(formatGWhIn(v, wUnit));
          return [
            { label: "Erneuerbare", value: stats ? `${Math.round(stats.eeSharePct)}` : null, unit: "%" },
            { label: "Erzeugt", value: stats ? fmtW(stats.totalGenerationGWh)[0] : null, unit: stats ? fmtW(stats.totalGenerationGWh)[1] : "TWh" },
            { label: "davon EE", value: stats ? fmtW(stats.renewableGWh)[0] : null, unit: stats ? fmtW(stats.renewableGWh)[1] : "TWh" },
            { label: stats?.netImportGWh != null ? `Netto-${stats.netImportGWh > 0 ? "Import" : "Export"}` : "Netto", value: stats ? `${stats.netImportGWh > 0 ? "+" : ""}${fmtW(Math.abs(stats.netImportGWh))[0]}` : null, unit: stats ? fmtW(Math.abs(stats.netImportGWh))[1] : "GWh" },
          ];
        })().map(({ label, value, unit }) => (
          <div key={label} style={{
            flex: "1 0 0", minWidth: 80,
            background: v("--color-bg-muted"),
            border: `1px solid ${v("--color-border")}`,
            borderRadius: v("--radius-md"),
            padding: "12px 8px", textAlign: "center",
          }}>
            <div style={{ fontSize: 9, color: v("--color-text-muted"), marginBottom: 2 }}>{label}</div>
            <div style={{ fontFamily: v("--font-mono"), fontWeight: 800, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {value === null ? (
                <BouncingDots />
              ) : (
                <>
                  <span style={{ fontSize: 22, color: v("--color-text-primary") }}>{value}</span>
                  <span style={{ fontSize: 13, color: v("--color-text-muted"), marginLeft: 3 }}>{unit}</span>
                </>
              )}
            </div>
          </div>
        ))}
        {/* Kernenergie toggle */}
        {(() => {
          const totalNucGWh = domesticNuclearStats.totalGWh + nuclearImportGWh;
          const hasAny = totalNucGWh > 0;
          const hasDomestic = domesticNuclearStats.totalGWh > 0;
          const hasImport = nuclearImportGWh > 0;
          // Use same unit as other widgets
          const wUnit = stats ? energyUnit(stats.totalGenerationGWh) : "TWh";
          const nucFormatted = hasAny ? splitValueUnit(formatGWhIn(totalNucGWh, wUnit)) : null;
          const importFormatted = hasImport ? splitValueUnit(formatGWhIn(nuclearImportGWh, wUnit)) : null;

          return (
            <button
              onClick={() => !nuclearLoading && setShowNuclear(!showNuclear)}
              style={{
                flex: "1 0 0", minWidth: 80,
                background: v("--color-bg-muted"),
                border: `1px solid ${v("--color-border")}`,
                borderRadius: v("--radius-md"),
                padding: "12px 8px", textAlign: "center",
                cursor: nuclearLoading ? "default" : "pointer", fontFamily: v("--font-text"),
                opacity: nuclearLoading ? 0.6 : showNuclear ? 1 : 0.5,
              }}
            >
              <div style={{ fontSize: 9, color: v("--color-text-muted"), marginBottom: 2 }}>Kernenergie</div>
              <div style={{ fontFamily: v("--font-mono"), fontWeight: 800, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {nuclearLoading && !hasAny ? (
                  <BouncingDots />
                ) : nuclearError && !hasAny ? (
                  <span style={{ fontSize: 11, color: v("--color-text-muted"), fontWeight: 400, fontFamily: v("--font-text") }}>Nicht verfügbar</span>
                ) : hasAny && nucFormatted ? (
                  <>
                    <span style={{ fontSize: 22, color: v("--color-text-primary") }}>{nucFormatted[0]}</span>
                    <span style={{ fontSize: 13, color: v("--color-text-muted"), marginLeft: 3 }}>{nucFormatted[1]}</span>
                  </>
                ) : (
                  <span style={{ fontSize: 11, color: v("--color-text-muted"), fontWeight: 400, fontFamily: v("--font-text") }}>—</span>
                )}
              </div>
              {hasDomestic && hasImport && importFormatted && (
                <div style={{ fontSize: 11, color: v("--color-text-muted"), marginTop: 2, lineHeight: 1.4, fontFamily: v("--font-mono") }}>
                  Zukauf {importFormatted[0]} <span style={{ fontSize: 10, color: v("--color-text-faint") }}>{importFormatted[1]}</span>
                </div>
              )}
            </button>
          );
        })()}
      </div>

      {/* Stacked Area / Bar Chart */}
      <div
        style={{
          background: v("--color-bg"),
          border: `1px solid ${v("--color-border")}`,
          borderRadius: v("--radius-lg"),
          padding: "20px 12px 16px",
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: isStale ? 6 : 12, paddingLeft: 8 }}>
          Stromerzeugung nach Energieträger
        </div>
        {isStale && (
          <div style={{
            fontSize: 11, color: v("--color-text-muted"), marginBottom: 8, paddingLeft: 8,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span>Aktualisierung fehlgeschlagen — zeige zwischengespeicherte Daten</span>
            <button
              onClick={refetch}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: v("--color-accent"), fontSize: 11, fontWeight: 600,
                fontFamily: v("--font-text"), padding: 0, textDecoration: "underline",
              }}
            >
              Erneut versuchen
            </button>
          </div>
        )}

        <div ref={energyChartExport.chartRef}>
          {loading ? (
            <LoadingSpinner />
          ) : error && genData.data.length === 0 ? (
            <div
              style={{
                height: 300,
                display: "flex",
                flexDirection: "column" as const,
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                fontSize: 13,
              }}
            >
              <div style={{ color: v("--color-text-muted") }}>Daten konnten nicht geladen werden</div>
              <button
                onClick={refetch}
                style={{
                  padding: "8px 20px",
                  borderRadius: v("--radius-sm"),
                  border: `1px solid ${v("--color-accent")}`,
                  background: v("--color-accent"),
                  color: v("--color-text-on-accent"),
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: v("--font-text"),
                }}
              >
                Erneut laden
              </button>
            </div>
          ) : hours >= 720 || isYear || isMax ? (
            <StackedBarChart
              data={genData.data}
              mode={isMax ? "max" : selected === "YTD" || isYear ? "ytd" : selected === "12M" ? "12m" : "30d"}
              nuclearOverlay={showNuclear ? nuclearData.data : undefined}
              preAggregated={genData.resolution === "weekly"}
            />
          ) : (
            <StackedAreaChart
              data={genData.data}
              xFormat={hours >= 168 ? "date" : hours > 48 ? "datetime" : "time"}
              nuclearOverlay={showNuclear ? nuclearData.data : undefined}
            />
          )}

          {/* Legend + Share buttons in one row */}
          {!loading && !error && genData.data.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 8px 0", marginTop: 8,
              borderTop: `1px solid ${v("--color-border")}`,
            }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS.renewable, flexShrink: 0 }} />
                  <span style={{ color: v("--color-text-muted") }}>Erneuerbare</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS.fossil, flexShrink: 0 }} />
                  <span style={{ color: v("--color-text-muted") }}>Fossil</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS.other, flexShrink: 0 }} />
                  <span style={{ color: v("--color-text-muted") }}>Sonstige</span>
                </div>
                {(hasDomesticNuclear || showNuclear) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                    <span style={{ color: v("--color-text-muted") }}>Kernenergie</span>
                    {hasDomesticNuclear && (
                      <>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS.nuclear, flexShrink: 0 }} />
                        <span style={{ color: v("--color-text-faint"), fontSize: 10 }}>erzeugt</span>
                      </>
                    )}
                    {showNuclear && (
                      nuclearLoading ? <BouncingDots /> : (
                        <>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS.nuclearImport, flexShrink: 0 }} />
                          <span style={{ color: v("--color-text-faint"), fontSize: 10 }}>importiert</span>
                        </>
                      )
                    )}
                  </div>
                )}
              </div>
              <ChartExportBar
                onDownload={energyChartExport.downloadPng}
                onShare={energyChartExport.sharePng}
                onWhatsApp={energyChartExport.shareWhatsApp}
                onTwitter={energyChartExport.shareTwitter}
                isExporting={energyChartExport.isExporting}
                canNativeShare={energyChartExport.canNativeShare}
              />
            </div>
          )}
        </div>
      </div>

      {/* Jahres-Einordnung (nur Jahres-/Max-Ansicht) */}
      {(isYear || isMax) && <MilestoneBlock selected={selected} isMax={isMax} />}

      {/* Solar-Trend: Monatsvergleich zum Vorjahr */}
      <SolarTrendCard />

      {/* Methodology note */}
      {showNuclear && !nuclearLoading && nuclearImportGWh > 0 && (
        <div style={{
          fontSize: 10, color: v("--color-text-faint"), lineHeight: 1.6,
          marginBottom: 20, padding: "0 8px",
        }}>
          <strong style={{ color: v("--color-text-muted") }}>Importierte Kernenergie:</strong>{" "}
          Rechnerischer Kernenergie-Import = Physische Grenzflüsse × Kernanteil des Exportlandes.
          Methodik analog Fraunhofer ISE. Nur Importe aus FR, CZ, CH, SE, BE, NL.{" "}
          <a href="/atomstrom-import" style={{ color: v("--color-accent"), fontWeight: 600, textDecoration: "none" }}>
            Mehr zum Atomstrom-Import
          </a>
        </div>
      )}

      {/* Source Attribution */}
      <div
        style={{
          textAlign: "center",
          fontSize: 10,
          color: v("--color-text-faint"),
          marginBottom: 32,
          lineHeight: 1.6,
        }}
      >
        Datenquelle: {sourceLabel(DATA_SOURCES.energyCharts)}
        {" · "}
        <a href="/atomstrom-import" style={{ color: v("--color-accent"), fontWeight: 600, textDecoration: "none" }}>
          Wie viel Atomstrom importiert Deutschland?
        </a>
      </div>

    </div>
  );
}
