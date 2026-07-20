// Shared 24-hour day-profile chart: yellow generation area (the midday hump)
// with the covered consumption stacked underneath per hour (direct / battery /
// grid). Presentational only — no hooks, so it renders in both server and
// client contexts (EnergyFlowModal + the EEG guide page use it).
//
// Semantic colors are FIXED (green = self-used, grey = grid), never themed —
// same convention as the result page's energy views.
import { v } from "../lib/theme";
import type { DayHour } from "../lib/pv-sim";

// Semantische Farben — identisch zu EnergyFlowModal, damit die Ansichten zusammen lesen.
export const DAY_C_DIRECT = "var(--color-positive)";      // direkt aus der Sonne — grün
export const DAY_C_BATTERY = "var(--color-accent-light)"; // aus dem Speicher — helles Blau
export const DAY_C_GRID = "var(--color-text-muted)";      // aus dem Netz — grau
export const DAY_C_SUN = "#F4B740";                        // Erzeugung — Sonnengelb

export function DayLegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: v("--color-text-muted") }}>
      <span style={{ width: 9, height: 9, borderRadius: 2, background: color, flexShrink: 0 }} />
      {label}
    </span>
  );
}

/** Tages-Detail: 24 Stunden. Gelbe Fläche = Erzeugung (Mittagsberg), darunter je
 *  Stunde der gedeckte Verbrauch (direkt / Speicher / Netz). `scaleMax` ist eine
 *  GEMEINSAME y-Skala über alle verglichenen Tage (sonst wirkt ein schwächerer
 *  Tag hochgezoomt). `showLegend` blendet die Legende aus, wenn der Aufrufer
 *  eine gemeinsame Legende für mehrere Charts zeigt. */
export default function DayProfileChart({
  hours,
  scaleMax,
  showLegend = true,
}: {
  hours: DayHour[];
  scaleMax: number;
  showLegend?: boolean;
}) {
  const W = 340, H = 148, padB = 18, padT = 10, chartH = H - padB - padT;
  const maxY = Math.max(scaleMax, 0.1);
  const slot = W / 24;
  const barW = slot * 0.66;
  const base = padT + chartH;
  const yOf = (kwh: number) => padT + chartH - (kwh / maxY) * chartH;
  const prodArea = `${slot / 2},${base} ` +
    hours.map((h, i) => `${i * slot + slot / 2},${yOf(Math.min(h.prod, maxY))}`).join(" ") +
    ` ${23 * slot + slot / 2},${base}`;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} role="img" aria-label="Tagesverlauf: Erzeugung und Verbrauch über 24 Stunden">
        {/* Erzeugung als gelbe Fläche */}
        <polygon points={prodArea} fill={DAY_C_SUN} fillOpacity={0.22} stroke={DAY_C_SUN} strokeWidth={1.4} strokeLinejoin="round" />
        {/* Verbrauchs-Deckung je Stunde: direkt / Speicher / Netz */}
        {hours.map((h, i) => {
          const x = i * slot + (slot - barW) / 2;
          const segs = [
            { v: h.direct, c: DAY_C_DIRECT },
            { v: h.discharge, c: DAY_C_BATTERY },
            { v: h.grid, c: DAY_C_GRID },
          ];
          let cursor = base;
          return (
            <g key={i}>
              {segs.map((s, k) => {
                const hh = (s.v / maxY) * chartH;
                cursor -= hh;
                return hh > 0.3 ? <rect key={k} x={x} y={cursor} width={barW} height={hh} fill={s.c} /> : null;
              })}
            </g>
          );
        })}
        {[0, 6, 12, 18].map((hr) => (
          <text key={hr} x={hr * slot + slot / 2} y={H - 5} textAnchor="middle" fontSize={9.5} fill={v("--color-text-muted")} fontFamily={v("--font-text")}>{hr}:00</text>
        ))}
      </svg>
      {showLegend && (
        <div style={{ display: "flex", gap: 10, marginTop: 4, justifyContent: "center", flexWrap: "wrap" }}>
          <DayLegendDot color={DAY_C_SUN} label="Erzeugung" />
          <DayLegendDot color={DAY_C_DIRECT} label="direkt" />
          <DayLegendDot color={DAY_C_BATTERY} label="Speicher" />
          <DayLegendDot color={DAY_C_GRID} label="Netz" />
        </div>
      )}
    </div>
  );
}
