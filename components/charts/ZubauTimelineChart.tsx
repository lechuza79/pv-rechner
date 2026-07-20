"use client";

/**
 * Zubau-Zeitleiste: der jährliche PV-Zubau (Balken, GW/Jahr) mit zwei
 * überlagerten Markt-/Politik-Linien (Einspeisevergütung + Haushaltsstrompreis,
 * beide in ct/kWh auf einer geteilten rechten Achse). Die Ereignis-Marken leben
 * in der interaktiven EventTimeline direkt darunter (gleiche Plot-Ränder + Jahres-
 * Domäne) — der Chart selbst bleibt bewusst frei von Markern.
 */

import { useMemo, useState, useCallback } from "react";
import { LinePath } from "@visx/shape";
import { scaleLinear } from "@visx/scale";
import { Group } from "@visx/group";
import { GridRows } from "@visx/grid";
import { AxisBottom } from "@visx/axis";
import { ParentSize } from "@visx/responsive";
import { curveMonotoneX } from "d3-shape";

export interface ZubauTimelineProps {
  /** Jahre, lückenlos aufsteigend (Balken-Stützstellen). */
  years: number[];
  /** Zubau je Jahr in GW, index-gleich zu years. */
  additionsGw: number[];
  /** true = laufendes/unvollständiges Jahr (wird ausgegraut dargestellt). */
  partial: boolean[];
  /** true = künftiges Jahr ohne Daten (leerer, gestrichelter Platzhalter-Balken). */
  future?: boolean[];
  /** Einspeisevergütung ct/kWh, index-gleich zu years (null = keine Zahl). */
  feedIn: (number | null)[];
  /** Haushaltsstrompreis ct/kWh, index-gleich zu years (null = keine Zahl). */
  price: (number | null)[];
  height?: number;
}

/** Plot-Ränder — exportiert, damit die Event-Timeline darunter exakt fluchtet. */
export const PLOT_MARGIN = { top: 18, right: 52, bottom: 30, left: 44 };

const cssVar = (t: string) => `var(${t})`;

const COLOR_BARS = "--color-accent"; // Blau
const COLOR_FEEDIN = "--color-positive"; // Signalgrün
const COLOR_PRICE = "--color-text-secondary"; // Grau

