"use client";

// Verlaufs-Chart 2000–2027 mit Ereignis-Timeline — dasselbe Muster wie die
// Zubau-Datenstory: Chart oben, darunter die nummerierten Weichenstellungen
// (EventTimeline, alle Erklärtexte im DOM). Die Ereignisse SIND die kuratierten
// ZUBAU_EVENTS — eine Quelle, keine zweite Meilenstein-Liste (dieselben
// politischen Fakten, dieselben geprüften Formulierungen, inkl. der
// Reform-Marke aus lib/eeg-reform-config).
//
// Alignment: EventTimeline positioniert seine Punkte prozentual innerhalb der
// PLOT_MARGIN-Ränder des Zubau-Charts. Dieser Chart rendert deshalb in echter
// Containerbreite (ResizeObserver) mit denselben Pixel-Rändern und derselben
// ±0,5-Jahres-Domäne — dann sitzen die Punkte exakt unter ihren Jahren.

import { useEffect, useRef, useState } from "react";
import EventTimeline from "../../../components/charts/EventTimeline";
import { PLOT_MARGIN, topRoundedRect } from "../../../components/charts/ZubauTimelineChart";
import { ZUBAU_EVENTS, ZUBAU_MILESTONE_YEARS } from "../../../components/charts/ZubauWidget";
import { v } from "../../../lib/theme";
import { MONAT_KURZ, type VerlaufJahr } from "./VerlaufsChart";

const ct = (n: number) => n.toLocaleString("de-DE", { minimumFractionDigits: 2 });

const PLOT_H = 170;
const Y_MAX = 60; // ct/kWh — über dem Spitzenwert 57,40 (2004)

const START_YEAR = ZUBAU_EVENTS[0].year; // 2000
const END_YEAR = ZUBAU_EVENTS[ZUBAU_EVENTS.length - 1].year; // 2027 (geplant)

interface HoverInfo {
  /** Beschriftung „Apr 2012" bzw. „2004 (Jahresbeginn)". */
  label: string;
  wert: number;
  /** Spaltenmitte in SVG-/CSS-Pixeln (SVG rendert 1:1 in Containerbreite). */
  cx: number;
}

