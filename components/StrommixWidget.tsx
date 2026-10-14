"use client";
import {ENERGY_WIDGET_STYLE,ENERGY_WIDGET_CATEGORIES as CATEGORY_COLORS} from "../lib/energy-widget-palette";
import stage from "./EnergyEditorialStage.module.css";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useGenerationMix, useNuclearImport, type GenerationData } from "../lib/energy";
import EnergyDataNotice from "./energy/EnergyDataNotice";
import { energieQuelle, quellenHinweis, letzterZeitpunkt } from "../lib/energy-ersatzstand";
import StackedAreaChart from "./charts/StackedAreaChart";
import EventTimeline from "./charts/EventTimeline";
import StackedBarChart from "./charts/StackedBarChart";
import {
  formatGWhIn, energyUnit, calcPeriodStats, CHART_MARGIN, CHART_HEIGHT,
} from "../lib/chart-utils";
import { v, space, pad } from "../lib/theme";
import { STROMMIX_MILESTONES, milestonesForYear, strommixTimelineEvents } from "../lib/strommix-milestones";
import { ExportableWidgetFrame } from "./dashboard/ExportableWidgetFrame";
import { WIDGETS } from "../lib/widget-registry";
import { Auswahl } from "./Auswahl";
import {useWidgetPresentation} from "./dashboard/WidgetPresentationContext";

import { LoadingDots as BouncingDots } from "./LoadingDots";
// Das Ende eines Datenbereichs ist ein deutscher Kalendertag — mit der Weltzeit
// fehlten zwischen 00:00 und 02:00 die letzten Stunden (lib/zeit.ts).
import { heuteInBerlin } from "../lib/zeit";

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
    ? heuteInBerlin()
    : `${year}-12-31`;
  return { start: `${year}-01-01`, end };
}

function splitValueUnit(formatted: string): [string, string] {
  const split = formatted.lastIndexOf(" ");
  return split < 0 ? [formatted, ""] : [formatted.slice(0,split), formatted.slice(split+1)];
}

// ─── Shared Button Style ────────────────────────────────────────────────────


function MilestoneTimeline() {
  const events = useMemo(() => strommixTimelineEvents(), []);
  // Zuletzt Geschehenes zuerst: Wer die Ansicht öffnet, sieht die jüngste
  // Marke, nicht die von vor sechs Jahren.
  const [active, setActive] = useState(events.length - 1);
  const startYear = 2015; // Beginn der Energy-Charts-Reihe = linke Achsenkante
  const endYear = new Date().getFullYear();
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: v("--font-size-small"), fontWeight: 700, color: v("--color-text-primary"), marginBottom: space.sm, paddingLeft: 8 }}>
        Was die Jahre geprägt hat
      </div>
      <EventTimeline
        events={events}
        active={active}
        onChange={setActive}
        startYear={startYear}
        endYear={endYear}
        margin={{ left: CHART_MARGIN.left, right: CHART_MARGIN.right }}
      />
    </div>
  );
}

/** Ereignis-Einordnung unter dem Chart: für ein gewähltes Jahr dessen Marken,
 *  in der Max-Ansicht die ganze Reihe. */
function MilestoneBlock({ selected, isMax }: { selected: string; isMax: boolean }) {
  const items = isMax ? STROMMIX_MILESTONES : milestonesForYear(Number(selected));
  if (items.length === 0) return null;
  return (
    <div
      style={{
        background: "color-mix(in srgb, var(--widget-ink) 6%, var(--widget-surface))",
        border: "none",
        borderRadius: v("--radius-md"),
        padding: pad("md", "lg"),
        marginBottom: 20,
      }}
    >
      <div style={{ fontSize: v("--font-size-small"), fontWeight: 700, color: v("--color-text-primary"), marginBottom: space.sm }}>
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
                  fontSize: v("--font-size-small"),
                  color: v("--color-accent"),
                }}
              >
                {m.year}
              </span>
            )}
            <div style={{ fontSize: v("--font-size-body"), lineHeight: 1.6, color: v("--color-text-secondary") }}>
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
      height: CHART_HEIGHT,
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      color: v("--color-text-muted"),
      fontSize: v("--font-size-small"),
    }}>
      <BouncingDots />
      Lade Daten…
    </div>
  );
}

