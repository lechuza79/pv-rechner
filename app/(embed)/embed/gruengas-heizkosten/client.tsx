"use client";

import { useMemo, useState } from "react";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import GruengasWidget, { type GruengasView } from "../../../../components/charts/GruengasWidget";
import { greengasMusterVariants, PV_COVERAGE } from "../../../../lib/greengas-muster";

// Dünne Hülle: Theme + funktionale Flags. Das Grüngas-Widget selbst
// (components/charts/GruengasWidget) ist selbst-enthaltend (Kopf, Chart,
// Ersparnis/Kosten, Legende + CTA, Aktionen, Quelle). Dasselbe Bauteil steckt im
// Ratgeber (per onsite-Embed). `view` wählt: ganzes Widget, nur Balken, nur Linien.

const ALLOWED: GruengasView[] = ["full", "bars", "lines"];

export default function GruengasHeizkostenWidget() {
  const [showEmbed, setShowEmbed] = useState(true);
  const [showBranding, setShowBranding] = useState(true);
  const [onsite, setOnsite] = useState(false);
  const [view, setView] = useState<GruengasView>("full");
  useWidgetTheme({
    onSettings: (s) => {
      if (typeof s.embed === "boolean") setShowEmbed(s.embed);
      if (typeof s.branding === "boolean") setShowBranding(s.branding);
      if (typeof s.onsite === "boolean") setOnsite(s.onsite);
      if (typeof s.view === "string" && (ALLOWED as string[]).includes(s.view)) setView(s.view as GruengasView);
    },
  });

  const variants = useMemo(() => greengasMusterVariants(), []);

  return (
    <div
      style={{
        background: onsite ? "transparent" : "var(--widget-bg)",
        color: "var(--widget-fg)",
        fontFamily: "var(--widget-font-family)",
        maxWidth: view === "bars" ? 380 : 640,
        margin: "0 auto",
      }}
    >
      <GruengasWidget
        variants={variants}
        pvCoveragePct={Math.round(PV_COVERAGE * 100)}
        view={view}
        onsite={onsite}
        branding={showBranding}
        showEmbed={showEmbed}
      />
    </div>
  );
}
