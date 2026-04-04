"use client";

import { useMemo, useCallback, useRef, useState, useLayoutEffect } from "react";
import { AreaStack, AreaClosed } from "@visx/shape";
import { scaleTime, scaleLinear } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { LinearGradient } from "@visx/gradient";
import { stack as d3Stack, stackOrderNone, stackOffsetNone, curveMonotoneX } from "d3-shape";
import { bisector } from "d3-array";
import {
  ENERGY_COLORS_HEX,
  ENERGY_LABELS,
  GENERATION_STACK_KEYS,
  RENEWABLE_KEYS,
  FOSSIL_KEYS,
  NUCLEAR_KEYS,
  SONSTIGE_KEYS,
  CATEGORY_COLORS,
  formatMW,
  formatTime,
  CHART_MARGIN,
  CHART_HEIGHT,
} from "../../lib/chart-utils";
import { v } from "../../lib/theme";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DataPoint {
  ts: string;
  [key: string]: number | string | null;
}

export interface NuclearOverlayPoint {
  ts: string;
  nuclear_gw: number;
}

interface Props {
  data: DataPoint[];
  keys?: string[];
  height?: number;
  xFormat?: "time" | "date" | "datetime";
  nuclearOverlay?: NuclearOverlayPoint[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDate(d: DataPoint): Date {
  return new Date(d.ts);
}

const bisectDate = bisector<DataPoint, Date>((d) => getDate(d)).left;

// ─── Tooltip Component ───────────────────────────────────────────────────────

function TooltipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
      <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
      <span style={{ flex: 1, color: "var(--color-text-secondary)", fontSize: 11 }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function TooltipSummary({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, marginTop: 6 }}>
      <span style={{ flex: 1, fontWeight: 700, fontSize: 12, color }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

function ChartTooltip({ tooltip, activeKeys, width, margin, getEEShare, nuclearGw }: {
  tooltip: { data: DataPoint; left: number };
  activeKeys: string[];
  width: number;
  margin: typeof CHART_MARGIN;
  getEEShare: (d: DataPoint) => number;
  nuclearGw?: number | null;
}) {
  const d = tooltip.data;
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipWidth = 200;
  const goLeft = tooltip.left > width / 2;
  const left = goLeft ? tooltip.left - tooltipWidth - 12 : tooltip.left + 12;

  // Center tooltip vertically within chart area, clamp to viewport
  const chartHeight = CHART_HEIGHT - margin.top - margin.bottom;
  useLayoutEffect(() => {
    const el = tooltipRef.current;
    if (!el) return;
    const elHeight = el.getBoundingClientRect().height;
    // Center within the chart area
    let top = margin.top + (chartHeight - elHeight) / 2;
    // Clamp so it doesn't overflow viewport
    const containerRect = el.parentElement?.getBoundingClientRect();
    if (containerRect) {
      const absTop = containerRect.top + top;
      if (absTop + elHeight > window.innerHeight - 8) {
        top = window.innerHeight - 8 - containerRect.top - elHeight;
      }
      if (absTop < 8) {
        top = 8 - containerRect.top;
      }
    }
    el.style.top = `${top}px`;
  });

  // Calculate category totals
  let renewableTotal = 0;
  let fossilTotal = 0;
  let nuclearTotal = 0;
  let sonstigeTotal = 0;
  let totalGen = 0;
  for (const key of activeKeys) {
    const val = d[key];
    if (typeof val !== "number" || val <= 0) continue;
    totalGen += val;
    if (RENEWABLE_KEYS.includes(key)) renewableTotal += val;
    else if (FOSSIL_KEYS.includes(key)) fossilTotal += val;
    else if (NUCLEAR_KEYS.includes(key)) nuclearTotal += val;
    else sonstigeTotal += val;
  }
  const nuclearMw = nuclearGw != null && nuclearGw > 0 ? nuclearGw * 1000 : 0;

  const renewablePct = totalGen > 0 ? Math.round(renewableTotal / totalGen * 100) : 0;
  const fossilPct = totalGen > 0 ? Math.round(fossilTotal / totalGen * 100) : 0;
  const nuclearPct = totalGen > 0 ? Math.round(nuclearTotal / totalGen * 100) : 0;
  const sonstigePct = totalGen > 0 ? Math.round(sonstigeTotal / totalGen * 100) : 0;

  // Split keys by category (reversed for top→bottom display)
  const renewableKeys = [...activeKeys].reverse().filter(k => RENEWABLE_KEYS.includes(k));
  const fossilKeys = [...activeKeys].reverse().filter(k => FOSSIL_KEYS.includes(k));
  const nuclearKeys = [...activeKeys].reverse().filter(k => NUCLEAR_KEYS.includes(k));
  const sonstigeKeys = [...activeKeys].reverse().filter(k => SONSTIGE_KEYS.includes(k));

  return (
    <div
      ref={tooltipRef}
      style={{
        position: "absolute",
        top: margin.top,
        left: Math.max(0, Math.min(left, width - tooltipWidth)),
        width: tooltipWidth,
        background: "var(--color-bg)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-sm)",
        padding: "10px 14px",
        fontSize: 12,
        fontFamily: "var(--font-text)",
        color: "var(--color-text-primary)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        lineHeight: 1.6,
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8, fontFamily: "var(--font-mono)", fontSize: 11 }}>
        {formatTime(d.ts, "datetime")}
      </div>

      {/* Erneuerbare */}
      {renewableTotal > 0 && (
        <>
          <TooltipSummary color={CATEGORY_COLORS.renewable} label={`Erneuerbare ${renewablePct}%`} value={formatMW(renewableTotal)} />
          {renewableKeys.map(key => {
            const val = d[key];
            if (typeof val !== "number" || val <= 0) return null;
            return <TooltipRow key={key} color={ENERGY_COLORS_HEX[key]} label={ENERGY_LABELS[key] || key} value={formatMW(val)} />;
          })}
        </>
      )}

      {/* Fossil */}
      {fossilTotal > 0 && (
        <>
          <TooltipSummary color={CATEGORY_COLORS.fossil} label={`Fossil ${fossilPct}%`} value={formatMW(fossilTotal)} />
          {fossilKeys.map(key => {
            const val = d[key];
            if (typeof val !== "number" || val <= 0) return null;
            return <TooltipRow key={key} color={ENERGY_COLORS_HEX[key]} label={ENERGY_LABELS[key] || key} value={formatMW(val)} />;
          })}
        </>
      )}

      {/* Sonstige */}
      {sonstigeTotal > 0 && (
        <>
          <TooltipSummary color={CATEGORY_COLORS.other} label={`Sonstige ${sonstigePct}%`} value={formatMW(sonstigeTotal)} />
          {sonstigeKeys.map(key => {
            const val = d[key];
            if (typeof val !== "number" || val <= 0) return null;
            return <TooltipRow key={key} color={ENERGY_COLORS_HEX[key]} label={ENERGY_LABELS[key] || key} value={formatMW(val)} />;
          })}
        </>
      )}

      {/* Kernenergie (inländisch + importiert) */}
      {(nuclearTotal > 0 || nuclearMw > 0) && (() => {
        const nucCombined = nuclearTotal + nuclearMw;
        const allTotal = totalGen + nuclearMw;
        const nucPct = allTotal > 0 ? Math.round(nucCombined / allTotal * 100) : 0;
        return (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, marginBottom: 4 }}>
              <span style={{ flex: 1, fontWeight: 700, fontSize: 12, color: "var(--color-text-primary)" }}>Kernenergie {nucPct}%</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700 }}>{formatMW(nucCombined)}</span>
            </div>
            {nuclearTotal > 0 && (
              <TooltipRow color={CATEGORY_COLORS.nuclear} label="erzeugt in DE" value={formatMW(nuclearTotal)} />
            )}
            {nuclearMw > 0 && (
              <TooltipRow color={CATEGORY_COLORS.nuclearImport} label="importiert" value={formatMW(nuclearMw)} />
            )}
          </>
        );
      })()}
    </div>
  );
}

