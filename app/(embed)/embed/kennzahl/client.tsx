"use client";

import { useState } from "react";
import { Kachel, formatDataAsOf } from "../../../../components/MastrHeroSection";
import { LoadingDots } from "../../../../components/LoadingDots";
import { useCachedFetch } from "../../../../lib/use-cached-fetch";
import type { Energietraeger, RegionSummary } from "../../../../lib/mastr-data";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import ChartActionBar from "../../../../components/ChartActionBar";
import { PoweredBy, DataSourceNote } from "../../../../components/PoweredBy";
import { DATA_SOURCES } from "../../../../lib/data-sources";

// Single KPI tile from the Marktstammdatenregister — either installed power or
// plant count — reusing the same <Kachel> the homepage/karte composite renders,
// so the number is one source of truth. Compact widget → ⋯ menu (no PNG export,
// there's no chart).

export type Metric = "leistung" | "anlagen";

const SHARE_URL = "https://solar-check.io/";
const TRAEGER_LABEL: Record<string, string> = {
  gesamt: "Erneuerbare",
  solar: "Solar",
  wind: "Wind",
  biomasse: "Biomasse",
  wasser: "Wasser",
  speicher: "Speicher",
};

export default function KennzahlWidget({
  metric = "leistung",
  traeger = "gesamt",
}: {
  metric?: Metric;
  traeger?: Energietraeger;
}) {
  const [showEmbed, setShowEmbed] = useState(true);
  const [showBranding, setShowBranding] = useState(true);
  useWidgetTheme({
    onSettings: (s) => {
      if (typeof s.embed === "boolean") setShowEmbed(s.embed);
      if (typeof s.branding === "boolean") setShowBranding(s.branding);
    },
  });

  const { data: summary } = useCachedFetch<RegionSummary | null>(
    `/api/mastr/summary?region=de&type=${traeger}&segment=alle`,
    `kennzahl-${traeger}`,
    null,
    { longLived: false, keyPrefix: "sc-mastr-" },
  );

  const traegerLabel = TRAEGER_LABEL[traeger] ?? "Erneuerbare";
  const totalMw = summary ? summary.total_kwp / 1000 : null;
  const totalCount = summary ? summary.total_count : null;
  const avgKwp = summary && summary.total_count > 0 ? summary.total_kwp / summary.total_count : null;

  const isLeistung = metric === "leistung";
  const label = isLeistung ? "Deutschland" : "Anlagen";
  const value = isLeistung
    ? totalMw !== null
      ? `${totalMw.toLocaleString("de-DE", { maximumFractionDigits: 0 })} MW`
      : <LoadingDots />
    : totalCount !== null
      ? totalCount.toLocaleString("de-DE")
      : <LoadingDots />;
  const hint = isLeistung
    ? `installiert · ${traegerLabel}`
    : avgKwp !== null
      ? `⌀ ${avgKwp.toFixed(0)} kWp`
      : "⌀ — kWp";
  const shareText = isLeistung
    ? `Installierte ${traegerLabel}-Leistung in Deutschland – Solar Check`
    : `Anzahl ${traegerLabel}-Anlagen in Deutschland – Solar Check`;

  return (
    <div
      style={{
        background: "var(--widget-bg)",
        color: "var(--widget-fg)",
        borderRadius: "var(--widget-border-radius)",
        fontFamily: "var(--widget-font-family)",
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      <Kachel label={label} value={value} hint={hint} />
      <div style={{ fontSize: 11, color: "var(--color-text-muted)", paddingTop: 8 }}>
        {summary ? "Stand " + formatDataAsOf(summary.data_as_of) : ""}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ height: 1, background: "var(--widget-muted)", opacity: 0.2, marginBottom: 8 }} />
        {/* Data-source credit — always shown. */}
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
            onCopyLink={() => navigator.clipboard?.writeText(`${shareText}\n${SHARE_URL}`).catch(() => {})}
            onWhatsApp={() =>
              window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${SHARE_URL}`)}`, "_blank")
            }
            onTwitter={() =>
              window.open(
                `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(SHARE_URL)}`,
                "_blank",
              )
            }
            onEmbed={showEmbed ? () => window.open("/energie-widgets#kennzahl", "_blank", "noopener") : undefined}
            isExporting={false}
            canNativeShare={false}
          />
        </div>
      </div>
    </div>
  );
}
