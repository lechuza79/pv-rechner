"use client";

import { useState } from "react";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import AnlagenbestandWidget from "../../../../components/charts/AnlagenbestandWidget";
import { WIDGET_SETTINGS_DEFAULTS, type WidgetSettings } from "../../../../lib/widget-settings";
import type { Anlagenbestand } from "../../../../lib/anlagenbestand";

/** Themebare Hülle im Embed-Kontext; reicht alle funktionalen Schalter durch. */
export default function AnlagenbestandEmbed({ bestand }: { bestand: Anlagenbestand | null }) {
  const [settings, setSettings] = useState<WidgetSettings>(WIDGET_SETTINGS_DEFAULTS);
  useWidgetTheme({ onSettings: (partial) => setSettings((prev) => ({ ...prev, ...partial })) });

  if (!bestand || bestand.segmente.length === 0) {
    return (
      <div style={{ padding: 16, fontFamily: "var(--widget-font-family)", color: "var(--widget-muted)", fontSize: "var(--font-size-small)" }}>
        Die Bestandszahlen sind gerade nicht abrufbar.
      </div>
    );
  }

  return (
    <AnlagenbestandWidget
      bestand={bestand}
      variant="embed"
      showEmbed={settings.embed}
      branding={settings.branding}
      share={settings.share}
      onsite={settings.onsite}
    />
  );
}
