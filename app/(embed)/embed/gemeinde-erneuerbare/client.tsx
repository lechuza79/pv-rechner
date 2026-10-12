"use client";
import type {ComponentProps} from "react";
import WidgetPresentation from "../../../../components/dashboard/WidgetPresentation";

import { useState } from "react";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import GemeindeErneuerbareWidget from "../../../../components/atlas/GemeindeErneuerbareWidget";
import { WIDGET_SETTINGS_DEFAULTS, type WidgetSettings } from "../../../../lib/widget-settings";

type Gen = { count: number; kwp: number };

export type ErneuerbareEmbedProps = {
  name?: string;
  dataAsOf?: string;
  solarKwp?: number;
  generators?: { wind: Gen; biomasse: Gen; wasser: Gen };
  speicherKwh?: number;
  liveUrl?: string;
  error?: string;
};

/** Themebare Hülle für das Erneuerbaren-Mix-Widget im Embed-Kontext. */
function GemeindeErneuerbareEmbedContent(props: ErneuerbareEmbedProps) {
  const [settings, setSettings] = useState<WidgetSettings>(WIDGET_SETTINGS_DEFAULTS);
  useWidgetTheme({
    onSettings: (partial) => setSettings((prev) => ({ ...prev, ...partial })),
  });

  if (props.error || !props.name || !props.generators || !props.liveUrl) {
    return (
      <div style={{ padding: 16, fontFamily: "var(--widget-font-family)", color: "var(--widget-muted)", fontSize: "var(--font-size-small)" }}>
        {props.error ?? "Keine Daten."}
      </div>
    );
  }

  return (
    <GemeindeErneuerbareWidget
      name={props.name}
      dataAsOf={props.dataAsOf}
      solarKwp={props.solarKwp ?? 0}
      generators={props.generators}
      speicherKwh={props.speicherKwh ?? 0}
      liveUrl={props.liveUrl}
      onsite={settings.onsite}
      share={settings.share}
      showEmbed={settings.embed}
      branding={settings.branding}
    />
  );
}

export default function GemeindeErneuerbareEmbed(props:ComponentProps<typeof GemeindeErneuerbareEmbedContent>){return <WidgetPresentation widgetId="gemeinde-erneuerbare"><GemeindeErneuerbareEmbedContent {...props}/></WidgetPresentation>;}
