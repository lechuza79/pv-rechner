"use client";

import { useState } from "react";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import { WIDGET_SETTINGS_DEFAULTS, type WidgetSettings } from "../../../../lib/widget-settings";
import GemeindeSolarLive from "../../../../components/atlas/GemeindeSolarLive";

export type SolarleistungEmbedProps = {
  name?: string;
  lat?: number;
  lon?: number;
  totalKwp?: number;
  liveUrl?: string;
  error?: string;
};

/** Themebare Hülle für das Solarleistung-Simulations-Widget im Embed-Kontext. */
export default function GemeindeSolarleistungEmbed(props: SolarleistungEmbedProps) {
  const [settings, setSettings] = useState<WidgetSettings>(WIDGET_SETTINGS_DEFAULTS);
  useWidgetTheme({
    onSettings: (partial) => setSettings((prev) => ({ ...prev, ...partial })),
  });

  if (
    props.error ||
    !props.name ||
    !props.liveUrl ||
    typeof props.lat !== "number" ||
    typeof props.lon !== "number"
  ) {
    return (
      <div style={{ padding: 16, fontFamily: "var(--widget-font-family)", color: "var(--widget-muted)", fontSize: 13 }}>
        {props.error ?? "Für diese Gemeinde liegt kein Standort für die Simulation vor."}
      </div>
    );
  }

  return (
    <GemeindeSolarLive
      lat={props.lat}
      lon={props.lon}
      totalKwp={props.totalKwp ?? 0}
      name={props.name}
      liveUrl={props.liveUrl}
      onsite={settings.onsite}
      share={settings.share}
      showEmbed={settings.embed}
      branding={settings.branding}
    />
  );
}
