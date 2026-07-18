"use client";
import { v } from "../../../../lib/theme";
import { YEARS, FUEL } from "../../../../lib/constants";
import { calcFuelCost25, calcWpGridCost25 } from "../../../../lib/calc";
import { EA_KWH_PER_KM } from "../../../../lib/consumption";

interface ResultStatsProps {
  /** Rendite (25-J-Ende) des gewählten Szenarios — die Szenario-Wahl sitzt oben. */
  total: number;
  kosten: number;
  wp: string;
  ea: string;
  eaKm: number;
  /** Building-based WP annual electricity (kWh) — same value the rest of the
   *  result page shows, NOT the old 3.500-kWh flat rate. */
  wpKwh: number;
  effEv: number;
  autarkie: number;
  jahresertrag: number;
  baseKwh: number;
  oStrom: number;
  fuelType: "gas" | "oil";
  setFuelType: (v: "gas" | "oil") => void;
}

export default function ResultStats({
  total, kosten, wp, ea, eaKm, wpKwh, effEv, autarkie, jahresertrag, baseKwh, oStrom, fuelType, setFuelType,
}: ResultStatsProps) {
  return (
    <>
      {/* Energie-Unabhängigkeit: Autarkie und Eigenverbrauch als Paar — die zwei
          werden oft verwechselt, deshalb nebeneinander mit erklärender Zeile. */}
      <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", marginBottom: 10, border: `1px solid ${v('--color-border')}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Autarkie</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: v('--font-mono'), color: v('--color-positive'), marginTop: 4 }}>{autarkie} %</div>
            <div style={{ fontSize: 11, color: v('--color-text-muted'), marginTop: 2 }}>deines Verbrauchs deckst du selbst</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Eigenverbrauch</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: v('--font-mono'), color: v('--color-accent'), marginTop: 4 }}>{Math.round(effEv)} %</div>
            <div style={{ fontSize: 11, color: v('--color-text-muted'), marginTop: 2 }}>deines Solarstroms nutzt du selbst</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: v('--color-text-muted'), marginTop: 10, lineHeight: 1.5, borderTop: `1px solid ${v('--color-border-muted')}`, paddingTop: 8 }}>
          <strong style={{ color: v('--color-text-secondary') }}>Autarkie</strong> misst deine Unabhängigkeit vom Netz,{" "}
          <strong style={{ color: v('--color-text-secondary') }}>Eigenverbrauch</strong> wie gut die Anlage zu deinem Verbrauch passt. Ein Speicher hebt beide.
        </div>
      </div>

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
        const autarky = Math.min(effEv / 100 * jahresertrag / (baseKwh + wpKwh + (ea !== "nein" ? Math.round(eaKm * EA_KWH_PER_KM) : 0)), 1);
        const fuelCost = calcFuelCost25(wpKwh, fuelType);
        const wpGridCost = calcWpGridCost25(wpKwh, autarky, oStrom, 0.03);
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
              {Math.round(wpKwh * 3.5).toLocaleString("de-DE")} kWh Wärme/Jahr · WP-Autarkie {Math.round(autarky * 100)} % · inkl. CO₂-Abgabe
            </div>
          </div>
        );
      })()}
    </>
  );
}
