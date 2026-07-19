"use client";

import { useState } from "react";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
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
  const [showEmbed, setShowEmbed] = useState(true);
  const [showBranding, setShowBranding] = useState(true);
  useWidgetTheme({
    onSettings: (s) => {
      if (typeof s.embed === "boolean") setShowEmbed(s.embed);
      if (typeof s.branding === "boolean") setShowBranding(s.branding);
    },
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
      <div style={{ padding: 16, fontFamily: "var(--widget-font-family)", color: "var(--widget-muted)", fontSize: 13 }}>
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
      showEmbed={showEmbed}
      branding={showBranding}
    />
  );
}
