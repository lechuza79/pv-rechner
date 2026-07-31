"use client";

import { useState } from "react";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import { WIDGET_SETTINGS_DEFAULTS, type WidgetSettings } from "../../../../lib/widget-settings";
import RegionAnlagentypWidget, { type AnlagentypSegment } from "../../../../components/RegionAnlagentypWidget";

export type RegionAnlagentypEmbedProps = {
  name?: string;
  segments?: AnlagentypSegment[];
  liveUrl?: string;
  error?: string;
};

/** Themebare Hülle für das Bundesland-Anlagentyp-Widget im Embed-Kontext. */
export default function RegionAnlagentypEmbed(props: RegionAnlagentypEmbedProps) {
  const [settings, setSettings] = useState<WidgetSettings>(WIDGET_SETTINGS_DEFAULTS);
  useWidgetTheme({
    onSettings: (partial) => setSettings((prev) => ({ ...prev, ...partial })),
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
      onsite={settings.onsite}
      share={settings.share}
      showEmbed={settings.embed}
      branding={settings.branding}
    />
  );
}
