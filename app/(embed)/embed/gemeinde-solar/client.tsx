"use client";

import { useState } from "react";
import { Kachel, formatDataAsOf } from "../../../../components/MastrHeroSection";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import ChartActionBar from "../../../../components/ChartActionBar";
import { PoweredBy, DataSourceNote } from "../../../../components/PoweredBy";
import { DATA_SOURCES } from "../../../../lib/data-sources";
import { fmtPvLeistung, fmtSpeicherKwh } from "../../../../lib/atlas-format";

const BASE = "https://solar-check.io";

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

const fmtLeistung = fmtPvLeistung;
const fmtKwh = fmtSpeicherKwh;

export type GemeindeWidgetProps = {
  name?: string;
  bundesland?: string | null;
  population?: number | null;
  count?: number;
  kwp?: number;
  kwpDach?: number;
  speicherKwh?: number;
  dataAsOf?: string;
  populationAsOf?: string | null;
  ags?: string;
  atlasPath?: string | null;
  error?: string;
};

/**
 * Embeddable Gemeinde solar figures. Same numbers as the atlas page, in the
 * standard widget shell: themeable chrome, fixed semantic content, a data-source
 * credit that stays regardless of branding, and the shared share/embed menu.
 */
export default function GemeindeSolarWidget(props: GemeindeWidgetProps) {
  const [showEmbed, setShowEmbed] = useState(true);
  const [showBranding, setShowBranding] = useState(true);
  useWidgetTheme({
    onSettings: (s) => {
      if (typeof s.embed === "boolean") setShowEmbed(s.embed);
      if (typeof s.branding === "boolean") setShowBranding(s.branding);
    },
  });

  const shell: React.CSSProperties = {
    background: "var(--widget-bg)",
    color: "var(--widget-fg)",
    borderRadius: "var(--widget-border-radius)",
    fontFamily: "var(--widget-font-family)",
    padding: 16,
    boxSizing: "border-box",
  };

  if (props.error || !props.name) {
    return (
      <div style={shell}>
        <div style={{ fontSize: 13, color: "var(--widget-muted)" }}>{props.error ?? "Keine Daten."}</div>
      </div>
    );
  }

  const { name, population, count = 0, kwp = 0, kwpDach = 0, speicherKwh = 0, ags, atlasPath } = props;
  const wPerCapitaDach = population ? Math.round((kwpDach * 1000) / population) : null;

  const liveUrl = atlasPath ? `${BASE}${atlasPath}` : BASE;
  const shareText = `Solaranlagen in ${name}: ${nf(count)} Anlagen, ${fmtLeistung(kwp)} – Solar Check`;

  return (
    <div style={shell}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Solaranlagen in {name}</div>
      <div style={{ fontSize: 11, color: "var(--widget-muted)", marginBottom: 12 }}>
        {props.dataAsOf ? `Marktstammdatenregister · Stand ${formatDataAsOf(props.dataAsOf)}` : ""}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(88px, 1fr))", gap: 8 }}>
        <Kachel label="Anlagen" value={nf(count)} />
        <Kachel label="Installiert" value={fmtLeistung(kwp)} />
        {wPerCapitaDach !== null && <Kachel label="Leistung je Einwohner" value={`${nf(wPerCapitaDach)} W`} hint="Dach" />}
        {/* „Batteriespeicher", nicht „Speicher": der Wert zählt nur Batterien, wie
            auf der Atlas-Seite. Ein Pumpspeicherwerk im Ort steckt nicht darin —
            das Widget darf nicht mehr behaupten als die Seite. */}
        {speicherKwh > 0 && <Kachel label="Batteriespeicher" value={fmtKwh(speicherKwh)} />}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ height: 1, background: "var(--widget-muted)", opacity: 0.2, marginBottom: 8 }} />
        {/* Data-source credit — always shown, independent of branding (Legal 1). */}
        <div style={{ fontSize: 10.5, color: "var(--widget-muted)", marginBottom: 6 }}>
          <DataSourceNote source={DATA_SOURCES.mastr} />
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
            variant="menu"
            menuUp
            showDownload={false}
            size={28}
            onDownload={() => {}}
            onCopyLink={() => navigator.clipboard?.writeText(`${shareText}\n${liveUrl}`).catch(() => {})}
            onWhatsApp={() =>
              window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${liveUrl}`)}`, "_blank")
            }
            onTwitter={() =>
              window.open(
                `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(liveUrl)}`,
                "_blank",
              )
            }
            onEmbed={
              showEmbed && ags
                ? () => window.open(`/energie-widgets#gemeinde-solar`, "_blank", "noopener")
                : undefined
            }
            isExporting={false}
            canNativeShare={false}
          />
        </div>
      </div>
    </div>
  );
}
