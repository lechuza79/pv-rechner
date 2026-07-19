"use client";

import { useState } from "react";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import GemeindeErneuerbareWidget from "../../../../components/atlas/GemeindeErneuerbareWidget";

type Gen = { count: number; kwp: number };

export type ErneuerbareEmbedProps = {
  name?: string;
  solarKwp?: number;
  generators?: { wind: Gen; biomasse: Gen; wasser: Gen };
  speicherKwh?: number;
  liveUrl?: string;
  error?: string;
};

/** Themebare Hülle für das Erneuerbaren-Mix-Widget im Embed-Kontext. */
export default function GemeindeErneuerbareEmbed(props: ErneuerbareEmbedProps) {
  const [showEmbed, setShowEmbed] = useState(true);
  const [showBranding, setShowBranding] = useState(true);
  useWidgetTheme({
    onSettings: (s) => {
      if (typeof s.embed === "boolean") setShowEmbed(s.embed);
      if (typeof s.branding === "boolean") setShowBranding(s.branding);
    },
  });

  if (props.error || !props.name || !props.generators || !props.liveUrl) {
    return (
      <div style={{ padding: 16, fontFamily: "var(--widget-font-family)", color: "var(--widget-muted)", fontSize: 13 }}>
        {props.error ?? "Keine Daten."}
      </div>
    );
  }

  return (
    <GemeindeErneuerbareWidget
      name={props.name}
      solarKwp={props.solarKwp ?? 0}
      generators={props.generators}
      speicherKwh={props.speicherKwh ?? 0}
      liveUrl={props.liveUrl}
      showEmbed={showEmbed}
      branding={showBranding}
    />
  );
}
