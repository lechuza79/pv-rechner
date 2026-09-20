"use client";

import { useState } from "react";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import ZubauWidget from "../../../../components/charts/ZubauWidget";
import {
  WIDGET_SETTINGS_DEFAULTS,
  type WidgetSettings,
} from "../../../../lib/widget-settings";
import type { NationalSolarSeries } from "../../../../lib/mastr-data";

/**
 * Themebare Hülle für die Zubau-Datenstory im Embed-Kontext. Reicht ALLE
 * funktionalen Schalter durch — vorher kamen nur `embed` und `branding` an,
 * `share=0` und `onsite=1` blieben wirkungslos.
 */
export default function ZubauEmbed({ series }: { series: NationalSolarSeries | null }) {
  const [settings, setSettings] = useState<WidgetSettings>(WIDGET_SETTINGS_DEFAULTS);
  useWidgetTheme({
    onSettings: (partial) => setSettings((prev) => ({ ...prev, ...partial })),
  });

  if (!series || series.points.length === 0) {
    return (
      <div style={{ padding: 16, fontFamily: "var(--widget-font-family)", color: "var(--widget-muted)", fontSize: "var(--font-size-small)" }}>
        Die Zubaudaten sind gerade nicht abrufbar.
      </div>
    );
  }

  return (
    <ZubauWidget
      series={series}
      variant="embed"
      showEmbed={settings.embed}
      branding={settings.branding}
      share={settings.share}
      onsite={settings.onsite}
    />
  );
}
