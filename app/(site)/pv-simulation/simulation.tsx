"use client";
import { useSearchParams } from "next/navigation";
import SimulationPanel from "../../../components/SimulationPanel";
import { v } from "../../../lib/theme";

// ─── Main Component ─────────────────────────────────────────────────────────
// Public live-simulation page. The interactive body lives in the shared
// <SimulationPanel> (also used by the embeddable widget at /embed/simulation),
// so the two never drift apart. Here we add the site header, page chrome and
// the chart export bar.

export default function LiveSimulation() {
  const searchParams = useSearchParams();
  const initialPlz = searchParams.get("plz") || "";

  // The page around it provides heading and surface (neon redesign); this
  // keeps only the shared live panel, unchanged.
  return (
    <div style={{ maxWidth: v('--page-max-width'), margin: "0 auto" }}>
      <SimulationPanel initialPlz={initialPlz} />
    </div>
  );
}
