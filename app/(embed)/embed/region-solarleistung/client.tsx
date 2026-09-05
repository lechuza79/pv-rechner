"use client";

import { useState } from "react";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import { WIDGET_SETTINGS_DEFAULTS, type WidgetSettings } from "../../../../lib/widget-settings";
import RegionSolarLive from "../../../../components/RegionSolarLive";

export type RegionSolarleistungEmbedProps = {
  name?: string;
  lat?: number;
  lon?: number;
  totalKwp?: number;
  liveUrl?: string;
  error?: string;
};

/** Themebare Hülle für das Bundesland-Solarleistungs-Widget im Embed-Kontext. */
export default function RegionSolarleistungEmbed(props: RegionSolarleistungEmbedProps) {
  const [settings, setSettings] = useState<WidgetSettings>(WIDGET_SETTINGS_DEFAULTS);
  useWidgetTheme({
    onSettings: (partial) => setSettings((prev) => ({ ...prev, ...partial })),
  });

  if (
    props.error ||
    !props.name ||
    !props.liveUrl ||
    typeof props.lat !== "number" ||
    typeof props.lon !== "number" ||
    !props.totalKwp
  ) {
    return (
      <div style={{ padding: 16, fontFamily: "var(--widget-font-family)", color: "var(--widget-muted)", fontSize: "var(--font-size-small)" }}>
        {props.error ?? "Für dieses Bundesland liegen keine Daten für die Simulation vor."}
      </div>
    );
  }

  return (
    <RegionSolarLive
      lat={props.lat}
      lon={props.lon}
      totalKwp={props.totalKwp}
      name={props.name}
      liveUrl={props.liveUrl}
      onsite={settings.onsite}
      share={settings.share}
      showEmbed={settings.embed}
      branding={settings.branding}
    />
  );
}
