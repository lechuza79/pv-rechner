"use client";

import { useMemo, useState } from "react";
import ChartActionBar from "../../../../components/ChartActionBar";
import { PoweredBy, DataSourceNote } from "../../../../components/PoweredBy";
import { DATA_SOURCES } from "../../../../lib/data-sources";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import { useChartExport } from "../../../../lib/useChartExport";
import HeatCostCompareChart from "../../../../components/charts/HeatCostCompareChart";
import { heatCostComparisonSeries } from "../../../../lib/greengas";

// Grüngas-Heizkosten-Widget: eine einbettbare Karte, die die Kernaussage des
// Wärmepumpen-Rechners standalone zeigt — Heizkosten je kWh Wärme bis 2045, eine
// neue Gasheizung unter der GModG-Grüngas-Pflicht (steigend) gegen die Wärmepumpe
// (flach) und Wärmepumpe + PV. Rechnet ausschließlich auf der geteilten Engine
// (heatCostComparisonSeries), driftet also nie vom vollen Rechner. Kein Fetch,
// kein Browser-Speicher.

const CTA_URL = "/waermepumpe-rechner";
const SHARE_URL = "https://solar-check.io/waermepumpe-rechner";
const SHARE_TEXT = "Wärmepumpe vs. neue Gasheizung mit Grüngas-Pflicht – Solar Check";
const TITLE = "Wärmepumpe schlägt die neue Gasheizung";
// Typische Ergänzungs-PV: rund 30 % des WP-Stroms solar gedeckt (im Chart
// transparent ausgewiesen). Konservativer Mittelwert, siehe WP-Rechner.
const PV_COVERAGE = 0.3;
// Default-Annahmen, konsistent zum WP-Rechner (Realistisch-Fall, Bio-Treppe base).
const JAZ = 3.5;
const START_YEAR = new Date().getFullYear();

export default function GruengasHeizkostenWidget() {
  const [showEmbed, setShowEmbed] = useState(true);
  const [showBranding, setShowBranding] = useState(true);
  const [onsite, setOnsite] = useState(false);
  useWidgetTheme({
    onSettings: (s) => {
      if (typeof s.embed === "boolean") setShowEmbed(s.embed);
      if (typeof s.branding === "boolean") setShowBranding(s.branding);
      if (typeof s.onsite === "boolean") setOnsite(s.onsite);
    },
  });

  const data = useMemo(
    () =>
      heatCostComparisonSeries({
        years: 20,
        startYear: START_YEAR,
        scenario: "base",
        gasEfficiency: 0.95,
        jaz: JAZ,
        wpTarifEurKwh: 0.24,
        stromInflation: 0.02,
        pvCoverage: PV_COVERAGE,
      }),
    [],
  );

  const { chartRef, downloadPng, sharePng, shareWhatsApp, shareTwitter, isExporting, canNativeShare } =
    useChartExport({
      context: { title: TITLE },
      filename: "heizkosten-waermepumpe-vs-gasheizung",
      shareText: SHARE_TEXT,
      shareUrl: SHARE_URL,
      mode: "node",
    });

  return (
    <div
      ref={chartRef}
      style={{
        background: "var(--widget-bg)",
        color: "var(--widget-fg)",
        borderRadius: "var(--widget-border-radius)",
        fontFamily: "var(--widget-font-family)",
        padding: 16,
        boxSizing: "border-box",
        maxWidth: 520,
        margin: "0 auto",
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: 0.1, lineHeight: 1.2 }}>{TITLE}</div>
      <div style={{ fontSize: 11.5, color: "var(--widget-muted)", marginTop: 3, lineHeight: 1.45 }}>
        Heizkosten je Kilowattstunde Wärme bis {START_YEAR + 19}. Eine neue Gasheizung wird durch die
        Grüngas-Pflicht (Heizungsgesetz) Jahr für Jahr teurer.
      </div>
      <div style={{ height: 1, background: "var(--widget-muted)", opacity: 0.2, margin: "12px 0 14px" }} />

      <HeatCostCompareChart data={data} pvCoveragePct={Math.round(PV_COVERAGE * 100)} />

      {/* CTA in den vollen Rechner — aus dem Export ausgenommen. */}
      <a
        data-sc-export-ignore
        href={CTA_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          textAlign: "center",
          marginTop: 14,
          padding: "10px 14px",
          borderRadius: "var(--radius-md)",
          background: "var(--widget-accent)",
          color: "var(--widget-accent-fg)",
          fontSize: 13,
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        Für dein Haus durchrechnen →
      </a>

      {/* Footer: sichtbare Quelle + Marke + Aktionen — aus dem Export ausgenommen,
          weil der export-only-Fuß unten Quelle + Marke fest ins PNG bäckt. */}
      <div data-sc-export-ignore style={{ marginTop: 14 }}>
        <div style={{ height: 1, background: "var(--widget-muted)", opacity: 0.2, marginBottom: 8 }} />
        <div style={{ fontSize: 10.5, color: "var(--widget-muted)", marginBottom: 6, lineHeight: 1.45 }}>
          <DataSourceNote source={DATA_SOURCES.iw} />
        </div>
        <div
          style={{
            fontSize: 10.5,
            color: "var(--widget-muted)",
            display: "flex",
            justifyContent: showBranding && !onsite ? "space-between" : "flex-end",
            alignItems: "center",
            gap: 8,
          }}
        >
          {showBranding && !onsite && <PoweredBy />}
          <ChartActionBar
            variant="bar"
            showDownload
            size={28}
            onDownload={downloadPng}
            onCopyLink={() => navigator.clipboard?.writeText(`${SHARE_TEXT}\n${SHARE_URL}`).catch(() => {})}
            onShareImage={canNativeShare ? sharePng : undefined}
            onWhatsApp={shareWhatsApp}
            onTwitter={shareTwitter}
            onEmbed={showEmbed ? () => window.open("/energie-widgets#gruengas-heizkosten", "_blank", "noopener") : undefined}
            isExporting={isExporting}
            canNativeShare={canNativeShare}
          />
        </div>
      </div>

      {/* Nur im PNG-Export sichtbar: Quelle + Marke fest eingebacken, damit jede
          geteilte Kopie attribuiert bleibt. */}
      <div data-sc-export-only style={{ display: "none", fontSize: 10.5, color: "var(--widget-muted)", marginTop: 12, lineHeight: 1.5 }}>
        <DataSourceNote source={DATA_SOURCES.iw} plain />
        <div style={{ marginTop: 4 }}>
          <PoweredBy />
        </div>
      </div>
    </div>
  );
}
