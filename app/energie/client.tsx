"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useGenerationMix, useNuclearImport } from "../../lib/energy";
import StackedAreaChart from "../../components/charts/StackedAreaChart";
import StackedBarChart from "../../components/charts/StackedBarChart";
import {
  formatGWh, calcPeriodStats,
} from "../../lib/chart-utils";
import { v } from "../../lib/theme";

// ─── Time Range Selector ─────────────────────────────────────────────────────

const TIME_RANGES = [
  { label: "24h", hours: 24, desc: "24 Stunden" },
  { label: "7d", hours: 168, desc: "7 Tage" },
  { label: "30d", hours: 720, desc: "30 Tage" },
  { label: "YTD", hours: 0, desc: "seit Jahresbeginn" },   // calculated below
  { label: "12M", hours: 8760, desc: "12 Monate" },
] as const;

// ─── Main Component ──────────────────────────────────────────────────────────

// Calculate YTD hours dynamically
function getYtdHours(): number {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  return Math.floor((now.getTime() - jan1.getTime()) / (1000 * 60 * 60));
}

export default function EnergieClient() {
  const [selectedLabel, setSelectedLabel] = useState("24h");
  const [showNuclear, setShowNuclear] = useState(true);

  // Resolve actual hours (YTD is dynamic)
  const hours = useMemo(() => {
    const range = TIME_RANGES.find(r => r.label === selectedLabel);
    if (!range) return 24;
    if (range.label === "YTD") return getYtdHours();
    return range.hours;
  }, [selectedLabel]);

  const timeLabel = TIME_RANGES.find(r => r.label === selectedLabel)?.desc || "24 Stunden";
  const { data: genData, loading, error } = useGenerationMix("de", hours);
  const { data: nuclearData, loading: nuclearLoading } = useNuclearImport(hours);

  // Aggregate stats over the full time period
  const stats = useMemo(() => calcPeriodStats(genData.data), [genData.data]);


  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 28, paddingTop: 10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
          Deutschlands Energiedaten
        </h1>
        <p style={{ fontSize: 13, color: v("--color-text-muted"), marginTop: 6 }}>
          Live-Daten · Transparent · Quellenbasiert
        </p>
      </div>

      {/* Time Range Toggle */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
        {TIME_RANGES.map((range) => (
          <button
            key={range.label}
            onClick={() => setSelectedLabel(range.label)}
            style={{
              padding: "6px 14px",
              borderRadius: v("--radius-sm"),
              border: `1px solid ${selectedLabel === range.label ? v("--color-accent") : v("--color-border")}`,
              background: selectedLabel === range.label ? v("--color-accent") : v("--color-bg"),
              color: selectedLabel === range.label ? v("--color-text-on-accent") : v("--color-text-secondary"),
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: v("--font-text"),
            }}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* Summary Widgets — horizontal row */}
      {stats && (
        <>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 12,
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
            }}
          >
            {/* EE Share */}
            <div style={{
              flex: "1 0 0", minWidth: 90,
              background: v("--color-bg-muted"),
              border: `1px solid ${v("--color-border")}`,
              borderRadius: v("--radius-md"),
              padding: "12px 8px", textAlign: "center",
            }}>
              <div style={{ fontSize: 9, color: v("--color-text-muted"), marginBottom: 2 }}>Erneuerbare</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: v("--font-mono"), color: v("--color-text-primary") }}>
                {Math.round(stats.eeSharePct)}%
              </div>
            </div>
            {/* Total */}
            <div style={{
              flex: "1 0 0", minWidth: 90,
              background: v("--color-bg-muted"),
              border: `1px solid ${v("--color-border")}`,
              borderRadius: v("--radius-md"),
              padding: "12px 8px", textAlign: "center",
            }}>
              <div style={{ fontSize: 9, color: v("--color-text-muted"), marginBottom: 2 }}>Erzeugt</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: v("--font-mono"), color: v("--color-text-primary") }}>
                {formatGWh(stats.totalGenerationGWh)}
              </div>
            </div>
            {/* Renewable */}
            <div style={{
              flex: "1 0 0", minWidth: 90,
              background: v("--color-bg-muted"),
              border: `1px solid ${v("--color-border")}`,
              borderRadius: v("--radius-md"),
              padding: "12px 8px", textAlign: "center",
            }}>
              <div style={{ fontSize: 9, color: v("--color-text-muted"), marginBottom: 2 }}>davon EE</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: v("--font-mono"), color: v("--color-text-primary") }}>
                {formatGWh(stats.renewableGWh)}
              </div>
            </div>
            {/* Net Import/Export */}
            <div style={{
              flex: "1 0 0", minWidth: 90,
              background: v("--color-bg-muted"),
              border: `1px solid ${v("--color-border")}`,
              borderRadius: v("--radius-md"),
              padding: "12px 8px", textAlign: "center",
            }}>
              <div style={{ fontSize: 9, color: v("--color-text-muted"), marginBottom: 2 }}>
                Netto-{stats.netImportGWh > 0 ? "Import" : "Export"}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: v("--font-mono"), color: v("--color-text-primary") }}>
                {stats.netImportGWh > 0 ? "+" : ""}{formatGWh(Math.abs(stats.netImportGWh))}
              </div>
            </div>
            {/* Nuclear import toggle */}
            {!nuclearLoading && nuclearData.avg_gw > 0 && (
              <button
                onClick={() => setShowNuclear(!showNuclear)}
                style={{
                  flex: "1 0 0", minWidth: 90,
                  background: v("--color-bg-muted"),
                  border: `1px solid ${showNuclear ? v("--color-text-muted") : v("--color-border")}`,
                  borderRadius: v("--radius-md"),
                  padding: "12px 8px", textAlign: "center",
                  cursor: "pointer", fontFamily: v("--font-text"),
                }}
              >
                <div style={{ fontSize: 9, color: v("--color-text-muted"), marginBottom: 2 }}>
                  {showNuclear ? "▣" : "▢"} Kernimport
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: v("--font-mono"), color: v("--color-text-primary") }}>
                  {nuclearData.avg_gw.toFixed(1)} GW
                </div>
              </button>
            )}
          </div>

          <div style={{ textAlign: "center", fontSize: 11, color: v("--color-text-faint"), marginBottom: 16 }}>
            {selectedLabel === "YTD" ? "Seit Jahresbeginn" : `Letzte ${timeLabel}`}
          </div>
        </>
      )}

      {/* Stacked Area Chart */}
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

        {loading ? (
          <div
            style={{
              height: 300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: v("--color-text-muted"),
              fontSize: 13,
            }}
          >
            Lade Daten von Energy-Charts...
          </div>
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
        ) : hours >= 720 ? (
          <StackedBarChart
            data={genData.data}
            mode={selectedLabel === "YTD" ? "ytd" : selectedLabel === "12M" ? "12m" : "30d"}
            nuclearOverlay={showNuclear ? nuclearData.data : undefined}
          />
        ) : (
          <StackedAreaChart
            data={genData.data}
            xFormat={hours > 168 ? "date" : hours > 48 ? "datetime" : "time"}
            nuclearOverlay={showNuclear ? nuclearData.data : undefined}
          />
        )}

        {/* Legend — 4 category labels with colored squares */}
        {!loading && !error && genData.data.length > 0 && (
          <div style={{
            display: "flex", justifyContent: "center", gap: 16,
            padding: "12px 8px 0", marginTop: 8,
            borderTop: `1px solid ${v("--color-border")}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: "#4CAF50", flexShrink: 0 }} />
              <span style={{ color: v("--color-text-muted") }}>Erneuerbare</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: "#8D6E63", flexShrink: 0 }} />
              <span style={{ color: v("--color-text-muted") }}>Fossil</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: "#BDBDBD", flexShrink: 0 }} />
              <span style={{ color: v("--color-text-muted") }}>Sonstige</span>
            </div>
            {showNuclear && !nuclearLoading && nuclearData.avg_gw > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: "#F9A825", flexShrink: 0 }} />
                <span style={{ color: v("--color-text-muted") }}>Kernenergie</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Methodology note for nuclear overlay */}
      {showNuclear && !nuclearLoading && nuclearData.avg_gw > 0 && (
        <div style={{
          fontSize: 10, color: v("--color-text-faint"), lineHeight: 1.6,
          marginBottom: 20, padding: "0 8px",
        }}>
          <strong style={{ color: v("--color-text-muted") }}>Kernimport-Overlay:</strong>{" "}
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
