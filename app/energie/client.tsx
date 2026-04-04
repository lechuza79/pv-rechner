"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useGenerationMix, useNuclearImport } from "../../lib/energy";
import StackedAreaChart from "../../components/charts/StackedAreaChart";
import StackedBarChart from "../../components/charts/StackedBarChart";
import {
  formatGWh, calcPeriodStats, CATEGORY_COLORS,
} from "../../lib/chart-utils";
import { v } from "../../lib/theme";
import { useChartExport } from "../../lib/useChartExport";
import ChartExportBar from "../../components/ChartExportBar";

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
  for (let y = currentYear - 1; y >= Math.max(currentYear - 3, 2020); y--) {
    years.push(y);
  }
  return years;
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
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes nucReveal { from { clip-path: inset(0 100% 0 0) } to { clip-path: inset(0 0 0 0) } }
      `}</style>
    </div>
  );
}

function BouncingDots() {
  const dot = (delay: number) => ({
    width: 4, height: 4, borderRadius: "50%",
    background: v("--color-text-muted"),
    animation: `bounce 1.2s ease-in-out ${delay}s infinite`,
  });
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      <div style={dot(0)} />
      <div style={dot(0.15)} />
      <div style={dot(0.3)} />
      <style>{`@keyframes bounce { 0%,80%,100% { transform: scale(0.6); opacity: 0.4 } 40% { transform: scale(1); opacity: 1 } }`}</style>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function EnergieClient() {
  const [selected, setSelected] = useState("24h");
  const [showNuclear, setShowNuclear] = useState(true);
  const availableYears = useMemo(() => getAvailableYears(), []);

  const isYear = /^\d{4}$/.test(selected);
  const hours = useMemo(() => {
    if (selected === "YTD") return getYtdHours();
    if (isYear) return 8760;
    const range = LETZTE_RANGES.find(r => r.value === selected);
    return range?.hours || 24;
  }, [selected, isYear]);

  const dateRange = useMemo(() => {
    if (isYear) return getYearRange(Number(selected));
    return undefined;
  }, [selected, isYear]);

  const { data: genData, loading, error } = useGenerationMix("de", hours, dateRange);
  const { data: nuclearData, loading: nuclearLoading } = useNuclearImport(hours, dateRange);

  const stats = useMemo(() => calcPeriodStats(genData.data), [genData.data]);

  const energyChartExport = useChartExport({
    title: `Strommix Deutschland ${selected}`,
    filename: `solar-check-strommix-${selected}.png`,
    shareText: `Strommix Deutschland (${selected}) – ${stats ? `${Math.round(stats.eeSharePct)}% Erneuerbare` : ""}`,
  });

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 28, paddingTop: 10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
          Deutschlands Energiedaten
        </h1>
      </div>

      {/* Time Range Toggle — two groups side by side */}
      <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
        {/* Letzte */}
        <div>
          <div style={{ fontSize: 10, color: v("--color-text-muted"), marginBottom: 4, fontWeight: 600 }}>Letzte</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {LETZTE_RANGES.map((range) => (
              <button key={range.value} onClick={() => setSelected(range.value)} style={rangeButtonStyle(selected === range.value)}>
                {range.label}
              </button>
            ))}
          </div>
        </div>
        {/* Andere Zeiträume */}
        <div>
          <div style={{ fontSize: 10, color: v("--color-text-muted"), marginBottom: 4, fontWeight: 600 }}>Andere Zeiträume</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => setSelected("YTD")} style={rangeButtonStyle(selected === "YTD")}>
              {new Date().getFullYear()}
            </button>
            {availableYears.map((year) => (
              <button key={year} onClick={() => setSelected(String(year))} style={rangeButtonStyle(selected === String(year))}>
                {year}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Widgets — horizontal row */}
      {stats && (
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
          {/* EE Share */}
          <div style={{
            flex: "1 0 0", minWidth: 80,
            background: v("--color-bg-muted"),
            border: `1px solid ${v("--color-border")}`,
            borderRadius: v("--radius-md"),
            padding: "12px 8px", textAlign: "center",
          }}>
            <div style={{ fontSize: 9, color: v("--color-text-muted"), marginBottom: 2 }}>Erneuerbare</div>
            <div style={{ fontFamily: v("--font-mono"), fontWeight: 800 }}>
              <span style={{ fontSize: 22, color: v("--color-text-primary") }}>{Math.round(stats.eeSharePct)}</span>
              <span style={{ fontSize: 13, color: v("--color-text-muted"), marginLeft: 1 }}>%</span>
            </div>
          </div>
          {/* Total */}
          {(() => { const [val, unit] = splitValueUnit(formatGWh(stats.totalGenerationGWh)); return (
            <div style={{
              flex: "1 0 0", minWidth: 80,
              background: v("--color-bg-muted"),
              border: `1px solid ${v("--color-border")}`,
              borderRadius: v("--radius-md"),
              padding: "12px 8px", textAlign: "center",
            }}>
              <div style={{ fontSize: 9, color: v("--color-text-muted"), marginBottom: 2 }}>Erzeugt</div>
              <div style={{ fontFamily: v("--font-mono"), fontWeight: 800 }}>
                <span style={{ fontSize: 22, color: v("--color-text-primary") }}>{val}</span>
                <span style={{ fontSize: 13, color: v("--color-text-muted"), marginLeft: 3 }}>{unit}</span>
              </div>
            </div>
          ); })()}
          {/* Renewable */}
          {(() => { const [val, unit] = splitValueUnit(formatGWh(stats.renewableGWh)); return (
            <div style={{
              flex: "1 0 0", minWidth: 80,
              background: v("--color-bg-muted"),
              border: `1px solid ${v("--color-border")}`,
              borderRadius: v("--radius-md"),
              padding: "12px 8px", textAlign: "center",
            }}>
              <div style={{ fontSize: 9, color: v("--color-text-muted"), marginBottom: 2 }}>davon EE</div>
              <div style={{ fontFamily: v("--font-mono"), fontWeight: 800 }}>
                <span style={{ fontSize: 22, color: v("--color-text-primary") }}>{val}</span>
                <span style={{ fontSize: 13, color: v("--color-text-muted"), marginLeft: 3 }}>{unit}</span>
              </div>
            </div>
          ); })()}
          {/* Net Import/Export */}
          {(() => { const [val, unit] = splitValueUnit(formatGWh(Math.abs(stats.netImportGWh))); return (
            <div style={{
              flex: "1 0 0", minWidth: 80,
              background: v("--color-bg-muted"),
              border: `1px solid ${v("--color-border")}`,
              borderRadius: v("--radius-md"),
              padding: "12px 8px", textAlign: "center",
            }}>
              <div style={{ fontSize: 9, color: v("--color-text-muted"), marginBottom: 2 }}>
                Netto-{stats.netImportGWh > 0 ? "Import" : "Export"}
              </div>
              <div style={{ fontFamily: v("--font-mono"), fontWeight: 800 }}>
                <span style={{ fontSize: 22, color: v("--color-text-primary") }}>{stats.netImportGWh > 0 ? "+" : ""}{val}</span>
                <span style={{ fontSize: 13, color: v("--color-text-muted"), marginLeft: 3 }}>{unit}</span>
              </div>
            </div>
          ); })()}
          {/* Nuclear import toggle */}
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
            <div style={{ fontSize: 9, color: v("--color-text-muted"), marginBottom: 2 }}>Kernimport</div>
            <div style={{ fontFamily: v("--font-mono"), fontWeight: 800, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {nuclearLoading ? (
                <BouncingDots />
              ) : (
                <>
                  <span style={{ fontSize: 22, color: v("--color-text-primary") }}>{nuclearData.avg_gw.toFixed(1)}</span>
                  <span style={{ fontSize: 13, color: v("--color-text-muted"), marginLeft: 3 }}>GW</span>
                </>
              )}
            </div>
          </button>
        </div>
      )}

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
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, paddingLeft: 8 }}>
          Stromerzeugung nach Energieträger
        </div>

        <div ref={energyChartExport.chartRef}>
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <div
              style={{
                height: 300,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: v("--color-negative"),
                fontSize: 13,
              }}
            >
              Fehler beim Laden: {error}
            </div>
          ) : hours >= 720 || isYear ? (
            <StackedBarChart
              data={genData.data}
              mode={selected === "YTD" || isYear ? "ytd" : selected === "12M" ? "12m" : "30d"}
              nuclearOverlay={showNuclear ? nuclearData.data : undefined}
            />
          ) : (
            <StackedAreaChart
              data={genData.data}
              xFormat={hours > 168 ? "date" : hours > 48 ? "datetime" : "time"}
              nuclearOverlay={showNuclear ? nuclearData.data : undefined}
            />
          )}

          {/* Legend */}
          {!loading && !error && genData.data.length > 0 && (
            <div style={{
              display: "flex", justifyContent: "flex-start", gap: 16, flexWrap: "wrap",
              padding: "12px 8px 0", marginTop: 8,
              borderTop: `1px solid ${v("--color-border")}`,
            }}>
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
              {showNuclear && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                  {nuclearLoading ? (
                    <BouncingDots />
                  ) : (
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS.nuclearImport, flexShrink: 0 }} />
                  )}
                  <span style={{ color: v("--color-text-muted") }}>Importierte Kernenergie</span>
                </div>
              )}
            </div>
          )}
        </div>

        {!loading && !error && genData.data.length > 0 && (
          <ChartExportBar
            onDownload={energyChartExport.downloadPng}
            onShare={energyChartExport.sharePng}
            onWhatsApp={energyChartExport.shareWhatsApp}
            onTwitter={energyChartExport.shareTwitter}
            isExporting={energyChartExport.isExporting}
            canNativeShare={energyChartExport.canNativeShare}
          />
        )}
      </div>

      {/* Methodology note */}
      {showNuclear && !nuclearLoading && nuclearData.avg_gw > 0 && (
        <div style={{
          fontSize: 10, color: v("--color-text-faint"), lineHeight: 1.6,
          marginBottom: 20, padding: "0 8px",
        }}>
          <strong style={{ color: v("--color-text-muted") }}>Importierte Kernenergie:</strong>{" "}
          Rechnerischer Kernenergie-Import = Physische Grenzflüsse × Kernanteil des Exportlandes.
          Methodik analog Fraunhofer ISE. Nur Importe aus FR, CZ, CH, SE, BE, NL.
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
        Datenquelle:{" "}
        <a
          href="https://energy-charts.info"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: v("--color-text-muted"), textDecoration: "underline" }}
        >
          Fraunhofer ISE / Energy-Charts
        </a>{" "}
        (CC BY 4.0)
      </div>

      {/* Footer Links */}
      <div style={{ display: "flex", justifyContent: "center", gap: 16, padding: "16px 0" }}>
        <Link href="/" style={{ fontSize: 11, color: v("--color-text-faint"), textDecoration: "none" }}>
          Startseite
        </Link>
        <Link href="/rechner" style={{ fontSize: 11, color: v("--color-text-faint"), textDecoration: "none" }}>
          Rechner
        </Link>
        <Link href="/impressum" style={{ fontSize: 11, color: v("--color-text-faint"), textDecoration: "none" }}>
          Impressum
        </Link>
        <Link href="/datenschutz" style={{ fontSize: 11, color: v("--color-text-faint"), textDecoration: "none" }}>
          Datenschutz
        </Link>
      </div>
    </div>
  );
}
