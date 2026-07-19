"use client";

import { v } from "../../lib/theme";
import { PoweredBy, DataSourceNote } from "../PoweredBy";
import ChartActionBar from "../ChartActionBar";
import { type DataSource, sourceLabel } from "../../lib/data-sources";
import { useChartExport } from "../../lib/useChartExport";

// Standardisierte Hülle für die einbettbaren Gemeinde-Widgets (Erneuerbaren-Mix,
// Solarleistung-Simulation). Ein Rahmen, Titel + Subline, der Inhalt, dann eine
// sichtbare Aktionsleiste (Herunterladen · Teilen · Einbetten) — konform zur
// erweiterten Widget-Konvention: sichtbare Leiste bei mittelgroßen/zweispaltigen
// Widgets, ⋯-Menü nur bei den ganz kleinen.
//
// Quellen-Logik (regulatorisch, dl-de/by-2-0 + CC BY 4.0):
//  • Web sichtbar (`showSource`): im Embed an (Standalone braucht eigene
//    Attribution), auf der Atlas-Seite aus (Quelle steht global im Seitenfuß).
//  • Bild-Export: IMMER — der `data-sc-export-only`-Fuß trägt Quelle (+ Marke)
//    ins heruntergeladene/geteilte Bild, unabhängig davon, was im Web sichtbar
//    ist. So bleibt jede verteilte Kopie attribuiert.
// Nutzt die Site-Tokens `--color-*`, die im Embed-Layout auf `--widget-*`
// aliasen — dieselbe Hülle funktioniert auf der Seite UND im Embed.

export default function GemeindeWidgetShell({
  title,
  subline,
  sources,
  shareText,
  shareUrl,
  filename,
  embedHash,
  showSource = true,
  showEmbed = true,
  branding = false,
  sourceBottomInset = 0,
  children,
}: {
  title: string;
  subline: string;
  sources: DataSource | DataSource[];
  shareText: string;
  shareUrl: string;
  /** Dateiname des PNG-Exports. */
  filename: string;
  /** Galerie-Anker für die „Einbetten"-Aktion, z. B. "gemeinde-erneuerbare". */
  embedHash: string;
  /** Quellenzeile im Web zeigen. Embed: an. Atlas-Seite: aus (globaler Fuß). */
  showSource?: boolean;
  /** Vertikales Quellen-Label unten um px kürzen — z. B. damit es über einer
   *  Auslastungs-/Footer-Zeile im Widget-Body endet statt bis zum Boden zu laufen. */
  sourceBottomInset?: number;
  /** „Einbetten"-Aktion anbieten. */
  showEmbed?: boolean;
  /** „Powered by solar-check.io" zeigen (im Embed an, auf der eigenen Seite aus). */
  branding?: boolean;
  children: React.ReactNode;
}) {
  const sourceList = Array.isArray(sources) ? sources : [sources];
  const fullSource = sourceList.map(sourceLabel).join(" · ");
  // Kompakte Web-Kurzform für das vertikale Label: Klammer-Zusätze (Betreiber-
  // Org, „Daten aggregiert") raus, Name + Lizenzkürzel bleiben. Die vollständige
  // Attribution steht im Bild-Export, global im Seitenfuß und auf /datenstand.
  const compactSource = sourceList
    .map((s) => `${s.name.replace(/\s*\([^)]*\)/g, "")}${s.license ? `, ${s.license}` : ""}`)
    .join(" · ");

  const chartExport = useChartExport({
    context: { title, subtitle: subline, source: fullSource },
    filename,
    shareText,
    shareUrl,
    mode: "node",
  });

  const copyLink = () => navigator.clipboard?.writeText(`${shareText}\n${shareUrl}`).catch(() => {});

  return (
    <div style={S.frame} ref={chartExport.chartRef}>
      <div>
        <div style={S.title}>{title}</div>
        <div style={S.sub}>{subline}</div>
      </div>

      {/* Body wächst — so stehen zwei Widgets nebeneinander auf gleicher Höhe.
          Quelle steht schlank vertikal an der rechten Kante (nur Web, aus dem
          Bild-Export ausgenommen); Platz dafür über paddingRight. */}
      <div style={{ ...S.body, ...(showSource ? S.bodyPad : null) }}>
        {showSource && (
          <div data-sc-export-ignore="" title={`Quelle: ${fullSource}`} style={{ ...S.vsource, bottom: sourceBottomInset }}>
            Quelle: {compactSource}
          </div>
        )}
        <div style={S.bodyInner}>{children}</div>
      </div>

      <div style={S.footer}>
        <div style={S.rule} />

        {/* Web-Aktionsleiste — aus dem Bild-Export ausgenommen. */}
        <div
          data-sc-export-ignore=""
          style={{ ...S.actions, justifyContent: branding ? "space-between" : "flex-end" }}
        >
          {branding && <PoweredBy />}
          <ChartActionBar
            variant="bar"
            size={30}
            onDownload={chartExport.downloadPng}
            onCopyLink={copyLink}
            onWhatsApp={chartExport.shareWhatsApp}
            onTwitter={chartExport.shareTwitter}
            onShareImage={chartExport.sharePng}
            onEmbed={
              showEmbed ? () => window.open(`/energie-widgets#${embedHash}`, "_blank", "noopener") : undefined
            }
            isExporting={chartExport.isExporting}
            canNativeShare={chartExport.canNativeShare}
          />
        </div>

        {/* Nur im Bild-Export sichtbar: volle Quelle (+ Marke) fest ins PNG —
            trägt die Attribution auch dann, wenn das Web-Label ausgeblendet ist. */}
        <div data-sc-export-only="flex" style={S.exportFoot}>
          <DataSourceNote source={sources} plain />
          <PoweredBy />
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  frame: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
    // Deckel gegen zu breite Darstellung (breites Embed-iframe / Vollbreite auf
    // Mobil); zentriert. Auf der Atlas-Seite sind die Spalten ohnehin schmaler.
    maxWidth: 460,
    marginInline: "auto",
    boxSizing: "border-box",
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: "var(--widget-border-radius, 14px)",
    padding: "16px 18px",
    overflow: "hidden",
  },
  title: { fontSize: 16, fontWeight: 700, margin: "0 0 4px", lineHeight: 1.25 },
  sub: { fontSize: 12, color: v("--color-text-muted"), margin: "0 0 14px", lineHeight: 1.4 },
  body: { flex: 1, position: "relative", display: "flex" },
  bodyPad: { paddingRight: 18 },
  bodyInner: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  // Quelle vertikal an der rechten Kante — schlank, unaufdringlich, mit vollem
  // Text im title-Tooltip. Umbruch erlaubt (mehrere Spalten bei zwei Quellen).
  vsource: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    writingMode: "vertical-rl",
    transform: "rotate(180deg)",
    maxHeight: "100%",
    fontSize: 9,
    lineHeight: 1.4,
    letterSpacing: 0.2,
    color: v("--color-text-faint"),
    textAlign: "center",
  },
  footer: { marginTop: 14 },
  rule: { height: 1, background: v("--color-border"), opacity: 0.6, marginBottom: 8 },
  actions: { display: "flex", alignItems: "center", gap: 8, fontSize: 10.5, color: v("--color-text-muted") },
  // display:none im Web; der Exporter schaltet data-sc-export-only auf "flex".
  exportFoot: {
    display: "none",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
    marginTop: 8,
    fontSize: 10.5,
    color: v("--color-text-muted"),
    lineHeight: 1.4,
  },
};
