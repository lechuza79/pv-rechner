"use client";

import { useState } from "react";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import SimulationPanel from "../../../../components/SimulationPanel";
import { WidgetSourceEdge } from "../../../../components/WidgetExport";
import { WIDGETS } from "../../../../lib/widget-registry";
import {
  WIDGET_SETTINGS_DEFAULTS,
  type WidgetSettings,
} from "../../../../lib/widget-settings";

const DEFAULT_PLZ = "10115";

// Identität (Titel, Teilen-Ziel, Quelle, nächster Schritt) kommt aus dem
// Register — ein Eintrag speist Fußzeile, Quellen-Kante und Zitat.
const WIDGET = WIDGETS.simulation;

// Embeddable live PV simulation. Recycles the same <SimulationPanel> the public
// /pv-simulation page renders, themed via the --widget-* tokens (URL params +
// same-origin postMessage). No site header — but the full household profile,
// system grid, day-curve chart and a CTA back to the site.
//
// The panel grows as the visitor interacts (weather → household → grid → chart),
// but a plain embedded <iframe> has a fixed height with no way to report back.
// So we pre-load a default location (overridable via ?plz=) and the demo sets a
// generous fixed height that fits the fully expanded state.
export default function SimulationWidget({ plz = "" }: { plz?: string }) {
  const [settings, setSettings] = useState<WidgetSettings>(WIDGET_SETTINGS_DEFAULTS);
  useWidgetTheme({
    onSettings: (partial) => setSettings((prev) => ({ ...prev, ...partial })),
  });

  const [initialPlz] = useState(() => (/^\d{5}$/.test(plz) ? plz : DEFAULT_PLZ));

  return (
    <div style={{ position: "relative", maxWidth: 380, margin: "0 auto", padding: 16, paddingRight: 22 }}>
      {/* Quelle vertikal an der rechten Kante (geteilter Baustein), nie als
          horizontaler Block. Auf einer eigenen Seite kreditiert die Seite. */}
      <WidgetSourceEdge widget={WIDGET} visible={!settings.onsite} />
      <SimulationPanel
        embed
        initialPlz={initialPlz}
        showExport={false}
        embedButton={settings.embed}
        branding={settings.branding}
        share={settings.share}
        onsite={settings.onsite}
      />
    </div>
  );
}
