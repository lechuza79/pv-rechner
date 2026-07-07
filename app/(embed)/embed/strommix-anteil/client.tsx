"use client";

import { useState } from "react";
import DonutChart from "../../../../components/charts/DonutChart";
import ChartActionBar from "../../../../components/ChartActionBar";
import { PoweredBy, DataSourceNote } from "../../../../components/PoweredBy";
import { DATA_SOURCES, sourceLabel } from "../../../../lib/data-sources";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import { useChartExport } from "../../../../lib/useChartExport";
import {
  WIDGET_SETTINGS_DEFAULTS,
  type WidgetSettings,
} from "../../../../lib/widget-settings";
import type { StrommixYtd } from "../../../../lib/strommix-ytd";

const SHARE_URL = "https://solar-check.io/atomstrom-import";

// Prozent-Formatierung nach Chart-Konvention: ab 10 % runden, sonst 1 Stelle,
// unter 0,1 % zwei Stellen.
function fmtPct(n: number): string {
  if (n >= 10) return `${Math.round(n)} %`;
  if (n >= 0.1)
    return `${n.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}
const twh = (gwh: number) =>
  (gwh / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 });

export default function StrommixAnteilWidget({ ytd }: { ytd: StrommixYtd | null }) {
  const [settings, setSettings] = useState<WidgetSettings>(WIDGET_SETTINGS_DEFAULTS);

  useWidgetTheme({
    onSettings: (partial) => setSettings((prev) => ({ ...prev, ...partial })),
  });

  const chartExport = useChartExport({
    context: {
      title: "Kernenergie im deutschen Strommix",
      subtitle: ytd ? `${ytd.year} · inkl. importiertem Atomstrom` : undefined,
      source: sourceLabel(DATA_SOURCES.energyCharts),
    },
    filename: "solar-check-strommix-kernenergie.png",
    shareText: ytd
      ? `${fmtPct(ytd.nuclearShare)} Kernenergie im deutschen Strommix ${ytd.year} (inkl. importiertem Atomstrom)`
      : "Kernenergie im deutschen Strommix",
    shareUrl: SHARE_URL,
    mode: "node",
  });

  const copyLink = () => {
    navigator.clipboard?.writeText(SHARE_URL).catch(() => {});
  };

  const root: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    background: "var(--widget-bg)",
    color: "var(--widget-fg)",
    borderRadius: "var(--widget-border-radius)",
    fontFamily: "var(--widget-font-family)",
    padding: 18,
    boxSizing: "border-box",
    overflow: "hidden",
  };

  if (!ytd) {
    return (
      <div style={{ ...root, alignItems: "center", justifyContent: "center", minHeight: 200, color: "var(--widget-muted)", fontSize: 13 }}>
        Daten gerade nicht verfügbar.
      </div>
    );
  }

  const donutSegments = ytd.segments.map((s) => ({
    key: s.key,
    label: s.label,
    color: s.color,
    value: s.gwh,
  }));

  return (
    <div style={root} ref={chartExport.chartRef}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.2 }}>
          Deutscher Strommix {ytd.year}
        </div>
        <div style={{ fontSize: 12, color: "var(--widget-muted)", marginTop: 2 }}>
          inkl. importiertem Atomstrom
        </div>
      </div>

      <div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          <DonutChart segments={donutSegments} size={170}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 32,
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: "var(--widget-fg)",
              }}
            >
              {fmtPct(ytd.nuclearShare).replace(" %", "")}
            </div>
            <div style={{ fontSize: 12, color: "var(--widget-muted)", marginTop: 4 }}>
              % Kernenergie
            </div>
          </DonutChart>

          <div style={{ minWidth: 190 }}>
            {ytd.segments.map((s) => (
              <div
                key={s.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "3px 0",
                  fontSize: 13,
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                <span style={{ flex: 1, color: "var(--widget-fg)" }}>{s.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                  {fmtPct(s.share)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--widget-muted)", textAlign: "center", marginTop: 16 }}>
          Jahr bis dato ({ytd.weeks} Wochen): {twh(ytd.nuclearGwh)} TWh importierter
          Atomstrom von {twh(ytd.totalGwh)} TWh gesamt. Rechnerischer Wert
          (Grenzflüsse × Kernanteil der Nachbarn); heimische Kernkraft läuft seit
          April 2023 nicht mehr.
        </div>
      </div>

      {/* Footer: divider (both) + web footer (page) + print footer (image). */}
      <div style={{ marginTop: 12 }}>
        <div style={{ height: 1, background: "var(--widget-muted)", opacity: 0.2, marginBottom: 8 }} />

        {/* Web footer — dropped from the export image. Source on its own line
            (lighter grey), then action bar + Powered-by. */}
        <div data-sc-export-ignore="">
          <div style={{ fontSize: 10.5, color: "var(--color-text-faint)", marginBottom: settings.branding || settings.share ? 6 : 0 }}>
            <DataSourceNote source={DATA_SOURCES.energyCharts} />
          </div>
          {(settings.branding || settings.share) && (
            <div
              style={{
                fontSize: 10.5,
                color: "var(--widget-muted)",
                display: "flex",
                justifyContent: settings.share ? "space-between" : "flex-end",
                alignItems: "center",
                gap: 8,
              }}
            >
              {settings.share && (
                <ChartActionBar
                  onDownload={chartExport.downloadPng}
                  onCopyLink={copyLink}
                  onWhatsApp={chartExport.shareWhatsApp}
                  onTwitter={chartExport.shareTwitter}
                  onShareImage={chartExport.sharePng}
                  onEmbed={
                    settings.embed
                      ? () => window.open("/energie-widgets#strommix-anteil", "_blank", "noopener")
                      : undefined
                  }
                  isExporting={chartExport.isExporting}
                  canNativeShare={chartExport.canNativeShare}
                  size={30}
                />
              )}
              {settings.branding && (
                <span style={{ marginLeft: "auto", display: "inline-flex" }}>
                  <PoweredBy />
                </span>
              )}
            </div>
          )}
        </div>

        {/* Print-only footer — one row: source left (no underline) + Powered-by right. */}
        <div
          data-sc-export-only="flex"
          style={{ display: "none", fontSize: 10.5, color: "var(--widget-muted)", alignItems: "center", justifyContent: "space-between", gap: 8 }}
        >
          <DataSourceNote source={DATA_SOURCES.energyCharts} plain />
          {settings.branding && <PoweredBy />}
        </div>
      </div>
    </div>
  );
}
