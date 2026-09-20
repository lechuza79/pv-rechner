"use client";

import { useMemo, useState } from "react";
import { Kachel, formatDataAsOf } from "../../../../components/MastrHeroSection";
import { LoadingDots } from "../../../../components/LoadingDots";
import { useCachedFetch } from "../../../../lib/use-cached-fetch";
import type { Energietraeger, RegionSummary } from "../../../../lib/mastr-data";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import {
  WidgetFooter,
  WidgetSourceEdge,
  useShareOnlyActions,
} from "../../../../components/WidgetExport";
import { WIDGETS, WIDGET_MAX_WIDTH_COMPACT } from "../../../../lib/widget-registry";
import {
  WIDGET_SETTINGS_DEFAULTS,
  type WidgetSettings,
} from "../../../../lib/widget-settings";

// Single KPI tile from the Marktstammdatenregister — either installed power or
// plant count — reusing the same <Kachel> the homepage/karte composite renders,
// so the number is one source of truth. Compact widget → ⋯ menu (no PNG export,
// there's no chart).

export type Metric = "leistung" | "anlagen";

// Identität (Teilen-Ziel, Quelle, nächster Schritt) kommt aus dem Register;
// Titel und Teilen-Text tragen zusätzlich die gewählte Kennzahl — ein Zitat
// „Kennzahl" wäre wertlos, man sähe nicht, wovon.
const WIDGET = WIDGETS.kennzahl;

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
  const [settings, setSettings] = useState<WidgetSettings>(WIDGET_SETTINGS_DEFAULTS);
  useWidgetTheme({
    onSettings: (partial) => setSettings((prev) => ({ ...prev, ...partial })),
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

  // Photovoltaik traegt Peak-Leistung (kWp/MWp), Wind und Biomasse nicht — die
  // Einheit folgt dem gewaehlten Energietraeger, sonst behauptet das Widget Peak
  // fuer ein Windrad.
  const peak = traeger === "solar" ? "p" : "";
  const isLeistung = metric === "leistung";
  const label = isLeistung ? "Deutschland" : "Anlagen";
  const value = isLeistung
    ? totalMw !== null
      ? `${totalMw.toLocaleString("de-DE", { maximumFractionDigits: 0 })} MW${peak}`
      : <LoadingDots />
    : totalCount !== null
      ? totalCount.toLocaleString("de-DE")
      : <LoadingDots />;
  const hint = isLeistung
    ? `installiert · ${traegerLabel}`
    : avgKwp !== null
      ? `⌀ ${avgKwp.toFixed(0)} kW${peak}`
      : `⌀ — kW${peak}`;
  const titel = isLeistung
    ? `Installierte ${traegerLabel}-Leistung in Deutschland`
    : `Anzahl ${traegerLabel}-Anlagen in Deutschland`;
  const shareText = `${titel} – Solar Check`;

  // Ein Register-Eintrag, auf die gewählte Kennzahl gelesen: Titel und
  // Teilen-Text nennen sie, alles andere (Quelle, Lizenz, nächster Schritt,
  // Teilen-Ziel) bleibt der eine Eintrag.
  const widget = useMemo(() => ({ ...WIDGET, title: titel, shareText }), [titel, shareText]);

  // Kein Bild-Export: eine einzelne Kachel ist kein aufnehmbares SVG
  // (`exportable: false` im Register).
  const actions = useShareOnlyActions(widget, shareText);

  return (
    <div
      style={{
        position: "relative",
        background: "var(--widget-bg)",
        color: "var(--widget-fg)",
        borderRadius: "var(--widget-border-radius)",
        fontFamily: "var(--widget-font-family)",
        padding: 16,
        paddingRight: 22,
        maxWidth: WIDGET_MAX_WIDTH_COMPACT,
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      {/* Quelle vertikal an der rechten Kante (geteilter Baustein), nie als
          horizontaler Block. Auf einer eigenen Seite kreditiert die Seite. */}
      <WidgetSourceEdge widget={widget} visible={!settings.onsite} />
      <Kachel label={label} value={value} hint={hint} />
      <div style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-muted)", paddingTop: 8 }}>
        {summary ? "Stand " + formatDataAsOf(summary.data_as_of) : ""}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ height: 1, background: "var(--widget-muted)", opacity: 0.2 }} />
        {/* Fußzeile aus dem geteilten Baustein: nächster Schritt, Aktionen
            (inkl. „Zitieren"), Marke. Sehr klein → ⋯-Menü statt Knopfreihe. */}
        <WidgetFooter
          widget={widget}
          chartExport={actions}
          share={settings.share}
          branding={settings.branding}
          showEmbed={settings.embed}
          onsite={settings.onsite}
          compact
        />
      </div>
    </div>
  );
}
