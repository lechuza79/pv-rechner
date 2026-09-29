"use client";
import { useState } from "react";
import EnergyFlowModal, { type ExampleDayEntry } from "../../../../components/EnergyFlowModal";
import StatCard from "../../../../components/calculator/ResultStatCard";
import type { SolarMonth } from "../../../../lib/balkon-sim";

interface ResultStatsProps {
  effEv:number; autarkie:number; jahresertrag:number; gesamtVerbrauch:number;
  speicherKwh:number; monthly:SolarMonth[]; exampleDays:ExampleDayEntry[];
}
export default function ResultStats({effEv,autarkie,jahresertrag,gesamtVerbrauch,speicherKwh,monthly,exampleDays}:ResultStatsProps) {
  const [flowOpen, setFlowOpen] = useState(false);
  return (
    <>
      <div className="pv-technical-block">
        <h3>Dein Solarstrom im Haushalt</h3>
        <div className="pv-technical-metrics">
          <StatCard label="Autarkie" value={String(autarkie)} unit="%" help="Anteil deines gesamten Stromverbrauchs, den die PV-Anlage deckt." />
          <StatCard label="Eigenverbrauch" value={String(Math.round(effEv))} unit="%" help="Anteil deines Solarertrags, den du selbst nutzt statt einzuspeisen." />
        </div>
        <p>Deine Anlage deckt {autarkie} % deines Strombedarfs. Von ihrem Solarstrom nutzt du {Math.round(effEv)} % selbst{speicherKwh > 0 ? " – direkt oder über den Speicher" : ""}; der Rest fließt ins Netz. Selbst genutzter Strom spart den Netzstrompreis.</p>
        <button type="button" className="wp-result-details-link" onClick={() => setFlowOpen(true)}>So verteilt sich dein Strom</button>
      </div>

      <EnergyFlowModal
        open={flowOpen}
        onClose={() => setFlowOpen(false)}
        jahresertrag={jahresertrag}
        gesamtVerbrauch={gesamtVerbrauch}
        effEv={effEv}
        autarkie={autarkie}
        speicherKwh={speicherKwh}
        monthly={monthly}
        exampleDays={exampleDays}
      />


    </>
  );
}
