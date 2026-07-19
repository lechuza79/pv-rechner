"use client";

import { useState } from "react";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
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
      showEmbed={showEmbed}
      branding={showBranding}
    />
  );
}
