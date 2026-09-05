"use client";

import { useState } from "react";
import { Kachel, formatDataAsOf } from "../../../../components/MastrHeroSection";
import GemeindeWidgetShell from "../../../../components/atlas/GemeindeWidgetShell";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import { WIDGETS, widgetForPlace, WIDGET_MAX_WIDTH_COMPACT } from "../../../../lib/widget-registry";
import { WIDGET_SETTINGS_DEFAULTS, type WidgetSettings } from "../../../../lib/widget-settings";
import { pvLeistungTeile, speicherKwhTeile, wattProKopfTeile } from "../../../../lib/atlas-format";

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

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
 * shared widget shell: registry identity resolved to this municipality, so the
 * title, the shared image and the citation all name the place.
 */
export default function GemeindeSolarWidget(props: GemeindeWidgetProps) {
  const [settings, setSettings] = useState<WidgetSettings>(WIDGET_SETTINGS_DEFAULTS);
  useWidgetTheme({
    onSettings: (partial) => setSettings((prev) => ({ ...prev, ...partial })),
  });

  if (props.error || !props.name) {
    return (
      <div
        style={{
          maxWidth: WIDGET_MAX_WIDTH_COMPACT,
          margin: "0 auto",
          padding: 16,
          fontFamily: "var(--widget-font-family)",
          color: "var(--widget-muted)",
          fontSize: "var(--font-size-small)",
        }}
      >
        {props.error ?? "Keine Daten."}
      </div>
    );
  }

  const { name, population, count = 0, kwp = 0, kwpDach = 0, speicherKwh = 0, atlasPath } = props;
  const wPerCapitaDach = population ? Math.round((kwpDach * 1000) / population) : null;

  const widget = widgetForPlace(
    WIDGETS.gemeindeSolar,
    name,
    atlasPath ? `https://solar-check.io${atlasPath}` : undefined,
  );
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return (
    <GemeindeWidgetShell
      widget={widget}
      subline="Anlagenbestand aus dem Marktstammdatenregister"
      filename={`solar-check-solaranlagen-${slug}.png`}
      dataAsOf={props.dataAsOf ? formatDataAsOf(props.dataAsOf) : undefined}
      onsite={settings.onsite}
      share={settings.share}
      showEmbed={settings.embed}
      branding={settings.branding}
    >
      {/* Zahl und Einheit getrennt (…Teile statt fmt…): In einer 100-px-Spalte
          umbricht „41,8 MWp" als ein Text zwischen Zahl und Einheit — die
          Einheit landet dann allein in der zweiten Zeile und liest sich so
          groß wie der Wert. Die Mindestbreite trägt die längste Zahl mit ihrer
          Einheit („1.678 Wp"). */}
      <div style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(112px, 1fr))", gap: 8 }}>
        <Kachel label="Anlagen" value={nf(count)} />
        <Kachel label="Installiert" {...pvLeistungTeile(kwp)} />
        {wPerCapitaDach !== null && (
          <Kachel label="Je Einwohner" {...wattProKopfTeile(wPerCapitaDach)} hint="Dachanlagen" />
        )}
        {/* „Batteriespeicher", nicht „Speicher": der Wert zählt nur Batterien, wie
            auf der Atlas-Seite. Ein Pumpspeicherwerk im Ort steckt nicht darin —
            das Widget darf nicht mehr behaupten als die Seite. */}
        {speicherKwh > 0 && <Kachel label="Batteriespeicher" {...speicherKwhTeile(speicherKwh)} />}
      </div>
    </GemeindeWidgetShell>
  );
}
