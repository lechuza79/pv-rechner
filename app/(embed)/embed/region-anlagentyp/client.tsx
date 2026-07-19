"use client";

import { useState } from "react";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import RegionAnlagentypWidget, { type AnlagentypSegment } from "../../../../components/RegionAnlagentypWidget";

export type RegionAnlagentypEmbedProps = {
  name?: string;
  segments?: AnlagentypSegment[];
  liveUrl?: string;
  error?: string;
};

/** Themebare Hülle für das Bundesland-Anlagentyp-Widget im Embed-Kontext. */
export default function RegionAnlagentypEmbed(props: RegionAnlagentypEmbedProps) {
  const [showEmbed, setShowEmbed] = useState(true);
  const [showBranding, setShowBranding] = useState(true);
  useWidgetTheme({
    onSettings: (s) => {
      if (typeof s.embed === "boolean") setShowEmbed(s.embed);
      if (typeof s.branding === "boolean") setShowBranding(s.branding);
    },
  });

  if (props.error || !props.name || !props.liveUrl || !props.segments || props.segments.length === 0) {
    return (
      <div style={{ padding: 16, fontFamily: "var(--widget-font-family)", color: "var(--widget-muted)", fontSize: 13 }}>
        {props.error ?? "Für dieses Bundesland liegen keine Bestandsdaten vor."}
      </div>
    );
  }

  return (
    <RegionAnlagentypWidget
      name={props.name}
      segments={props.segments}
      liveUrl={props.liveUrl}
      showEmbed={showEmbed}
      branding={showBranding}
    />
  );
}