export default function VerlaufMitMeilensteinen({ jahre }: { jahre: VerlaufJahr[] }) {
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(608);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const margin = PLOT_MARGIN;
  const height = margin.top + PLOT_H + margin.bottom;
  const plotW = Math.max(width - margin.left - margin.right, 100);
  const domainStart = START_YEAR - 0.5;
  const span = END_YEAR + 0.5 - domainStart;
  const x = (yearFloat: number) => margin.left + ((yearFloat - domainStart) / span) * plotW;
  const y = (val: number) => margin.top + PLOT_H - (val / Y_MAX) * PLOT_H;
  const yearW = plotW / span;
  const labelStep = yearW >= 19 ? 2 : 4;
  const gridSteps = [0, 10, 20, 30, 40, 50, 60];

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {/* Sofortiger, gestylter Hover-Tooltip (die nativen <title>-Tooltips
          erscheinen erst nach Sekunden und wirkten wie „kein Hover"). */}
      {hover && (
        <div
          style={{
            position: "absolute",
            left: Math.min(Math.max(hover.cx, 70), width - 70),
            top: 0,
            transform: "translateX(-50%)",
            background: v("--color-bg"),
            border: `1px solid ${v("--color-border")}`,
            borderRadius: v("--radius-md"),
            padding: "5px 10px",
            fontSize: v("--font-size-caption"),
            color: v("--color-text-secondary"),
            whiteSpace: "nowrap",
            pointerEvents: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            zIndex: 2,
          }}
        >
          {hover.label} ·{" "}
          <strong style={{ fontFamily: v("--font-mono"), color: v("--color-text-primary") }}>
            {ct(hover.wert)} ct/kWh
          </strong>
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label="Einspeisevergütung für kleine Dachanlagen seit 2000 in Cent pro Kilowattstunde, als Balken je Inbetriebnahme-Monat"
        style={{ display: "block", fontFamily: v("--font-text") }}
        onMouseLeave={() => setHover(null)}
      >
        {gridSteps.map((g) => (
          <g key={g}>
            <line
              x1={margin.left}
              x2={width - margin.right}
              y1={y(g)}
              y2={y(g)}
              stroke={v("--color-border")}
              strokeWidth={1}
              strokeDasharray={g === 0 ? undefined : "2 3"}
            />
            <text x={margin.left - 5} y={y(g) + 3} textAnchor="end" fontSize={9} fill={v("--color-text-muted")}>
              {g}
            </text>
          </g>
        ))}
        <text x={2} y={margin.top - 6} fontSize={9} fill={v("--color-text-muted")}>
          ct/kWh
        </text>
        {/* Gepunktete Vertikalen an den einschneidenden Wendepunkten — dieselbe
            Konvention (und dieselben Jahre) wie im Zubau-Chart. */}
        {ZUBAU_MILESTONE_YEARS.map((jahr) => (
          <line
            key={jahr}
            x1={x(jahr)}
            x2={x(jahr)}
            y1={margin.top}
            y2={margin.top + PLOT_H}
            stroke={v("--color-text-muted")}
            strokeWidth={1}
            strokeDasharray="2 4"
            opacity={0.6}
          />
        ))}
        {/* Jahres-Ära (2000–2011): Balken im Haus-Stil (oben abgerundet, wie
            der Zubau-Chart). Ab 2012 wird die Reihe monatlich — dort läuft sie
            als LINIE weiter, weil 170+ Einzelbalken keine Balken mehr sind. */}
        {jahre.filter((j) => j.bars.length === 1).map((j) => {
          const val = j.bars[0] as number;
          const bx = x(j.year - 0.5) + 2;
          const bw = yearW - 4;
          return (
            <path
              key={j.year}
              d={topRoundedRect(bx, y(val), bw, margin.top + PLOT_H - y(val), 2.5)}
              fill={v("--color-accent")}
              opacity={0.85}
            />
          );
        })}
        {(() => {
          // Monats-Ära als Linie mit weißem Halo (Haus-Stil der Chart-Linien).
          const pts: { x: number; y: number }[] = [];
          for (const j of jahre) {
            if (j.bars.length === 1) continue;
            j.bars.forEach((val, mi) => {
              if (val == null) return;
              pts.push({ x: x(j.year - 0.5 + (mi + 0.5) / 12), y: y(val) });
            });
          }
          const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
          return (
            <g>
              <path d={d} fill="none" stroke={v("--color-bg")} strokeWidth={4} strokeLinejoin="round" />
              <path d={d} fill="none" stroke={v("--color-accent")} strokeWidth={2} strokeLinejoin="round" />
            </g>
          );
        })()}
        {/* Aktive Spalte: Führungslinie + Markierungspunkt am Wert. */}
        {hover && (
          <g pointerEvents="none">
            <line
              x1={hover.cx}
              x2={hover.cx}
              y1={margin.top}
              y2={margin.top + PLOT_H}
              stroke={v("--color-accent")}
              strokeWidth={1}
              opacity={0.45}
            />
            <circle cx={hover.cx} cy={y(hover.wert)} r={3.5} fill={v("--color-accent")} stroke={v("--color-bg")} strokeWidth={1.5} />
          </g>
        )}
        {/* Unsichtbare Hover-/Tipp-Flächen über die volle Spaltenhöhe —
            exakte Werte je Jahr bzw. Monat, für Balken UND Linie. */}
        {jahre.map((j) => {
          const isYearBar = j.bars.length === 1;
          const x0 = x(j.year - 0.5);
          const slotW = isYearBar ? yearW : yearW / 12;
          return (
            <g key={`hit-${j.year}`}>
              {j.bars.map((val, mi) => {
                if (val == null) return null;
                const label = isYearBar ? `${j.year} (Jahresbeginn)` : `${MONAT_KURZ[mi]} ${j.year}`;
                const bx = x0 + (isYearBar ? 0 : mi * slotW);
                const info: HoverInfo = { label, wert: val, cx: bx + slotW / 2 };
                return (
                  <rect
                    key={mi}
                    x={bx}
                    y={margin.top}
                    width={slotW}
                    height={PLOT_H}
                    fill="transparent"
                    onMouseEnter={() => setHover(info)}
                    onClick={() => setHover(info)}
                  />
                );
              })}
              {j.year % labelStep === 0 && (
                <text
                  x={x(j.year)}
                  y={margin.top + PLOT_H + 14}
                  textAnchor="middle"
                  fontSize={8}
                  fill={v("--color-text-secondary")}
                >
                  {j.year}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <EventTimeline
        events={ZUBAU_EVENTS}
        active={active}
        onChange={setActive}
        startYear={START_YEAR}
        endYear={END_YEAR}
      />
    </div>
  );
}