/** Rechteck mit nur oben abgerundeten Ecken. */
function topRoundedRect(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

export default function ZubauTimelineChart(props: ZubauTimelineProps) {
  const height = props.height ?? 420;
  return (
    <div style={{ width: "100%", height }}>
      <ParentSize>
        {({ width }) => (width > 0 ? <Inner {...props} width={width} height={height} /> : null)}
      </ParentSize>
    </div>
  );
}

interface HoverState {
  idx: number;
  x: number;
}

function Inner({
  years,
  additionsGw,
  partial,
  future,
  feedIn,
  price,
  width,
  height,
}: ZubauTimelineProps & { width: number; height: number }) {
  const margin = PLOT_MARGIN;
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

  const domain: [number, number] = [years[0] - 0.5, years[years.length - 1] + 0.5];

  const xScale = useMemo(
    () => scaleLinear<number>({ domain, range: [0, innerWidth] }),
    [domain[0], domain[1], innerWidth],
  );

  const maxGw = useMemo(() => Math.max(...additionsGw, 1), [additionsGw]);
  const yLeft = useMemo(
    () => scaleLinear<number>({ domain: [0, maxGw * 1.08], range: [innerHeight, 0], nice: true }),
    [maxGw, innerHeight],
  );

  const maxCt = useMemo(() => {
    let m = 0;
    for (const v of feedIn) if (v != null && v > m) m = v;
    for (const v of price) if (v != null && v > m) m = v;
    return Math.max(m, 1);
  }, [feedIn, price]);
  const yRight = useMemo(
    () => scaleLinear<number>({ domain: [0, maxCt * 1.08], range: [innerHeight, 0], nice: true }),
    [maxCt, innerHeight],
  );

  const barW = Math.max(2, (innerWidth / years.length) * 0.62);

  const feedInPts = useMemo(
    () =>
      years
        .map((year, i) => ({ year, value: feedIn[i] }))
        .filter((p): p is { year: number; value: number } => p.value != null),
    [years, feedIn],
  );
  const pricePts = useMemo(
    () =>
      years
        .map((year, i) => ({ year, value: price[i] }))
        .filter((p): p is { year: number; value: number } => p.value != null),
    [years, price],
  );

  const [hover, setHover] = useState<HoverState | null>(null);

  const handleMove = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
      const px = e.clientX - rect.left;
      const yearFloat = xScale.invert(px);
      let nearest = 0;
      let best = Infinity;
      for (let i = 0; i < years.length; i++) {
        const d = Math.abs(years[i] - yearFloat);
        if (d < best) {
          best = d;
          nearest = i;
        }
      }
      setHover({ idx: nearest, x: xScale(years[nearest]) });
    },
    [xScale, years],
  );

  if (innerWidth <= 0 || innerHeight <= 0) return null;

  const leftTicks = yLeft.ticks(5);
  const rightTicks = yRight.ticks(5);
  const xTicks: number[] = [];
  for (let y = Math.ceil(years[0] / 5) * 5; y <= years[years.length - 1]; y += 5) xTicks.push(y);

  return (
    <div style={{ position: "relative", width, height }}>
      <svg width={width} height={height} role="img">
        <Group left={margin.left} top={margin.top}>
          <GridRows
            scale={yLeft}
            width={innerWidth}
            stroke="var(--color-chart-grid, #E9E9E9)"
            strokeDasharray="2,4"
            tickValues={leftTicks}
          />

          {/* Zubau-Balken (blau, oben leicht abgerundet). Künftiges Jahr ohne
             Daten = leerer Slot (kein Balken) — es gibt schlicht noch keine
             Anlagen; die Achse reicht trotzdem bis dorthin. */}
          {years.map((year, i) => {
            if (future?.[i]) return null;
            const gw = additionsGw[i];
            const yTop = yLeft(gw);
            const h = innerHeight - yTop;
            const isPartial = partial[i];
            const active = hover?.idx === i;
            return (
              <path
                key={year}
                d={topRoundedRect(xScale(year) - barW / 2, yTop, barW, Math.max(0, h), 2.5)}
                fill={cssVar(COLOR_BARS)}
                opacity={isPartial ? 0.28 : active ? 1 : 0.85}
              />
            );
          })}

          {/* Beide Linien mit weißer Unterlinie (Halo), damit sie sich von den
             Balken und voneinander abheben. Reihenfolge: Preis-Halo → Preis →
             Vergütungs-Halo → Vergütung — so trennt am Kreuzungspunkt eine weiße
             Kante die grüne Vergütungslinie sichtbar von der grauen Preislinie. */}
          <LinePath<{ year: number; value: number }>
            data={pricePts}
            x={(d) => xScale(d.year)}
            y={(d) => yRight(d.value)}
            stroke="var(--color-bg, #fff)"
            strokeWidth={5.5}
            strokeLinecap="round"
            curve={curveMonotoneX}
          />
          {/* Strompreis-Linie (Grau, ct/kWh, rechte Achse) */}
          <LinePath<{ year: number; value: number }>
            data={pricePts}
            x={(d) => xScale(d.year)}
            y={(d) => yRight(d.value)}
            stroke={cssVar(COLOR_PRICE)}
            strokeWidth={2.5}
            strokeLinecap="round"
            curve={curveMonotoneX}
          />
          <LinePath<{ year: number; value: number }>
            data={feedInPts}
            x={(d) => xScale(d.year)}
            y={(d) => yRight(d.value)}
            stroke="var(--color-bg, #fff)"
            strokeWidth={5.5}
            strokeLinecap="round"
            curve={curveMonotoneX}
          />
          {/* Vergütungs-Linie (Signalgrün, ct/kWh, rechte Achse) */}
          <LinePath<{ year: number; value: number }>
            data={feedInPts}
            x={(d) => xScale(d.year)}
            y={(d) => yRight(d.value)}
            stroke={cssVar(COLOR_FEEDIN)}
            strokeWidth={2.5}
            strokeLinecap="round"
            curve={curveMonotoneX}
          />

          {/* Hover-Führung + Punkte */}
          {hover && (
            <>
              <line
                x1={hover.x}
                x2={hover.x}
                y1={0}
                y2={innerHeight}
                stroke="var(--color-text-muted, #949494)"
                strokeOpacity={0.4}
                strokeWidth={1}
              />
              {feedIn[hover.idx] != null && (
                <circle
                  cx={hover.x}
                  cy={yRight(feedIn[hover.idx] as number)}
                  r={3.5}
                  fill={cssVar(COLOR_FEEDIN)}
                  stroke="var(--color-bg, #fff)"
                  strokeWidth={1.5}
                />
              )}
              {price[hover.idx] != null && (
                <circle
                  cx={hover.x}
                  cy={yRight(price[hover.idx] as number)}
                  r={3.5}
                  fill={cssVar(COLOR_PRICE)}
                  stroke="var(--color-bg, #fff)"
                  strokeWidth={1.5}
                />
              )}
            </>
          )}

          {/* Linke Y-Achse (GW) */}
          {leftTicks.map((t) => (
            <text
              key={`l-${t}`}
              x={-8}
              y={yLeft(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              fontFamily="var(--font-mono, monospace)"
              fill="var(--color-text-muted, #949494)"
            >
              {t}
            </text>
          ))}
          {/* Rechte Y-Achse (ct/kWh) */}
          {rightTicks.map((t) => (
            <text
              key={`r-${t}`}
              x={innerWidth + 8}
              y={yRight(t)}
              textAnchor="start"
              dominantBaseline="middle"
              fontSize={10}
              fontFamily="var(--font-mono, monospace)"
              fill="var(--color-text-muted, #949494)"
            >
              {t}
            </text>
          ))}

          <AxisBottom
            top={innerHeight}
            scale={xScale}
            tickValues={xTicks}
            tickFormat={(v) => String(Math.round(v as number))}
            stroke="var(--color-border, #E9E9E9)"
            tickStroke="var(--color-border, #E9E9E9)"
            tickLabelProps={() => ({
              fill: "var(--color-text-muted, #949494)",
              fontSize: 10,
              fontFamily: "var(--font-mono, monospace)",
              textAnchor: "middle",
              dy: "0.25em",
            })}
          />

          <rect
            x={0}
            y={0}
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            onPointerMove={handleMove}
            onPointerLeave={() => setHover(null)}
            style={{ cursor: "crosshair" }}
          />
        </Group>
      </svg>

      {hover && (
        <Tooltip
          left={Math.min(Math.max(margin.left + hover.x + 12, margin.left), width - 172)}
          top={margin.top + 4}
          year={years[hover.idx]}
          partial={partial[hover.idx]}
          future={!!future?.[hover.idx]}
          gw={additionsGw[hover.idx]}
          feedIn={feedIn[hover.idx]}
          price={price[hover.idx]}
        />
      )}
    </div>
  );
}

function Tooltip({
  left,
  top,
  year,
  partial,
  future,
  gw,
  feedIn,
  price,
}: {
  left: number;
  top: number;
  year: number;
  partial: boolean;
  future: boolean;
  gw: number;
  feedIn: number | null;
  price: number | null;
}) {
  const row = (label: string, colorToken: string, text: string) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, lineHeight: 1.55 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: cssVar(colorToken), flexShrink: 0 }} />
        {label}
      </span>
      <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 600 }}>{text}</span>
    </div>
  );
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        pointerEvents: "none",
        background: "var(--color-bg, #fff)",
        border: "1px solid var(--color-border, #E9E9E9)",
        borderRadius: 8,
        padding: "7px 9px",
        fontSize: 11.5,
        fontFamily: "var(--font-text, sans-serif)",
        color: "var(--color-text-primary, #3F3F3F)",
        boxShadow: "var(--shadow-md, 0 4px 14px rgba(0,0,0,0.08))",
        minWidth: 156,
        zIndex: 2,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4, fontFamily: "var(--font-mono, monospace)" }}>
        {year}
        {future ? " (geplant)" : partial ? " (läuft noch)" : ""}
      </div>
      {row("Zubau", COLOR_BARS, future ? "noch kein Zubau" : `${gw.toLocaleString("de-DE", { maximumFractionDigits: 1 })} GW`)}
      {feedIn != null &&
        row("Vergütung", COLOR_FEEDIN, `${feedIn.toLocaleString("de-DE", { maximumFractionDigits: 1 })} ct`)}
      {price != null &&
        row("Strompreis", COLOR_PRICE, `${price.toLocaleString("de-DE", { maximumFractionDigits: 1 })} ct`)}
    </div>
  );
}
