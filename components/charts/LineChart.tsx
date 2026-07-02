"use client";

/**
 * Generischer Mehrserien-Linienchart für Jahres-Zeitreihen (z.B. Langzeit-Strommix).
 *
 * Stil angelehnt an redaktionelle Zeitreihen-Charts: eine Linie je Serie, die
 * Serien-Labels stehen direkt am rechten Linienende (statt Legendenbox). Lücken
 * in der Reihe (fehlende Jahre) werden als gerade Segmente überbrückt, NICHT
 * interpoliert-getrickst — die Stützpunkte bleiben ehrlich.
 */

import { useMemo, useState, useCallback } from "react";
import { LinePath } from "@visx/shape";
import { scaleLinear } from "@visx/scale";
import { Group } from "@visx/group";
import { GridRows } from "@visx/grid";
import { AxisBottom } from "@visx/axis";
import { ParentSize } from "@visx/responsive";
import { curveMonotoneX } from "d3-shape";

export interface LineSeries {
  key: string;
  label: string;
  /** CSS-Variablen-Name, z.B. "--color-energy-lignite". */
  colorToken: string;
  values: number[];
  /** Optionales Flaggen-Emoji für Label/Legende. */
  flag?: string;
}

interface LineChartProps {
  years: number[];
  series: LineSeries[];
  /** Einheit für Achse/Tooltip, z.B. "TWh". */
  unit?: string;
  height?: number;
  /** Kompaktmodus fürs Embed (kleinere Schrift, weniger Ticks). */
  compact?: boolean;
  /**
   * Feste X-Achsen-Domäne [startJahr, endJahr]. Erzwingt die Achse unabhängig
   * von den eigenen Datenjahren — damit mehrere gestapelte Charts (Mix, CO₂,
   * Preis) exakt untereinander fluchten, auch wenn eine Reihe später startet.
   */
  xDomain?: [number, number];
  /**
   * Hervorgehobene Serie (key). Wenn gesetzt, wird diese Linie betont und alle
   * anderen ausgefadet in den Hintergrund gelegt. null/undefined = alle normal.
   */
  highlightKey?: string | null;
}

const cssVar = (token: string) => `var(${token})`;

export default function LineChart(props: LineChartProps) {
  const height = props.height ?? 380;
  return (
    <div style={{ width: "100%", height }}>
      <ParentSize>
        {({ width }) =>
          width > 0 ? <LineChartInner {...props} width={width} height={height} /> : null
        }
      </ParentSize>
    </div>
  );
}

const DIM_OPACITY = 0.16;

interface HoverState {
  year: number;
  x: number;
  points: { label: string; colorToken: string; value: number; y: number }[];
}

