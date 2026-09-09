"use client";

import { useMemo, useState } from "react";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import { usePrices } from "../../../../lib/prices";
import { feedInRatesFor } from "../../../../lib/feedin-config";
import { kostenrennen, RENNEN_OHNE_MIT_PV } from "../../../../lib/kostenrennen";
import KostenrennenWidget from "../../../../components/charts/KostenrennenWidget";

// Dünne Hülle: Theme + Flags. Das Rennen selbst (components/charts/
// KostenrennenWidget) ist selbst-enthaltend; dasselbe Bauteil steht direkt
// gerendert im Ratgeber. Preise kommen live wie im Rechner (usePrices), damit
// Rennen und Rechner nie auseinanderlaufen.

export default function KostenrennenEmbed() {
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

  const prices = usePrices();
  const rennen = useMemo(() => kostenrennen(RENNEN_OHNE_MIT_PV, { prices, feedIn: feedInRatesFor() }), [prices]);

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
      <KostenrennenWidget rennen={rennen} onsite={onsite} branding={showBranding} showEmbed={showEmbed} preiseStandIso={prices.validFrom} />
    </div>
  );
}
