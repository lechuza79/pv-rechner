"use client";
import { v } from "../lib/theme";
import { YEARS, FUEL, PERSONEN } from "../lib/constants";
import { calcFuelCost25, calcWpGridCost25 } from "../lib/calc";

interface ResultStatsProps {
  total: number;
  kosten: number;
  wp: string;
  ea: string;
  eaKm: number;
  effEv: number;
  jahresertrag: number;
  personen: number;
  oStrom: number;
  fuelType: "gas" | "oil";
  setFuelType: (v: "gas" | "oil") => void;
}

export default function ResultStats({
  total, kosten, wp, ea, eaKm, effEv, jahresertrag, personen, oStrom, fuelType, setFuelType,
}: ResultStatsProps) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", border: `1px solid ${v('--color-border')}` }}>
          <div style={{ fontSize: 11, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Rendite 25 Jahre</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: v('--font-mono'), color: total >= 0 ? v('--color-positive') : v('--color-negative'), marginTop: 4 }}>
            {total > 0 ? "+" : ""}{total.toLocaleString("de-DE")} €
          </div>
        </div>
        <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", border: `1px solid ${v('--color-border')}` }}>
          <div style={{ fontSize: 11, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>⌀ Ersparnis / Jahr</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: v('--font-mono'), color: v('--color-positive'), marginTop: 4 }}>
            {Math.round((total + kosten) / YEARS).toLocaleString("de-DE")} €
          </div>
        </div>
      </div>

      {wp !== "nein" && (() => {
        const autarky = Math.min(effEv / 100 * jahresertrag / (PERSONEN[personen].verbrauch + 3500 + (ea !== "nein" ? Math.round(eaKm * 0.18) : 0)), 1);
        const fuelCost = calcFuelCost25(3500, fuelType);
        const wpGridCost = calcWpGridCost25(3500, autarky, oStrom, 0.03);
        const netSaving = fuelCost - wpGridCost;
        return (
          <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "12px 16px", marginBottom: 16, border: `1px solid ${v('--color-border')}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                WP vs. {FUEL[fuelType].label}heizung · 25 Jahre
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                {(["gas", "oil"] as const).map(ft => (
                  <button key={ft} onClick={() => setFuelType(ft)} style={{
                    padding: "3px 8px", borderRadius: v('--radius-sm'), fontSize: 10, fontWeight: 600, cursor: "pointer",
                    background: fuelType === ft ? v('--color-negative-dim') : "transparent",
                    border: fuelType === ft ? `1px solid ${v('--color-negative-border')}` : `1px solid ${v('--color-border-muted')}`,
                    color: fuelType === ft ? v('--color-negative') : v('--color-text-muted'),
                  }}>{FUEL[ft].label}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <div>
                <span style={{ fontSize: 11, color: v('--color-negative') }}>{FUEL[fuelType].label}: </span>
                <span style={{ fontSize: 16, fontWeight: 700, fontFamily: v('--font-mono'), color: v('--color-negative'), textDecoration: "line-through", opacity: 0.7 }}>
                  {fuelCost.toLocaleString("de-DE")} €
                </span>
              </div>
              <div>
                <span style={{ fontSize: 11, color: v('--color-text-secondary') }}>WP Netz: </span>
                <span style={{ fontSize: 16, fontWeight: 700, fontFamily: v('--font-mono'), color: v('--color-text-secondary') }}>
                  {wpGridCost.toLocaleString("de-DE")} €
                </span>
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: v('--font-mono'), color: v('--color-positive'), marginTop: 4 }}>
              Ersparnis: {netSaving.toLocaleString("de-DE")} €
            </div>
            <div style={{ fontSize: 11, color: v('--color-text-muted'), marginTop: 4, lineHeight: 1.5 }}>
              {Math.round(3500 * 3.5).toLocaleString("de-DE")} kWh Wärme/Jahr · WP-Autarkie {Math.round(autarky * 100)} % · inkl. CO₂-Abgabe
            </div>
          </div>
        );
      })()}
    </>
  );
}
