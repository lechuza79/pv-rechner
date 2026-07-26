"use client";

import { useMemo, useState } from "react";
import ChartActionBar from "../../../../components/ChartActionBar";
import { PoweredBy, DataSourceNote } from "../../../../components/PoweredBy";
import { DATA_SOURCES } from "../../../../lib/data-sources";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import { useChartExport } from "../../../../lib/useChartExport";
import GruengasWidget, { type GruengasView } from "../../../../components/charts/GruengasWidget";
import { greengasMusterVariants, PV_COVERAGE } from "../../../../lib/greengas-muster";

// Grüngas-Widget: die einbettbare Karte, die die Kernaussage des Wärmepumpen-
// Rechners standalone zeigt — eine neue Gasheizung unter der GModG-Grüngas-Pflicht
// gegen die Wärmepumpe über 20 Jahre. Dasselbe Bauteil steckt im Ratgeber-Artikel
// (via onsite-Embed). Über `view` wählbar: ganzes Kombi-Widget, nur die Balken
// (Kurzantwort) oder nur der Linien-Verlauf — wie die Karte in Teilen einbettbar.
// Rechnet ausschließlich auf der geteilten Engine (greengasMusterVariants),
// driftet also nie vom vollen Rechner. Kein Fetch, kein Browser-Speicher.

const CTA_URL = "/waermepumpe-rechner";
const SHARE_URL = "https://solar-check.io/ratgeber/gasheizung-oder-waermepumpe";
const SHARE_TEXT = "Wärmepumpe vs. neue Gasheizung mit Grüngas-Pflicht – Solar Check";
const TITLE = "Wärmepumpe schlägt die neue Gasheizung";

function subtitle(view: GruengasView, endYear: number): string {
  if (view === "bars") return "Gesamtkosten über 20 Jahre: Gasheizung mit Grüngas-Pflicht gegen Wärmepumpe.";
  if (view === "lines") return `So entwickeln sich die jährlichen Heizkosten bis ${endYear}.`;
  return `Eine neue Gasheizung wird durch die Grüngas-Pflicht Jahr für Jahr teurer — die Rechnung bis ${endYear}.`;
}

const ALLOWED: GruengasView[] = ["full", "bars", "lines"];

export default function GruengasHeizkostenWidget() {
  const [showEmbed, setShowEmbed] = useState(true);
  const [showBranding, setShowBranding] = useState(true);
  const [onsite, setOnsite] = useState(false);
  const [view, setView] = useState<GruengasView>("full");
  useWidgetTheme({
    onSettings: (s) => {
      if (typeof s.embed === "boolean") setShowEmbed(s.embed);
      if (typeof s.branding === "boolean") setShowBranding(s.branding);
      if (typeof s.onsite === "boolean") setOnsite(s.onsite);
      if (typeof s.view === "string" && (ALLOWED as string[]).includes(s.view)) setView(s.view as GruengasView);
    },
  });

  const variants = useMemo(() => greengasMusterVariants(), []);
  const endYear = variants[0].series[variants[0].series.length - 1].year;

  const { chartRef, downloadPng, sharePng, shareWhatsApp, shareTwitter, isExporting, canNativeShare } =
    useChartExport({
      context: { title: TITLE },
      filename: "waermepumpe-vs-gasheizung-gruengas",
      shareText: SHARE_TEXT,
      shareUrl: SHARE_URL,
      mode: "node",
    });

  return (
    <div
      ref={chartRef}
      style={{
        // First-Party (onsite): transparent + ohne eigenes Padding — der Host
        // (Artikel) liefert Rahmen/Hintergrund. Extern: eigene Karte.
        background: onsite ? "transparent" : "var(--widget-bg)",
        color: "var(--widget-fg)",
        borderRadius: onsite ? 0 : "var(--widget-border-radius)",
        fontFamily: "var(--widget-font-family)",
        padding: onsite ? 0 : 16,
        boxSizing: "border-box",
        maxWidth: view === "bars" && !onsite ? 480 : 640,
        margin: "0 auto",
      }}
    >
      {/* First-Party-Embed (onsite): nur das Chart — Titel, Quelle, Powered-by,
          Aktionen und CTA liefert die einbettende Artikelseite. Extern: volle
          Hülle mit Attribution (Lizenzpflicht). */}
      {!onsite && (
        <>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: 0.1, lineHeight: 1.2 }}>{TITLE}</div>
          <div style={{ fontSize: 11.5, color: "var(--widget-muted)", marginTop: 3, marginBottom: 14, lineHeight: 1.45 }}>
            {subtitle(view, endYear)}
          </div>
        </>
      )}

      <GruengasWidget variants={variants} pvCoveragePct={Math.round(PV_COVERAGE * 100)} view={view} />

      {!onsite && (
        <>
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

          {/* Footer: sichtbare Quelle + Marke + Aktionen — aus dem Export
              ausgenommen, weil der export-only-Fuß unten Quelle + Marke fest ins
              PNG bäckt. */}
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
                justifyContent: showBranding ? "space-between" : "flex-end",
                alignItems: "center",
                gap: 8,
              }}
            >
              {showBranding && <PoweredBy />}
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

          {/* Nur im PNG-Export sichtbar: Quelle + Marke fest eingebacken. */}
          <div data-sc-export-only style={{ display: "none", fontSize: 10.5, color: "var(--widget-muted)", marginTop: 12, lineHeight: 1.5 }}>
            <DataSourceNote source={DATA_SOURCES.iw} plain />
            <div style={{ marginTop: 4 }}>
              <PoweredBy />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
