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

  return (
    <div style={{ background: v('--color-bg'), fontFamily: v('--font-text'), color: v('--color-text-primary'), minHeight: "100vh", padding: "0 16px 20px" }}>


      <div style={{ maxWidth: v('--page-max-width'), margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: v('--color-text-primary'), lineHeight: 1.2 }}>
            Live Simulation
          </h1>
          <p style={{ fontSize: 13, color: v('--color-text-muted'), marginTop: 6, lineHeight: 1.5 }}>
            Was produziert eine PV-Anlage an deinem Standort gerade?
          </p>
        </div>

        <SimulationPanel initialPlz={initialPlz} />
      </div>
    </div>
  );
}