// BouncingDots → components/LoadingDots (imported above as aliased BouncingDots).

// ─── Component ──────────────────────────────────────────────────────────────

export default function StrommixWidget({ initialData, initialNuclear = true, editorial = false, onsite = true, switchable = true, range, branding = true, embed = true }: { initialData?: GenerationData; initialNuclear?: boolean; editorial?: boolean; onsite?: boolean; switchable?: boolean; range?: string; branding?: boolean; embed?: boolean }) {
  const allocated = useWidgetPresentation().layout === "allocated";
  const searchParams = useSearchParams();
  const [compactUnits,setCompactUnits] = useState(false);
  useEffect(()=>{
    const media=window.matchMedia('(max-width: 600px)');
    const update=()=>setCompactUnits(media.matches);
    update();media.addEventListener('change',update);
    return ()=>media.removeEventListener('change',update);
  },[]);
  const [selected, setSelected] = useState(() => parseRangeParam(searchParams.get("range")) ?? "24h");
  useEffect(()=>{if(range)setSelected(range==='year'?'YTD':parseRangeParam(range)??'24h');},[range]);
  const [showNuclear, setShowNuclear] = useState(initialNuclear);

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
  const availableYears = useMemo(() => getAvailableYears(), []);
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
    if (isMax) return { start: "2015-01-01", end: heuteInBerlin() };
    if (isYear) return getYearRange(Number(selected));
    return undefined;
  }, [selected, isYear, isMax]);

  const { data: genData, loading, error, isStale, refetch } = useGenerationMix("de", hours, dateRange, hours === 24 && !dateRange ? initialData : undefined);
  const { data: nuclearData, loading: nuclearLoading, error: nuclearError } = useNuclearImport(hours, dateRange);

  const stats = useMemo(() => calcPeriodStats(genData.data, genData.resolution), [genData.data, genData.resolution]);
  // Energy-Charts down: SMARD's live numbers or our stored copy, said next to the chart.
  const quellenNotiz = quellenHinweis(genData, letzterZeitpunkt(genData.data));

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

  return (
    <div data-strommix-widget style={{ width: "100%", margin: "0 auto", minWidth: 0, ...(allocated ? {height:"100%", minHeight:0, display:"flex", flexDirection:"column"} as const : {}) }}>
      {/* The hero (h1 + intro) lives in page.tsx: this component reads the URL
          and renders only in the browser, so a heading here was missing from
          the server HTML (SEO audit 27.09.2026). */}



      {/* Bereichs-Überschrift für das Strommix-Widget: Umschalter, Kacheln und
          Verlaufs-Chart gehören zusammen und beginnen hier. Vorher fing der
          Abschnitt mit einer nackten Knopfreihe an. */}
      {editorial && <header className={stage.sectionIntro}>
        <h2>Wie verändert sich Deutschlands Stromerzeugung?</h2>
        <p>{stats ? <>Im ausgewählten Zeitraum kamen <strong>{Math.round(stats.eeSharePct)} %</strong> der öffentlichen Nettostromerzeugung aus erneuerbaren Quellen. Insgesamt wurden <strong>{stats.totalGenerationGWh.toLocaleString('de-DE',{maximumFractionDigits:0})} GWh</strong> erzeugt.</> : 'Wind, Solar und konventionelle Kraftwerke tragen im Tagesverlauf und über die Jahre unterschiedlich viel zur Stromerzeugung bei.'}</p>
      </header>}

      <ExportableWidgetFrame widget={{...WIDGETS.strommix, sources: [energieQuelle(genData)]}}
        place="Deutschland" title="Stromerzeugung nach Energieträger" kind="time-series"
        filename={`solar-check-strommix-${selected}`} stand={letzterZeitpunkt(genData.data) ?? rangeLabel}
        stateLabel={rangeLabel} sourceVisible={!onsite} shareParams={{range:selected}}
        exportBranding={branding} einbetten={embed ? {params:{range:selected},height:640} : undefined}
        help={<><p>Öffentliche Nettostromerzeugung in Deutschland. Kurze Zeiträume zeigen die Leistung, längere Zeiträume die erzeugte Strommenge.</p><p>Importierte Kernenergie wird zusätzlich berechnet: Grenzflüsse multipliziert mit dem Kernenergie-Anteil des Nachbarlandes.</p><p>Datenstand: {letzterZeitpunkt(genData.data) ? new Date(letzterZeitpunkt(genData.data)!).toLocaleString('de-DE',{timeZone:'Europe/Berlin'}) : 'Noch nicht verfügbar'}.</p></>}
        settingsPlacement="below-title"
        settings={switchable ? <Auswahl titel={rangeLabel} aktiv={selected} onWahl={selectRange} breite={220} suchbar={false} eintraege={[
          ...LETZTE_RANGES.map(r=>({schluessel:r.value,name:`Letzte ${r.label}`})),
          {schluessel:'YTD',name:`${new Date().getFullYear()} bis heute`},
          ...availableYears.map(y=>({schluessel:String(y),name:String(y)})),
          {schluessel:'MAX',name:'Seit 2015'},
        ]}/> : undefined}>
      <div className="sc-widget-inset" data-widget-loading={loading} style={ENERGY_WIDGET_STYLE}>
      {/* Summary Widgets — horizontal row (always visible) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))",
          gap: 8,
          marginBottom: 20,
        }}
      >
        {(() => {
          // Determine consistent unit for all energy widgets based on total generation
          const wUnit = compactUnits ? "TWh" : stats ? energyUnit(stats.totalGenerationGWh) : "TWh";
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
            background: "color-mix(in srgb, var(--widget-ink) 6%, var(--widget-surface))",
            border: "none",
            borderRadius: v("--radius-md"),
            padding: "12px 8px", textAlign: "center",
          }}>
            <div style={{ fontSize: v("--font-size-micro"), color: v("--color-text-muted"), marginBottom: 2 }}>{label}</div>
            <div style={{ fontFamily: v("--font-mono"), fontWeight: 800, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {value === null ? (
                <BouncingDots />
              ) : (
                <>
                  <span style={{ fontSize: v("--font-size-display-sm"), color: v("--color-text-primary") }}>{value}</span>
                  <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), marginLeft: 3 }}>{unit}</span>
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
          const wUnit = compactUnits ? "TWh" : stats ? energyUnit(stats.totalGenerationGWh) : "TWh";
          const nucFormatted = hasAny ? splitValueUnit(formatGWhIn(totalNucGWh, wUnit)) : null;
          const importFormatted = hasImport ? splitValueUnit(formatGWhIn(nuclearImportGWh, wUnit)) : null;

          return (
            <button
              aria-pressed={showNuclear}
              aria-label="Importierte Kernenergie einblenden"
              onClick={() => !nuclearLoading && setShowNuclear(!showNuclear)}
              style={{
                flex: "1 0 0", minWidth: 80,
                background: "color-mix(in srgb, var(--widget-ink) 6%, var(--widget-surface))",
                border: "none",
                borderRadius: v("--radius-md"),
                padding: "12px 8px", textAlign: "center",
                cursor: nuclearLoading ? "default" : "pointer", fontFamily: v("--font-text"),
                opacity: nuclearLoading ? 0.6 : showNuclear ? 1 : 0.5,
              }}
            >
              <div style={{ fontSize: v("--font-size-micro"), color: v("--color-text-muted"), marginBottom: 2 }}>Kernenergie (inkl. Import)</div>
              <div style={{ fontFamily: v("--font-mono"), fontWeight: 800, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {nuclearLoading && !hasAny ? (
                  <BouncingDots />
                ) : nuclearError && !hasAny ? (
                  <span style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), fontWeight: 400, fontFamily: v("--font-text") }}>Nicht verfügbar</span>
                ) : hasAny && nucFormatted ? (
                  <>
                    <span style={{ fontSize: v("--font-size-display-sm"), color: v("--color-text-primary") }}>{nucFormatted[0]}</span>
                    <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), marginLeft: 3 }}>{nucFormatted[1]}</span>
                  </>
                ) : (
                  <span style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), fontWeight: 400, fontFamily: v("--font-text") }}>—</span>
                )}
              </div>
              {hasDomestic && hasImport && importFormatted && (
                <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginTop: 2, lineHeight: 1.4, fontFamily: v("--font-mono") }}>
                  Zukauf {importFormatted[0]} <span style={{ fontSize: v("--font-size-micro"), color: v("--color-text-faint") }}>{importFormatted[1]}</span>
                </div>
              )}
            </button>
          );
        })()}
      </div>

        {/* Energy-Charts down, the route serves our last stored copy: say why
            the curve ends early and when, instead of an empty box. */}
        {quellenNotiz && !loading && (
          <EnergyDataNotice details={quellenNotiz}/>
        )}
        {isStale && !genData.stale && (
          <div style={{
            fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginBottom: 8, paddingLeft: 8,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span>Aktualisierung fehlgeschlagen — zeige zwischengespeicherte Daten</span>
            <button
              onClick={refetch}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: v("--color-accent"), fontSize: v("--font-size-caption"), fontWeight: 600,
                fontFamily: v("--font-text"), padding: 0, textDecoration: "underline",
              }}
            >
              Erneut versuchen
            </button>
          </div>
        )}

        <div>
          {loading ? (
            <LoadingSpinner />
          ) : error && genData.data.length === 0 ? (
            <div
              style={{
                height: CHART_HEIGHT,
                display: "flex",
                flexDirection: "column" as const,
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                fontSize: v("--font-size-small"),
              }}
            >
              <div style={{ color: v("--color-text-muted") }}>Daten konnten nicht geladen werden</div>
              <button
                onClick={refetch}
                style={{
                  padding: "8px 20px",
                  borderRadius: v("--radius-pill"),
                  border: `1px solid ${v("--color-accent")}`,
                  background: v("--color-cta"),
                  color: v("--color-text-on-accent"),
                  fontSize: v("--font-size-small"),
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
          {(
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between",
              padding: "12px 8px 0", marginTop: 8,
              borderTop: `1px solid ${v("--color-border")}`,
            }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: v("--font-size-caption") }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS.renewable, flexShrink: 0 }} />
                  <span style={{ color: v("--color-text-muted") }}>Erneuerbare</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: v("--font-size-caption") }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS.fossil, flexShrink: 0 }} />
                  <span style={{ color: v("--color-text-muted") }}>Fossil</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: v("--font-size-caption") }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS.other, flexShrink: 0 }} />
                  <span style={{ color: v("--color-text-muted") }}>Sonstige</span>
                </div>
                {(hasDomesticNuclear || showNuclear) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: v("--font-size-caption") }}>
                    <span style={{ color: v("--color-text-muted") }}>Kernenergie</span>
                    {hasDomesticNuclear && (
                      <>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS.nuclear, flexShrink: 0 }} />
                        <span style={{ color: v("--color-text-faint"), fontSize: v("--font-size-micro") }}>erzeugt</span>
                      </>
                    )}
                    {showNuclear && (
                      nuclearLoading ? <BouncingDots /> : (
                        <>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS.nuclearImport, flexShrink: 0 }} />
                          <span style={{ color: v("--color-text-faint"), fontSize: v("--font-size-micro") }}>importiert</span>
                        </>
                      )
                    )}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
      </ExportableWidgetFrame>

      {/* Jahres-Einordnung (nur Jahres-/Max-Ansicht) */}
      {editorial && (isMax ? <MilestoneTimeline /> : isYear ? <MilestoneBlock selected={selected} isMax={false} /> : null)}


    </div>
  );
}
