"use client";

import { useState } from "react";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import HeizkostenrennenWidget from "../../../../components/charts/HeizkostenrennenWidget";

// Dünne Hülle: Theme + Flags. Das Rennen selbst (components/charts/
// HeizkostenrennenWidget) rechnet aus dem Wärmepumpen-Rechner und steht
// direkt gerendert im Ratgeber /ratgeber/gasheizung-oder-waermepumpe.

export default function HeizkostenrennenEmbed() {
  const [showEmbed, setShowEmbed] = useState(true);
  const [showBranding, setShowBranding] = useState(true);
  const [onsite, setOnsite] = useState(false);
  useWidgetTheme({
    onSettings: (s) => {
      if (typeof s.embed === "boolean") setShowEmbed(s.embed);
      if (typeof s.branding === "boolean") setShowBranding(s.branding);
      if (typeof s.onsite === "boolean") setOnsite(s.onsite);
    },
  });

  return (
    <div
      style={{
        background: onsite ? "transparent" : "var(--widget-bg)",
        color: "var(--widget-fg)",
        fontFamily: "var(--widget-font-family)",
        maxWidth: 560,
        margin: "0 auto",
      }}
    >
      <HeizkostenrennenWidget onsite={onsite} branding={showBranding} showEmbed={showEmbed} />
    </div>
  );
}
