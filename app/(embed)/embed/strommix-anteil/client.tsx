"use client";

import { useState } from "react";
import DonutChart from "../../../../components/charts/DonutChart";
import {
  ExportBox,
  ExportNotesProvider,
  WidgetExportFooter,
  WidgetFooter,
  WidgetSourceEdge,
} from "../../../../components/WidgetExport";
import { DATA_SOURCES, sourceLabel } from "../../../../lib/data-sources";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import { WIDGETS, WIDGET_MAX_WIDTH_COMPACT } from "../../../../lib/widget-registry";
import { useChartExport } from "../../../../lib/useChartExport";
import {
  WIDGET_SETTINGS_DEFAULTS,
  type WidgetSettings,
} from "../../../../lib/widget-settings";
import type { StrommixYtd } from "../../../../lib/strommix-ytd";

// Identität (Titel, Teilen-Ziel, Quellen, nächster Schritt) kommt aus dem
// Register — ein Eintrag speist Fußzeile, Quellen-Kante und Bild-Fuß.
const WIDGET = WIDGETS.strommixAnteil;

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

  // Abgeleitet, nicht doppelt gepflegt: der Register-Text plus die Live-Zahl.
  // Ohne Daten bleibt es exakt der Register-Text.
  const shareText = ytd
    ? `${fmtPct(ytd.nuclearShare)} Kernenergie im deutschen Strommix ${ytd.year} (inkl. importiertem Atomstrom)`
    : WIDGET.shareText;

  const chartExport = useChartExport({
    context: {
      title: WIDGET.title,
      subtitle: ytd ? `${ytd.year} · inkl. importiertem Atomstrom` : undefined,
      source: sourceLabel(DATA_SOURCES.energyCharts),
    },
    filename: "solar-check-strommix-kernenergie.png",
    shareText,
    shareUrl: WIDGET.shareUrl,
    mode: "node",
  });

  const copyLink = () => {
    navigator.clipboard?.writeText(`${shareText}\n${WIDGET.shareUrl}`).catch(() => {});
  };

  const root: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    background: "var(--widget-bg)",
    color: "var(--widget-fg)",
    borderRadius: "var(--widget-border-radius)",
    fontFamily: "var(--widget-font-family)",
    padding: 18,
    maxWidth: WIDGET_MAX_WIDTH_COMPACT,
    margin: "0 auto",
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
    // Provider um die ganze Karte: Der Bild-Fuß darunter zeigt die Hilfetexte
    // der „?"-Knöpfe. Ohne ihn verschwände der erste hier eingebaute Tooltip
    // lautlos aus dem Bild — deshalb erzwingt der Wächter ihn neben jedem
    // WidgetExportFooter (lib/__tests__/widget-konventionen.test.ts).
    <ExportNotesProvider>
      <div style={root} ref={chartExport.chartRef}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.2 }}>
            Deutscher Strommix {ytd.year}
          </div>
          <div style={{ fontSize: 12, color: "var(--widget-muted)", marginTop: 2 }}>
            inkl. importiertem Atomstrom
          </div>
        </div>

        <div style={{ position: "relative", paddingRight: 18 }}>
          {/* Quelle vertikal an der rechten Kante (geteilter Baustein). Auf einer
              eigenen Seite (onsite) kreditiert die Seite zentral. */}
          <WidgetSourceEdge widget={WIDGET} visible={!settings.onsite} />
          <ExportBox
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: 24,
              // Der Kasten umschließt Ring + Legende, statt sich auf die volle
              // Kartenbreite zu ziehen: sonst rahmt er vor allem Leere.
              width: "fit-content",
              margin: "0 auto",
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
          </ExportBox>

          <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--widget-muted)", textAlign: "center", marginTop: 16 }}>
            Jahr bis dato ({ytd.weeks} Wochen): {twh(ytd.nuclearGwh)} TWh importierter
            Atomstrom von {twh(ytd.totalGwh)} TWh gesamt. Rechnerischer Wert
            (Grenzflüsse × Kernanteil der Nachbarn); heimische Kernkraft läuft seit
            April 2023 nicht mehr.
          </div>
        </div>

        {/* Sichtbare Fußzeile (nächster Schritt · Aktionen · Marke) und Bild-Fuß
            (Datenquelle · Marke) — beide aus dem geteilten Baustein. */}
        <WidgetFooter
          widget={WIDGET}
          chartExport={chartExport}
          onCopyLink={copyLink}
          share={settings.share}
          branding={settings.branding}
          showEmbed={settings.embed}
          onsite={settings.onsite}
        />
        <WidgetExportFooter widget={WIDGET} branding={settings.branding} />
      </div>
    </ExportNotesProvider>
  );
}