// ─── Chart ───────────────────────────────────────────────────────────────────

function StackedAreaInner({ data, keys, height = CHART_HEIGHT, width, xFormat, nuclearOverlay }: Props & { width: number }) {
  const margin = CHART_MARGIN;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Filter to keys that have data
  const activeKeys = useMemo(() => {
    const k = keys || GENERATION_STACK_KEYS;
    return k.filter((key) => data.some((d) => typeof d[key] === "number" && (d[key] as number) > 0));
  }, [data, keys]);

  // Normalize data: null → 0 for stacking
  const normalized = useMemo(
    () =>
      data.map((d) => {
        const row: Record<string, number | string> = { ts: d.ts };
        for (const key of activeKeys) {
          const val = d[key];
          row[key] = typeof val === "number" && val > 0 ? val : 0;
        }
        return row as Record<string, number> & { ts: string };
      }),
    [data, activeKeys]
  );

  // Scales
  const xScale = useMemo(
    () =>
      scaleTime({
        domain: [getDate(data[0]), getDate(data[data.length - 1])],
        range: [0, innerWidth],
      }),
    [data, innerWidth]
  );

  const yMax = useMemo(() => {
    let max = 0;
    for (const d of normalized) {
      let sum = 0;
      for (const key of activeKeys) sum += d[key] || 0;
      if (sum > max) max = sum;
    }
    return max * 1.05; // 5% headroom
  }, [normalized, activeKeys]);

  const yScale = useMemo(
    () =>
      scaleLinear({
        domain: [0, yMax],
        range: [innerHeight, 0],
        nice: true,
      }),
    [yMax, innerHeight]
  );

  // Stack data
  const stacked = useMemo(() => {
    const stackGen = d3Stack<Record<string, number> & { ts: string }>()
      .keys(activeKeys)
      .order(stackOrderNone)
      .offset(stackOffsetNone);
    return stackGen(normalized);
  }, [normalized, activeKeys]);

  // Tooltip state (simple useState instead of visx useTooltip for reliable positioning)
  const [tooltip, setTooltip] = useState<{ data: DataPoint; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTooltip = useCallback(
    (event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>) => {
      const svg = (event.target as SVGElement).ownerSVGElement;
      if (!svg) return;
      const point = svg.createSVGPoint();
      const clientEvent = "touches" in event ? event.touches[0] : event;
      point.x = clientEvent.clientX;
      point.y = clientEvent.clientY;
      const svgPoint = point.matrixTransform(svg.getScreenCTM()?.inverse());
      const x0 = xScale.invert(svgPoint.x - margin.left);
      const idx = bisectDate(data, x0, 1);
      const d0 = data[idx - 1];
      const d1 = data[idx];
      if (!d0) return;
      const d = d1 && x0.getTime() - getDate(d0).getTime() > getDate(d1).getTime() - x0.getTime() ? d1 : d0;
      setTooltip({
        data: d,
        left: xScale(getDate(d)) + margin.left,
      });
    },
    [xScale, data, margin.left]
  );

  // Nuclear overlay lookup for tooltip
  const nuclearByTs = useMemo(() => {
    if (!nuclearOverlay) return null;
    const map = new Map<string, number>();
    for (const d of nuclearOverlay) map.set(d.ts, d.nuclear_gw);
    return map;
  }, [nuclearOverlay]);

  const getNuclearGw = useCallback(
    (d: DataPoint): number | null => {
      if (!nuclearByTs) return null;
      // Exact match first
      const exact = nuclearByTs.get(d.ts);
      if (exact !== undefined) return exact;
      // Find closest timestamp
      const ts = new Date(d.ts).getTime();
      let closest: number | null = null;
      let minDiff = Infinity;
      nuclearByTs.forEach((val, key) => {
        const diff = Math.abs(new Date(key).getTime() - ts);
        if (diff < minDiff) { minDiff = diff; closest = val; }
      });
      return closest;
    },
    [nuclearByTs]
  );

  // Renewable share for tooltip
  const getEEShare = useCallback(
    (d: DataPoint) => {
      let renewable = 0;
      let total = 0;
      for (const key of activeKeys) {
        const val = typeof d[key] === "number" ? (d[key] as number) : 0;
        if (val > 0) {
          total += val;
          if (RENEWABLE_KEYS.includes(key)) renewable += val;
        }
      }
      return total > 0 ? (renewable / total) * 100 : 0;
    },
    [activeKeys]
  );

  if (innerWidth <= 0 || data.length < 2) return null;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <svg width={width} height={height}>
        {/* Gradients for each energy type */}
        {activeKeys.map((key) => (
          <LinearGradient
            key={key}
            id={`gradient-${key}`}
            from={ENERGY_COLORS_HEX[key] || "#B0BEC5"}
            to={ENERGY_COLORS_HEX[key] || "#B0BEC5"}
            fromOpacity={0.85}
            toOpacity={0.6}
          />
        ))}

        <Group left={margin.left} top={margin.top}>
          {/* Grid */}
          <GridRows
            scale={yScale}
            width={innerWidth}
            stroke="var(--color-chart-grid)"
            strokeOpacity={0.5}
            strokeDasharray="2,3"
          />

          {/* Stacked areas */}
          <AreaStack
            data={normalized}
            keys={activeKeys}
            x={(d) => xScale(new Date(d.data.ts)) ?? 0}
            y0={(d) => yScale(d[0]) ?? 0}
            y1={(d) => yScale(d[1]) ?? 0}
            curve={curveMonotoneX}
          >
            {({ stacks, path }) =>
              stacks.map((stack) => (
                <path
                  key={stack.key}
                  d={path(stack) || ""}
                  fill={`url(#gradient-${stack.key})`}
                  stroke={ENERGY_COLORS_HEX[stack.key] || "#B0BEC5"}
                  strokeWidth={0.5}
                  strokeOpacity={0.3}
                />
              ))
            }
          </AreaStack>

          {/* Nuclear import overlay */}
          {nuclearOverlay && nuclearOverlay.length > 1 && (
            <>
            <defs>
              <clipPath id="nucClipArea">
                <rect x={0} y={0} width={innerWidth} height={innerHeight}>
                  <animate attributeName="width" from="0" to={innerWidth} dur="0.8s" fill="freeze" calcMode="spline" keySplines="0.25 0.1 0.25 1" />
                </rect>
              </clipPath>
            </defs>
            <g clipPath="url(#nucClipArea)">
              <AreaClosed
                data={nuclearOverlay}
                x={(d) => xScale(new Date(d.ts)) ?? 0}
                y={(d) => yScale(d.nuclear_gw * 1000) ?? 0}
                yScale={yScale}
                curve={curveMonotoneX}
                fill={CATEGORY_COLORS.nuclearImport}
                fillOpacity={0.15}
                stroke="none"
              />
              {/* Visible top edge line */}
              <AreaClosed
                data={nuclearOverlay}
                x={(d) => xScale(new Date(d.ts)) ?? 0}
                y={(d) => yScale(d.nuclear_gw * 1000) ?? 0}
                yScale={yScale}
                curve={curveMonotoneX}
                fill="none"
                stroke={CATEGORY_COLORS.nuclearImport}
                strokeWidth={2}
                strokeOpacity={0.9}
              />
            </g>
            </>
          )}

          {/* Tooltip hover line */}
          {tooltip && (
            <line
              x1={xScale(getDate(tooltip.data))}
              x2={xScale(getDate(tooltip.data))}
              y1={0}
              y2={innerHeight}
              stroke="var(--color-text-muted)"
              strokeWidth={1}
              strokeDasharray="3,3"
              pointerEvents="none"
            />
          )}

          {/* Axes */}
          <AxisBottom
            top={innerHeight}
            scale={xScale}
            numTicks={Math.min(6, Math.floor(innerWidth / 80))}
            tickFormat={(d) => formatTime((d as Date).toISOString(), xFormat || "time")}
            stroke="var(--color-chart-grid)"
            tickStroke="var(--color-chart-grid)"
            tickLabelProps={() => ({
              fill: "var(--color-text-muted)",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              textAnchor: "middle" as const,
              dy: "0.3em",
            })}
          />
          <AxisLeft
            scale={yScale}
            numTicks={5}
            tickFormat={(d) => formatMW(d as number)}
            stroke="transparent"
            tickStroke="transparent"
            tickLabelProps={() => ({
              fill: "var(--color-text-muted)",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              textAnchor: "end" as const,
              dx: "-0.4em",
              dy: "0.3em",
            })}
          />

          {/* Invisible overlay for tooltip */}
          <rect
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            onTouchStart={handleTooltip}
            onTouchMove={handleTooltip}
            onTouchEnd={() => setTooltip(null)}
            onMouseMove={handleTooltip}
            onMouseLeave={() => setTooltip(null)}
          />
        </Group>
      </svg>

      {/* Tooltip */}
      {tooltip && <ChartTooltip tooltip={tooltip} activeKeys={activeKeys} width={width} margin={margin} getEEShare={getEEShare} nuclearGw={getNuclearGw(tooltip.data)} />}
    </div>
  );
}

// ─── Responsive Wrapper ──────────────────────────────────────────────────────

export default function StackedAreaChart({ data, keys, height, xFormat, nuclearOverlay }: Props) {
  if (!data || data.length < 2) {
    return (
      <div style={{
        height: height || CHART_HEIGHT, display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--color-text-muted)", fontSize: 13, fontFamily: "var(--font-text)",
      }}>
        Lade Daten...
      </div>
    );
  }

  const h = height || CHART_HEIGHT;
  return (
    <div style={{ width: "100%", height: h }}>
      <ParentSize>
        {({ width }) =>
          width > 0 ? (
            <StackedAreaInner data={data} keys={keys} height={h} width={width} xFormat={xFormat} nuclearOverlay={nuclearOverlay} />
          ) : null
        }
      </ParentSize>
    </div>
  );
}
