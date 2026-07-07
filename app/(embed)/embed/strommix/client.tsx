"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import StackedAreaChart from "../../../../components/charts/StackedAreaChart";
import StackedBarChart from "../../../../components/charts/StackedBarChart";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
} from "../../../../components/Icons";
import ChartActionBar from "../../../../components/ChartActionBar";
import { PoweredBy, DataSourceNote } from "../../../../components/PoweredBy";
import { DATA_SOURCES, sourceLabel } from "../../../../lib/data-sources";
import { useChartExport } from "../../../../lib/useChartExport";
import { useGenerationMix, useNuclearImport } from "../../../../lib/energy";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import {
  WIDGET_SETTINGS_DEFAULTS,
  WidgetSettings,
  WidgetRange,
} from "../../../../lib/widget-settings";

// Where the share buttons point — the canonical source page for this widget.
const SHARE_URL = "https://solar-check.io/strommix-deutschland";
const SHARE_TEXT = "Strommix Deutschland – live bei Solar Check";

function rangeToTab(range: WidgetRange): TabState {
  if (range === "24h") return { id: "24h" };
  if (range === "30d") return { id: "30d" };
  if (range === "year") return { id: "year", year: new Date().getFullYear() };
  return { id: "7d" };
}

function tabLabel(tab: TabState): string {
  if (tab.id === "24h") return "Die letzten 24 Stunden";
  if (tab.id === "7d") return "Die letzten 7 Tage";
  if (tab.id === "30d") return "Die letzten 30 Tage";
  return `Jahr ${tab.year}`;
}
import {
  CATEGORY_COLORS,
  FOSSIL_KEYS,
  GENERATION_STACK_KEYS,
  RENEWABLE_KEYS,
} from "../../../../lib/chart-utils";

// ─── Time range definitions ─────────────────────────────────────────────────
type TabState =
  | { id: "24h" }
  | { id: "7d" }
  | { id: "30d" }
  | { id: "year"; year: number };

function getAvailableYears(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear; y >= 2015; y--) years.push(y);
  return years;
}

function getYearRange(year: number): { start: string; end: string } {
  const currentYear = new Date().getFullYear();
  const end =
    year === currentYear
      ? new Date().toISOString().slice(0, 10)
      : `${year}-12-31`;
  return { start: `${year}-01-01`, end };
}

function tabHours(tab: TabState): number {
  if (tab.id === "24h") return 24;
  if (tab.id === "7d") return 168;
  if (tab.id === "30d") return 720;
  return 8760;
}

function tabDateRange(tab: TabState): { start: string; end: string } | undefined {
  if (tab.id === "year") return getYearRange(tab.year);
  return undefined;
}

// ─── Range pill style (mirrors /energie rangeButtonStyle) ───────────────────
function rangeButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: "var(--radius-sm)",
    border: `1px solid ${active ? "var(--widget-accent)" : "var(--color-border)"}`,
    background: active ? "var(--widget-accent)" : "transparent",
    color: active ? "var(--widget-accent-fg)" : "var(--widget-muted)",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function StrommixWidget() {
  const [settings, setSettings] = useState<WidgetSettings>(WIDGET_SETTINGS_DEFAULTS);
  const [tab, setTab] = useState<TabState>({ id: "7d" });

  const chartExport = useChartExport({
    context: { title: "Strommix Deutschland", subtitle: tabLabel(tab), source: sourceLabel(DATA_SOURCES.energyCharts) },
    filename: "solar-check-strommix.png",
    shareText: SHARE_TEXT,
    shareUrl: SHARE_URL,
    mode: "node",
  });

  // Theme + functional settings (URL params + same-origin postMessage) via the
  // shared hook. Range changes also drive the active tab.
  useWidgetTheme({
    onSettings: (partial) => {
      setSettings((prev) => ({ ...prev, ...partial }));
      if (partial.range) setTab(rangeToTab(partial.range));
    },
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--widget-bg)",
        color: "var(--widget-fg)",
        borderRadius: "var(--widget-border-radius)",
        fontFamily: "var(--widget-font-family)",
        padding: 20,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
      ref={chartExport.chartRef}
    >
      <TopBar tab={tab} onTab={setTab} switchable={settings.switchable} />
      <div>
        <ChartArea tab={tab} />
      </div>
      <Footer
        share={settings.share}
        embed={settings.embed}
        branding={settings.branding}
        chartExport={chartExport}
      />
    </div>
  );
}

