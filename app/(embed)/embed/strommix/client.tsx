"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import StackedAreaChart from "../../../../components/charts/StackedAreaChart";
import StackedBarChart from "../../../../components/charts/StackedBarChart";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
} from "../../../../components/Icons";
import { useGenerationMix, useNuclearImport } from "../../../../lib/energy";
import { parseWidgetThemeQuery } from "../../../../lib/widget-theme";
import {
  CATEGORY_COLORS,
  FOSSIL_KEYS,
  GENERATION_STACK_KEYS,
  RENEWABLE_KEYS,
} from "../../../../lib/chart-utils";

// ─── Configuration ──────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://sebastianschaeder.de",
  "https://www.sebastianschaeder.de",
  "https://solar-check.io",
  "https://www.solar-check.io",
  "http://localhost:4321",
  "http://localhost:4322",
  "http://localhost:3041",
];

const ALLOWED_VARS = [
  "--widget-bg",
  "--widget-fg",
  "--widget-muted",
  "--widget-accent",
  "--widget-accent-fg",
  "--widget-border-radius",
  "--widget-font-family",
];

// ─── Time range definitions ─────────────────────────────────────────────────
type TabState =
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
  const [tab, setTab] = useState<TabState>({ id: "7d" });

  // Static theme via iframe URL params (copy-paste embed code path)
  useEffect(() => {
    const theme = parseWidgetThemeQuery(window.location.search);
    const root = document.documentElement;
    Object.keys(theme).forEach((k) => {
      if (ALLOWED_VARS.indexOf(k) !== -1) root.style.setProperty(k, theme[k]);
    });
  }, []);

  // Theme override listener
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (ALLOWED_ORIGINS.indexOf(event.origin) === -1) return;
      const payload = event.data as
        | { type?: unknown; vars?: unknown }
        | undefined;
      if (!payload || payload.type !== "widget:theme") return;

      const vars =
        payload.vars && typeof payload.vars === "object"
          ? (payload.vars as Record<string, unknown>)
          : {};
      const root = document.documentElement;

      if (Object.keys(vars).length === 0) {
        ALLOWED_VARS.forEach((k) => root.style.removeProperty(k));
        return;
      }

      Object.keys(vars).forEach((k) => {
        const val = vars[k];
        if (ALLOWED_VARS.indexOf(k) !== -1 && typeof val === "string") {
          root.style.setProperty(k, val);
        }
      });
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

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
    >
      <TopBar tab={tab} onTab={setTab} />
      <ChartArea tab={tab} />
      <Footer />
    </div>
  );
}

// ─── TopBar ─────────────────────────────────────────────────────────────────
function TopBar({
  tab,
  onTab,
}: {
  tab: TabState;
  onTab: (t: TabState) => void;
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
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
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

  // 7d → smooth area, 30d / year → stacked bars
  const useArea = tab.id === "7d";
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
            xFormat="date"
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

function Footer() {
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
      <div
        style={{
          fontSize: 10.5,
          color: "var(--widget-muted)",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 5,
        }}
      >
        <span>Powered by</span>
        <a
          href="https://solar-check.io"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            textDecoration: "none",
            color: "#1365EA",
            fontWeight: 600,
          }}
        >
          <SolarCheckMark />
          <span>solar-check.io</span>
        </a>
      </div>
    </div>
  );
}

/**
 * Solar-Check brand mark — the rounded-square icon from the official logo,
 * with the original two brand colours hardcoded so it stays on-brand
 * regardless of widget theme overrides.
 */
function SolarCheckMark() {
  return (
    <svg
      width={11}
      height={11}
      viewBox="0 0 21 31"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}
      aria-hidden="true"
    >
      <defs>
        <clipPath id="sc-mark-clip">
          <path d="M0 5.20788C0 2.33165 2.33165 0 5.20788 0H15.8842C18.7605 0 21.0921 2.33165 21.0921 5.20788V25.7789C21.0921 28.6552 18.7605 30.9868 15.8842 30.9868H5.20788C2.33165 30.9868 0 28.6552 0 25.7789V5.20788Z" />
        </clipPath>
        <linearGradient id="sc-mark-grad" x1="10.6766" y1="19.2691" x2="10.6766" y2="6.11926" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1365EA" />
          <stop offset="1" stopColor="#1365EA" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g clipPath="url(#sc-mark-clip)">
        <path
          d="M0 5.20788C0 2.33165 2.33165 0 5.20788 0H15.8842C18.7605 0 21.0921 2.33165 21.0921 5.20788V25.7789C21.0921 28.6552 18.7605 30.9868 15.8842 30.9868H5.20788C2.33165 30.9868 0 28.6552 0 25.7789V5.20788Z"
          fill="#1365EA"
          fillOpacity="0.1"
        />
        <path
          opacity="0.4"
          d="M19.9426 7.4969L8.46848 18.9012C8.26417 19.1043 7.9338 19.1029 7.73118 18.8982L1.40751 12.5079C1.20551 12.3038 1.20688 11.9747 1.41056 11.7722L12.8846 0.367931C13.089 0.164858 13.4193 0.166227 13.622 0.370985L19.9456 6.76121C20.1476 6.96533 20.1463 7.29445 19.9426 7.4969Z"
          fill="url(#sc-mark-grad)"
        />
        <path
          d="M20.9417 12.5133L9.22402 24.3575C8.89676 24.6883 8.33301 24.4566 8.33301 23.9913V20.4021C8.33301 20.2649 8.38711 20.1333 8.48357 20.0358L20.2013 8.19161C20.5286 7.86082 21.0923 8.09256 21.0923 8.55789V12.1471C21.0923 12.2842 21.0382 12.4158 20.9417 12.5133Z"
          fill="#1365EA"
        />
        <path
          d="M20.9417 18.242L9.22402 30.0862C8.89676 30.417 8.33301 30.1853 8.33301 29.7199V26.1308C8.33301 25.9936 8.38711 25.862 8.48357 25.7645L20.2013 13.9203C20.5286 13.5895 21.0923 13.8212 21.0923 14.2866V17.8757C21.0923 18.0129 21.0382 18.1445 20.9417 18.242Z"
          fill="#1365EA"
        />
        <path
          d="M7.78404 25.5043L0.892121 18.4919C0.565371 18.1594 0 18.3908 0 18.8569V22.4412C0 22.5777 0.0535 22.7088 0.1492 22.8062L7.0411 29.8186C7.3679 30.1511 7.9334 29.9197 7.9334 29.4536V25.8694C7.9334 25.7328 7.8797 25.6017 7.78404 25.5043Z"
          fill="#073C93"
        />
        <path
          d="M7.78404 19.8983L0.892121 12.8859C0.565371 12.5535 0 12.7848 0 13.251V16.8352C0 16.9717 0.0535 17.1028 0.1492 17.2002L7.0411 24.2126C7.3679 24.5451 7.9334 24.3137 7.9334 23.8476V20.2634C7.9334 20.1268 7.8797 19.9957 7.78404 19.8983Z"
          fill="#073C93"
        />
      </g>
    </svg>
  );
}

// ─── Formatters ─────────────────────────────────────────────────────────────
function formatPercent(v: number): string {
  if (v >= 10) return `${Math.round(v)} %`;
  return `${v.toFixed(1).replace(".", ",")} %`;
}