function LineChartInner({
  years,
  series,
  unit = "TWh",
  height,
  width,
  compact,
  xDomain,
  highlightKey,
}: LineChartProps & { width: number; height: number }) {
  const dimmed = (key: string) => highlightKey != null && highlightKey !== key;
  const margin = compact
    ? { top: 12, right: 78, bottom: 26, left: 40 }
    : { top: 16, right: 104, bottom: 30, left: 48 };
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

  const domain: [number, number] = xDomain ?? [years[0], years[years.length - 1]];

  const xScale = useMemo(
    () =>
      scaleLinear<number>({
        domain,
        range: [0, innerWidth],
      }),
    [domain[0], domain[1], innerWidth],
  );

  const [yMin, yMax] = useMemo(() => {
    let mn = 0;
    let mx = 0;
    for (const s of series)
      for (const v of s.values) {
        if (v == null || Number.isNaN(v)) continue;
        if (v > mx) mx = v;
        if (v < mn) mn = v;
      }
    return [mn, mx];
  }, [series]);

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        domain: [yMin < 0 ? yMin * 1.12 : 0, yMax * 1.05],
        range: [innerHeight, 0],
        nice: true,
      }),
    [yMin, yMax, innerHeight],
  );

  // End-Labels: y-Position je Serie, danach Kollisionen vertikal auseinanderziehen.
  const endLabels = useMemo(() => {
    const lastIdx = years.length - 1;
    const raw = series.map((s) => ({
      key: s.key,
      label: s.label,
      flag: s.flag,
      colorToken: s.colorToken,
      value: s.values[lastIdx],
      y: yScale(s.values[lastIdx]),
    }));
    raw.sort((a, b) => a.y - b.y);
    const minGap = compact ? 12 : 14;
    for (let i = 1; i < raw.length; i++) {
      if (raw[i].y - raw[i - 1].y < minGap) raw[i].y = raw[i - 1].y + minGap;
    }
    // Falls unten rausgelaufen: nach oben zurückschieben.
    for (let i = raw.length - 2; i >= 0; i--) {
      if (raw[i + 1].y - raw[i].y < minGap) raw[i].y = raw[i + 1].y - minGap;
    }
    return raw;
  }, [series, years, yScale, compact]);

  const [hover, setHover] = useState<HoverState | null>(null);

  const handleMove = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      const rect = (e.target as SVGRectElement).getBoundingClientRect();
      const px = e.clientX - rect.left;
      const yearFloat = xScale.invert(px);
      // nächstliegendes Stützjahr
      let nearest = years[0];
      let best = Infinity;
      for (const y of years) {
        const d = Math.abs(y - yearFloat);
        if (d < best) {
          best = d;
          nearest = y;
        }
      }
      const idx = years.indexOf(nearest);
      setHover({
        year: nearest,
        x: xScale(nearest),
        points: series
          .map((s) => ({
            label: s.label,
            colorToken: s.colorToken,
            value: s.values[idx],
            y: yScale(s.values[idx]),
          }))
          .sort((a, b) => b.value - a.value),
      });
    },
    [xScale, yScale, years, series],
  );

  if (innerWidth <= 0 || innerHeight <= 0) return null;

  const yTicks = yScale.ticks(compact ? 4 : 5);
  // Dekaden-Ticks aus der (ggf. erzwungenen) Domäne — so zeigen alle gestapelten
  // Charts dieselben Jahres-Marken (1990/2000/2010/2020), unabhängig vom Datenstart.
  const xTicks: number[] = [];
  for (let y = Math.ceil(domain[0] / 10) * 10; y <= domain[1]; y += 10) xTicks.push(y);
  if (xTicks[0] !== domain[0]) xTicks.unshift(domain[0]);
  const labelFont = compact ? 10 : 11.5;

  return (
    <div style={{ position: "relative", width, height }}>
      <svg width={width} height={height} role="img">
        <Group left={margin.left} top={margin.top}>
          <GridRows
            scale={yScale}
            width={innerWidth}
            stroke="var(--color-chart-grid, #E9E9E9)"
            strokeDasharray="2,4"
            tickValues={yTicks}
          />

          {/* Nulllinie hervorheben, wenn negative Werte vorkommen (z.B. Atom-Rückbau) */}
          {yMin < 0 && (
            <line
              x1={0}
              x2={innerWidth}
              y1={yScale(0)}
              y2={yScale(0)}
              stroke="var(--color-text-muted, #949494)"
              strokeWidth={1}
              strokeOpacity={0.5}
            />
          )}

          {/* Y-Achsen-Werte (an der Nulllinie/Gridlines, linksbündig) */}
          {yTicks.map((t) => (
            <text
              key={t}
              x={-8}
              y={yScale(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={labelFont - 1}
              fontFamily="var(--font-mono, monospace)"
              fill="var(--color-text-muted, #949494)"
            >
              {t}
            </text>
          ))}

          {/* Hover-Führungslinie */}
          {hover && (
            <line
              x1={hover.x}
              x2={hover.x}
              y1={0}
              y2={innerHeight}
              stroke="var(--color-text-muted, #949494)"
              strokeOpacity={0.4}
              strokeWidth={1}
            />
          )}

          {/* Linien — hervorgehobene zuletzt rendern (liegt oben) */}
          {[...series]
            .sort((a, b) =>
              a.key === highlightKey ? 1 : b.key === highlightKey ? -1 : 0,
            )
            .map((s) => {
              const dim = dimmed(s.key);
              return (
                <LinePath<{ year: number; value: number }>
                  key={s.key}
                  data={years.map((year, i) => ({ year, value: s.values[i] }))}
                  x={(d) => xScale(d.year)}
                  y={(d) => yScale(d.value)}
                  stroke={cssVar(s.colorToken)}
                  strokeWidth={
                    s.key === highlightKey ? (compact ? 2.5 : 3) : compact ? 1.75 : 2.25
                  }
                  strokeOpacity={dim ? DIM_OPACITY : 1}
                  strokeLinecap="round"
                  curve={curveMonotoneX}
                />
              );
            })}

          {/* Hover-Punkte */}
          {hover &&
            hover.points.map((p) => (
              <circle
                key={p.label}
                cx={hover.x}
                cy={p.y}
                r={compact ? 2.5 : 3}
                fill={cssVar(p.colorToken)}
                stroke="var(--color-bg, #fff)"
                strokeWidth={1.5}
              />
            ))}

          {/* End-Labels rechts (mit Flagge, ausgefadet wenn nicht hervorgehoben) */}
          {endLabels.map((l) => (
            <text
              key={l.key}
              x={innerWidth + 8}
              y={l.y}
              dominantBaseline="middle"
              fontSize={labelFont}
              fontWeight={l.key === highlightKey ? 800 : 600}
              fontFamily="var(--font-text, sans-serif)"
              fill={cssVar(l.colorToken)}
              opacity={dimmed(l.key) ? DIM_OPACITY + 0.14 : 1}
            >
              {l.flag ? `${l.flag} ${l.label}` : l.label}
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
              fontSize: labelFont - 1,
              fontFamily: "var(--font-mono, monospace)",
              textAnchor: "middle",
              dy: "0.25em",
            })}
          />

          {/* Interaktionsfläche */}
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

      {/* Tooltip */}
      {hover && (
        <div
          style={{
            position: "absolute",
            left: Math.min(
              Math.max(margin.left + hover.x + 12, margin.left),
              width - 168,
            ),
            top: margin.top + 4,
            pointerEvents: "none",
            background: "var(--color-bg, #fff)",
            border: "1px solid var(--color-border, #E9E9E9)",
            borderRadius: 8,
            padding: "7px 9px",
            fontSize: 11.5,
            fontFamily: "var(--font-text, sans-serif)",
            color: "var(--color-text-primary, #3F3F3F)",
            boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
            minWidth: 150,
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: 4,
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            {hover.year}
          </div>
          {hover.points.map((p) => (
            <div
              key={p.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                lineHeight: 1.55,
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: cssVar(p.colorToken),
                    flexShrink: 0,
                  }}
                />
                {p.label}
              </span>
              <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 600 }}>
                {p.value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} {unit}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
