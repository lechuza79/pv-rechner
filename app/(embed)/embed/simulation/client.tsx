"use client";

import { useState } from "react";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import SimulationPanel from "../../../../components/SimulationPanel";

const DEFAULT_PLZ = "10115";

// Embeddable live PV simulation. Recycles the same <SimulationPanel> the public
// /pv-simulation page renders, themed via the --widget-* tokens (URL params +
// same-origin postMessage). No site header, no chart export — but the full
// household profile, system grid, day-curve chart and a CTA back to the site.
//
// The panel grows as the visitor interacts (weather → household → grid → chart),
// but a plain embedded <iframe> has a fixed height with no way to report back.
// So we pre-load a default location (overridable via ?plz=) and the demo sets a
// generous fixed height that fits the fully expanded state.
export default function SimulationWidget({ plz = "" }: { plz?: string }) {
  useWidgetTheme();

  const [initialPlz] = useState(() => (/^\d{5}$/.test(plz) ? plz : DEFAULT_PLZ));

  return (
    <div style={{ maxWidth: 380, margin: "0 auto", padding: 16 }}>
      <SimulationPanel embed initialPlz={initialPlz} showExport={false} />
    </div>
  );
}