// ─── TopBar ─────────────────────────────────────────────────────────────────
function TopBar({
  tab,
  onTab,
  switchable,
}: {
  tab: TabState;
  onTab: (t: TabState) => void;
  switchable: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.2 }}>
        Strommix Deutschland
      </div>
      {switchable && (
        <div data-sc-export-ignore="" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => onTab({ id: "24h" })}
            style={rangeButtonStyle(tab.id === "24h")}
          >
            24 Std
          </button>
          <button
            type="button"
            onClick={() => onTab({ id: "7d" })}
            style={rangeButtonStyle(tab.id === "7d")}
          >
            7 Tage
          </button>
          <button
            type="button"
            onClick={() => onTab({ id: "30d" })}
            style={rangeButtonStyle(tab.id === "30d")}
          >
            30 Tage
          </button>
          <YearGroup
            active={tab.id === "year"}
            year={tab.id === "year" ? tab.year : null}
            onChange={(y) => onTab({ id: "year", year: y })}
          />
        </div>
      )}
    </div>
  );
}

// ─── Year selector group (3 connected pills, matches /energie) ──────────────
function YearGroup({
  active,
  year,
  onChange,
}: {
  active: boolean;
  year: number | null;
  onChange: (year: number) => void;
}) {
  const years = useMemo(() => getAvailableYears(), []);
  const currentYear = years[0];
  const selectedYear = year ?? currentYear;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const idx = years.indexOf(selectedYear);
  const canPrev = idx < years.length - 1; // older year still available
  const canNext = idx > 0; // newer year still available

  function clickPrev() {
    if (!active) {
      onChange(currentYear - 1);
      return;
    }
    if (canPrev) onChange(years[idx + 1]);
  }
  function clickNext() {
    if (active && canNext) onChange(years[idx - 1]);
  }

  return (
    <div style={{ display: "flex", alignItems: "stretch" }}>
      <button
        type="button"
        onClick={clickPrev}
        style={{
          ...rangeButtonStyle(false),
          borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)",
          borderRight: "none",
          padding: "0 6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="Vorheriges Jahr"
      >
        <IconChevronLeft size={10} />
      </button>
      <div ref={ref} style={{ position: "relative", display: "flex" }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            ...rangeButtonStyle(active),
            borderRadius: 0,
            display: "flex",
            alignItems: "center",
            gap: 4,
            minWidth: 60,
            justifyContent: "center",
          }}
        >
          {active ? selectedYear : "Jahr"}
          <IconChevronDown size={8} />
        </button>
        {open && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: "50%",
              transform: "translateX(-50%)",
              background: "var(--widget-bg)",
              border: `1px solid var(--color-border)`,
              borderRadius: "var(--radius-sm)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              zIndex: 20,
              padding: "4px 0",
              minWidth: 80,
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => {
                  onChange(y);
                  setOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "6px 14px",
                  border: "none",
                  background:
                    active && y === selectedYear
                      ? "color-mix(in srgb,var(--widget-accent) 12%,transparent)"
                      : "transparent",
                  color:
                    active && y === selectedYear
                      ? "var(--widget-accent)"
                      : "var(--widget-muted)",
                  fontSize: 12,
                  fontWeight: active && y === selectedYear ? 700 : 400,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={clickNext}
        disabled={!active || !canNext}
        style={{
          ...rangeButtonStyle(false),
          borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
          borderLeft: "none",
          padding: "0 6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: !active || !canNext ? 0.4 : 1,
          cursor: !active || !canNext ? "not-allowed" : "pointer",
        }}
        aria-label="Nächstes Jahr"
      >
        <IconChevronRight size={10} />
      </button>
    </div>
  );
}

// ─── Chart Area ─────────────────────────────────────────────────────────────
function ChartArea({ tab }: { tab: TabState }) {
  const hours = tabHours(tab);
  const dateRange = tabDateRange(tab);
  const { data: genData, error, refetch } = useGenerationMix(
    "de",
    hours,
    dateRange,
  );
  const { data: nuclearData } = useNuclearImport(hours, dateRange);

  // Period-mean shares aggregated into four buckets: renewable, fossil,
  // nuclear (domestic + imported), and other. Only non-zero categories
  // are shown in the headline.
  const shares = useMemo(() => {
    if (!genData.data.length) return null;
    let renew = 0;
    let foss = 0;
    let nuc = 0;
    let other = 0;
    const isWeekly = genData.resolution === "weekly";
    let intervalHours = 0.25;
    if (!isWeekly && genData.data.length >= 2) {
      const t0 = new Date(genData.data[0].ts).getTime();
      const t1 = new Date(genData.data[1].ts).getTime();
      intervalHours = (t1 - t0) / (1000 * 60 * 60);
    }
    for (const d of genData.data) {
      for (const key of GENERATION_STACK_KEYS) {
        const raw = d[key];
        const v = typeof raw === "number" ? raw : 0;
        if (v <= 0) continue;
        const energy = isWeekly ? v : (v * intervalHours) / 1000;
        if (RENEWABLE_KEYS.includes(key)) renew += energy;
        else if (FOSSIL_KEYS.includes(key)) foss += energy;
        else if (key === "nuclear") nuc += energy;
        else other += energy;
      }
      // Pre-aggregated weekly rows ship a separate nuclear_import column.
      if (isWeekly) {
        const ni = d.nuclear_import;
        if (typeof ni === "number" && ni > 0) nuc += ni;
      }
    }
    // Live data: nuclear import comes from the parallel /api/energy/nuclear-import
    // endpoint. Sum nuclear_gw × intervalHours into GWh.
    if (!isWeekly && nuclearData.data.length >= 2) {
      const t0 = new Date(nuclearData.data[0].ts).getTime();
      const t1 = new Date(nuclearData.data[1].ts).getTime();
      const niInterval = (t1 - t0) / (1000 * 60 * 60);
      for (const d of nuclearData.data) {
        if (d.nuclear_gw > 0) nuc += d.nuclear_gw * niInterval;
      }
    }
    const total = renew + foss + nuc + other;
    if (total <= 0) return null;
    const pct = (n: number) => Math.round((n / total) * 1000) / 10;
    return {
      renewable: pct(renew),
      fossil: pct(foss),
      nuclear: pct(nuc),
      other: pct(other),
    };
  }, [genData.data, genData.resolution, nuclearData.data]);

  // 24h / 7d → smooth area, 30d / year → stacked bars
  const useArea = tab.id === "24h" || tab.id === "7d";
  const barMode: "30d" | "ytd" = tab.id === "30d" ? "30d" : "ytd";

  return (
    <div style={{ flex: 1, marginTop: 14, display: "flex", flexDirection: "column" }}>
      <Headline shares={shares} />
      <div style={{ flex: 1, minHeight: 220, position: "relative" }}>
        {error && genData.data.length === 0 && (
          <CenteredMessage
            text="Daten gerade nicht verfügbar."
            action={{ label: "Erneut versuchen", onClick: refetch }}
          />
        )}
        {!error && genData.data.length === 0 && (
          <CenteredMessage text="Lade Daten…" />
        )}
        {genData.data.length > 0 && useArea && (
          <StackedAreaChart
            data={genData.data}
            xFormat={tab.id === "24h" ? "time" : "date"}
            height={220}
            nuclearOverlay={nuclearData.data}
            compact
          />
        )}
        {genData.data.length > 0 && !useArea && (
          <StackedBarChart
            data={genData.data}
            mode={barMode}
            preAggregated={genData.resolution === "weekly"}
            height={220}
            nuclearOverlay={nuclearData.data}
            compact
          />
        )}
      </div>
    </div>
  );
}

function Headline({
  shares,
}: {
  shares: {
    renewable: number;
    fossil: number;
    nuclear: number;
    other: number;
  } | null;
}) {
  if (!shares) {
    return (
      <div
        style={{
          height: 18,
          fontSize: 11.5,
          color: "var(--widget-muted)",
          marginBottom: 6,
        }}
      />
    );
  }
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        flexWrap: "wrap",
        fontSize: 11.5,
        marginBottom: 8,
      }}
    >
      <SharePill
        color={CATEGORY_COLORS.renewable}
        label="Erneuerbare"
        value={shares.renewable}
      />
      <SharePill
        color={CATEGORY_COLORS.fossil}
        label="Fossile"
        value={shares.fossil}
      />
      {shares.nuclear >= 0.5 && (
        <SharePill
          color={CATEGORY_COLORS.nuclear}
          label="Kernenergie"
          value={shares.nuclear}
        />
      )}
      <SharePill
        color={CATEGORY_COLORS.other}
        label="Sonstige"
        value={shares.other}
      />
    </div>
  );
}

