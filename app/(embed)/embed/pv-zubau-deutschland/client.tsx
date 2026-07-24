"use client";

import { useState } from "react";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import ZubauWidget from "../../../../components/charts/ZubauWidget";
import type { NationalSolarSeries } from "../../../../lib/mastr-data";

/** Themebare Hülle für die Zubau-Datenstory im Embed-Kontext. */
export default function ZubauEmbed({ series }: { series: NationalSolarSeries | null }) {
  const [showEmbed, setShowEmbed] = useState(true);
  const [showBranding, setShowBranding] = useState(true);
  useWidgetTheme({
    onSettings: (s) => {
      if (typeof s.embed === "boolean") setShowEmbed(s.embed);
      if (typeof s.branding === "boolean") setShowBranding(s.branding);
    },
  });

  if (!series || series.points.length === 0) {
    return (
      <div style={{ padding: 16, fontFamily: "var(--widget-font-family)", color: "var(--widget-muted)", fontSize: 13 }}>
        Die Zubaudaten sind gerade nicht abrufbar.
      </div>
    );
  }

  return <ZubauWidget series={series} variant="embed" showEmbed={showEmbed} branding={showBranding} />;
}