function SharePill({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--widget-fg)" }}>
      <span
        style={{
          width: 9,
          height: 9,
          background: color,
          borderRadius: 2,
          display: "inline-block",
        }}
      />
      <span style={{ color: "var(--widget-muted)" }}>{label}</span>
      <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {formatPercent(value)}
      </span>
    </span>
  );
}

// ─── Reusable bits ──────────────────────────────────────────────────────────
function CenteredMessage({
  text,
  action,
}: {
  text: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        alignItems: "center",
        justifyContent: "center",
        color: "var(--widget-muted)",
        fontSize: 12,
      }}
    >
      <span>{text}</span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          style={{
            padding: "5px 12px",
            fontSize: 11,
            fontWeight: 600,
            background: "var(--widget-accent)",
            color: "var(--widget-accent-fg)",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function Footer({
  share,
  embed,
  branding,
  chartExport,
}: {
  share: boolean;
  embed: boolean;
  branding: boolean;
  chartExport: ReturnType<typeof useChartExport>;
}) {
  const copyLink = () => {
    navigator.clipboard?.writeText(`${SHARE_TEXT}\n${SHARE_URL}`).catch(() => {});
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          height: 1,
          background: "var(--widget-muted)",
          opacity: 0.2,
          marginBottom: 8,
        }}
      />

      {/* Web footer — dropped from the export image. Source on its own line
          (lighter grey), then action bar + Powered-by. */}
      <div data-sc-export-ignore="">
        <div style={{ fontSize: 10.5, color: "var(--color-text-faint)", marginBottom: share || branding ? 6 : 0 }}>
          <DataSourceNote source={DATA_SOURCES.energyCharts} />
        </div>
        {(share || branding) && (
          <div
            style={{
              fontSize: 10.5,
              color: "var(--widget-muted)",
              display: "flex",
              justifyContent: share ? (branding ? "space-between" : "flex-start") : "flex-end",
              alignItems: "center",
              gap: 8,
            }}
          >
            {share && (
              <ChartActionBar
                onDownload={chartExport.downloadPng}
                onCopyLink={copyLink}
                onWhatsApp={chartExport.shareWhatsApp}
                onTwitter={chartExport.shareTwitter}
                onShareImage={chartExport.sharePng}
                onEmbed={
                  embed
                    ? () => window.open("/energie-widgets#strommix", "_blank", "noopener")
                    : undefined
                }
                isExporting={chartExport.isExporting}
                canNativeShare={chartExport.canNativeShare}
                size={30}
              />
            )}
            {branding && (
              <span style={{ display: "inline-flex", marginLeft: "auto" }}>
                <PoweredBy />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Print-only footer — one row: source left (no underline) + Powered-by right. */}
      <div
        data-sc-export-only="flex"
        style={{ display: "none", fontSize: 10.5, color: "var(--widget-muted)", alignItems: "center", justifyContent: "space-between", gap: 32 }}
      >
        <DataSourceNote source={DATA_SOURCES.energyCharts} plain />
        {branding && <PoweredBy />}
      </div>
    </div>
  );
}

// ─── Formatters ─────────────────────────────────────────────────────────────
function formatPercent(v: number): string {
  if (v >= 10) return `${Math.round(v)} %`;
  return `${v.toFixed(1).replace(".", ",")} %`;
}
