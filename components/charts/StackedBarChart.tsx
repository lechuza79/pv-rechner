"use client";

import { useMemo, useCallback, useState } from "react";
import { BarStack } from "@visx/shape";
import { scaleBand, scaleLinear } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import {
  ENERGY_COLORS_HEX,
  ENERGY_LABELS,
  GENERATION_STACK_KEYS,
  RENEWABLE_KEYS,
  formatGWh,
  CHART_MARGIN,
  CHART_HEIGHT,
} from "../../lib/chart-utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DataPoint {
  ts: string;
  [key: string]: number | string | null;
}

interface WeekBucket {
  weekKey: string; // "2026-W14"
  label: string;   // display label e.g. "KW14"
  [key: string]: number | string;
}

export interface NuclearOverlayPoint {
  ts: string;
  nuclear_gw: number;
}

interface Props {
  data: DataPoint[];
  keys?: string[];
  height?: number;
  mode?: "ytd" | "12m" | "30d";
  nuclearOverlay?: NuclearOverlayPoint[];
}

// ─── ISO week number ─────────────────────────────────────────────────────────

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getISOWeekYear(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  return date.getUTCFullYear();
}

// ─── Aggregate to weekly buckets ─────────────────────────────────────────────

function aggregateToWeeks(data: DataPoint[]): WeekBucket[] {
  if (data.length < 2) return [];

  const t0 = new Date(data[0].ts).getTime();
  const t1 = new Date(data[1].ts).getTime();
  const intervalHours = (t1 - t0) / (1000 * 60 * 60);

  const buckets = new Map<string, WeekBucket>();
  const genKeys = GENERATION_STACK_KEYS;

  for (const d of data) {
    const date = new Date(d.ts);
    const week = getISOWeek(date);
    const year = getISOWeekYear(date);
    const weekKey = `${year}-W${String(week).padStart(2, "0")}`;

    if (!buckets.has(weekKey)) {
      const bucket: WeekBucket = { weekKey, label: `KW${week}` };
      for (const key of genKeys) bucket[key] = 0;
      buckets.set(weekKey, bucket);
    }

    const bucket = buckets.get(weekKey)!;
    for (const key of genKeys) {
      const val = d[key];
      if (typeof val === "number" && val > 0) {
        bucket[key] = (bucket[key] as number) + val * intervalHours / 1000; // GWh
      }
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}

// ─── Build 52-week grid for YTD (empty weeks at end) ─────────────────────────

function build52WeekGrid(filledWeeks: WeekBucket[]): WeekBucket[] {
  const now = new Date();
  const year = now.getFullYear();
  const genKeys = GENERATION_STACK_KEYS;
  const grid: WeekBucket[] = [];

  for (let w = 1; w <= 52; w++) {
    const weekKey = `${year}-W${String(w).padStart(2, "0")}`;
    const existing = filledWeeks.find((b) => b.weekKey === weekKey);
    if (existing) {
      grid.push(existing);
    } else {
      const bucket: WeekBucket = { weekKey, label: `KW${w}` };
      for (const key of genKeys) bucket[key] = 0;
      grid.push(bucket);
    }
  }

  return grid;
}

// ─── Aggregate to daily buckets (for 30d view) ──────────────────────────────

function aggregateToDays(data: DataPoint[]): WeekBucket[] {
  if (data.length < 2) return [];

  const t0 = new Date(data[0].ts).getTime();
  const t1 = new Date(data[1].ts).getTime();
  const intervalHours = (t1 - t0) / (1000 * 60 * 60);

  const buckets = new Map<string, WeekBucket>();
  const genKeys = GENERATION_STACK_KEYS;

  for (const d of data) {
    const date = new Date(d.ts);
    const dayKey = date.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

    if (!buckets.has(dayKey)) {
      const label = date.toLocaleDateString("de-DE", {
        day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin",
      });
      const bucket: WeekBucket = { weekKey: dayKey, label };
      for (const key of genKeys) bucket[key] = 0;
      buckets.set(dayKey, bucket);
    }

    const bucket = buckets.get(dayKey)!;
    for (const key of genKeys) {
      const val = d[key];
      if (typeof val === "number" && val > 0) {
        bucket[key] = (bucket[key] as number) + val * intervalHours / 1000;
      }
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}

// ─── Aggregate nuclear overlay to matching buckets ──────────────────────────

function aggregateNuclearToWeeks(data: NuclearOverlayPoint[]): Map<string, number> {
  if (data.length < 2) return new Map();
  const t0 = new Date(data[0].ts).getTime();
  const t1 = new Date(data[1].ts).getTime();
  const intervalHours = (t1 - t0) / (1000 * 60 * 60);
  const buckets = new Map<string, number>();
  for (const d of data) {
    const date = new Date(d.ts);
    const week = getISOWeek(date);
    const year = getISOWeekYear(date);
    const weekKey = `${year}-W${String(week).padStart(2, "0")}`;
    buckets.set(weekKey, (buckets.get(weekKey) || 0) + d.nuclear_gw * intervalHours);
    // GW × hours = GWh
  }
  return buckets;
}

function aggregateNuclearToDays(data: NuclearOverlayPoint[]): Map<string, number> {
  if (data.length < 2) return new Map();
  const t0 = new Date(data[0].ts).getTime();
  const t1 = new Date(data[1].ts).getTime();
  const intervalHours = (t1 - t0) / (1000 * 60 * 60);
  const buckets = new Map<string, number>();
  for (const d of data) {
    const date = new Date(d.ts);
    const dayKey = date.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
    buckets.set(dayKey, (buckets.get(dayKey) || 0) + d.nuclear_gw * intervalHours);
  }
  return buckets;
}

// ─── Tooltip Component ───────────────────────────────────────────────────────

function BarTooltipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
      <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
      <span style={{ flex: 1, color: "var(--color-text-secondary)", fontSize: 11 }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function BarTooltipSummary({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, marginTop: 2 }}>
      <div style={{ width: 8, height: 8, borderRadius: 3, background: color, flexShrink: 0 }} />
      <span style={{ flex: 1, fontWeight: 700, fontSize: 11 }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function BarTooltip({ data, activeKeys, left, width, margin, nuclearGWh }: {
  data: WeekBucket;
  activeKeys: string[];
  left: number;
  width: number;
  margin: typeof CHART_MARGIN;
  nuclearGWh?: number;
}) {
  const tooltipWidth = 200;
  const goLeft = left > width / 2;
  const x = goLeft ? left - tooltipWidth - 12 : left + 12;

  let totalGWh = 0;
  let renewableGWh = 0;
  let sonstigeGWh = 0;
  for (const key of activeKeys) {
    const val = data[key];
    if (typeof val === "number" && val > 0) {
      totalGWh += val;
      if (RENEWABLE_KEYS.includes(key)) renewableGWh += val;
      else sonstigeGWh += val;
    }
  }
  if (totalGWh < 0.01) return null;

  const renewablePct = totalGWh > 0 ? Math.round(renewableGWh / totalGWh * 100) : 0;
  const sonstigePct = totalGWh > 0 ? Math.round(sonstigeGWh / totalGWh * 100) : 0;

  const renewableKeys = [...activeKeys].reverse().filter(k => RENEWABLE_KEYS.includes(k));
  const sonstigeKeys = [...activeKeys].reverse().filter(k => !RENEWABLE_KEYS.includes(k));

  return (
    <div
      style={{
        position: "absolute",
        top: margin.top,
        left: Math.max(0, Math.min(x, width - tooltipWidth)),
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
        {data.label}
      </div>

      {/* Erneuerbare */}
      {renewableGWh > 0 && (
        <>
          <BarTooltipSummary color="#4CAF50" label={`Erneuerbare ${renewablePct}%`} value={formatGWh(renewableGWh)} />
          {renewableKeys.map(key => {
            const val = data[key];
            if (typeof val !== "number" || val <= 0.01) return null;
            return <BarTooltipRow key={key} color={ENERGY_COLORS_HEX[key]} label={ENERGY_LABELS[key] || key} value={formatGWh(val)} />;
          })}
        </>
      )}

      {/* Sonstige */}
      {sonstigeGWh > 0 && (
        <>
          <BarTooltipSummary color="#8D6E63" label={`Sonstige ${sonstigePct}%`} value={formatGWh(sonstigeGWh)} />
          {sonstigeKeys.map(key => {
            const val = data[key];
            if (typeof val !== "number" || val <= 0.01) return null;
            return <BarTooltipRow key={key} color={ENERGY_COLORS_HEX[key]} label={ENERGY_LABELS[key] || key} value={formatGWh(val)} />;
          })}
        </>
      )}

      {/* Kernenergie */}
      {nuclearGWh != null && nuclearGWh > 0.01 && (
        <BarTooltipSummary color="#F9A825" label="Kernenergie" value={formatGWh(nuclearGWh)} />
      )}
    </div>
  );
}

// ─── Inner Chart ─────────────────────────────────────────────────────────────

function StackedBarInner({ data, keys, height = CHART_HEIGHT, width, mode, nuclearOverlay }: Props & { width: number }) {
  const margin = CHART_MARGIN;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const buckets = useMemo(() => {
    if (mode === "30d") return aggregateToDays(data);
    const weeks = aggregateToWeeks(data);
    if (mode === "ytd") return build52WeekGrid(weeks);
    return weeks;
  }, [data, mode]);

  const nuclearBuckets = useMemo(() => {
    if (!nuclearOverlay || nuclearOverlay.length < 2) return null;
    if (mode === "30d") return aggregateNuclearToDays(nuclearOverlay);
    return aggregateNuclearToWeeks(nuclearOverlay);
  }, [nuclearOverlay, mode]);

  const activeKeys = useMemo(() => {
    const k = keys || GENERATION_STACK_KEYS;
    return k.filter((key) => buckets.some((d) => typeof d[key] === "number" && (d[key] as number) > 0.01));
  }, [buckets, keys]);

  const xScale = useMemo(
    () =>
      scaleBand<string>({
        domain: buckets.map((d) => d.weekKey),
        range: [0, innerWidth],
        padding: mode === "30d" ? 0.15 : 0.08,
      }),
    [buckets, innerWidth, mode]
  );

  const yMax = useMemo(() => {
    let max = 0;
    for (const d of buckets) {
      let sum = 0;
      for (const key of activeKeys) {
        const val = d[key];
        if (typeof val === "number") sum += val;
      }
      if (sum > max) max = sum;
    }
    return max * 1.05 || 1;
  }, [buckets, activeKeys]);

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        domain: [0, yMax],
        range: [innerHeight, 0],
        nice: true,
      }),
    [yMax, innerHeight]
  );

  const colorScale = useCallback((key: string) => ENERGY_COLORS_HEX[key] || "#BDBDBD", []);

  const [tooltip, setTooltip] = useState<{ data: WeekBucket; left: number } | null>(null);

  if (innerWidth <= 0 || buckets.length < 1) return null;

  // Tick labels: show every Nth label depending on density
  const totalBuckets = buckets.length;
  const tickInterval = totalBuckets > 40 ? 8 : totalBuckets > 20 ? 4 : totalBuckets > 10 ? 2 : 1;
  const tickValues = buckets.filter((_, i) => i % tickInterval === 0).map((d) => d.weekKey);

  return (
    <div style={{ position: "relative" }}>
      <svg width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          <GridRows
            scale={yScale}
            width={innerWidth}
            stroke="var(--color-chart-grid)"
            strokeOpacity={0.5}
            strokeDasharray="2,3"
          />

          <BarStack
            data={buckets}
            keys={activeKeys}
            x={(d) => d.weekKey}
            xScale={xScale}
            yScale={yScale}
            color={colorScale}
          >
            {(barStacks) =>
              barStacks.map((barStack) =>
                barStack.bars.map((bar) => (
                  <rect
                    key={`bar-${barStack.index}-${bar.index}`}
                    x={bar.x}
                    y={bar.y}
                    width={bar.width}
                    height={Math.max(0, bar.height)}
                    fill={bar.color}
                    opacity={0.85}
                    rx={bar.width > 4 ? 1 : 0}
                    onMouseEnter={() => {
                      setTooltip({
                        data: buckets[bar.index],
                        left: bar.x + bar.width / 2 + margin.left,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onTouchStart={() => {
                      setTooltip({
                        data: buckets[bar.index],
                        left: bar.x + bar.width / 2 + margin.left,
                      });
                    }}
                    onTouchEnd={() => setTooltip(null)}
                  />
                ))
              )
            }
          </BarStack>

          {/* Nuclear import overlay bars */}
          {nuclearBuckets && buckets.map((bucket) => {
            const nucGWh = nuclearBuckets.get(bucket.weekKey) || 0;
            if (nucGWh <= 0.01) return null;
            const x = xScale(bucket.weekKey) ?? 0;
            const barWidth = xScale.bandwidth();
            const barHeight = innerHeight - (yScale(nucGWh) ?? 0);
            return (
              <rect
                key={`nuc-${bucket.weekKey}`}
                x={x}
                y={innerHeight - barHeight}
                width={barWidth}
                height={Math.max(0, barHeight)}
                fill="#F9A825"
                fillOpacity={0.2}
                stroke="#F9A825"
                strokeWidth={0.5}
                strokeOpacity={0.6}
                rx={barWidth > 4 ? 1 : 0}
                pointerEvents="none"
              />
            );
          })}

          <AxisBottom
            top={innerHeight}
            scale={xScale}
            tickValues={tickValues}
            tickFormat={(key) => {
              const b = buckets.find((d) => d.weekKey === key);
              return b?.label || "";
            }}
            stroke="var(--color-chart-grid)"
            tickStroke="var(--color-chart-grid)"
            tickLabelProps={() => ({
              fill: "var(--color-text-muted)",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              textAnchor: "middle" as const,
              dy: "0.3em",
            })}
          />
          <AxisLeft
            scale={yScale}
            numTicks={5}
            tickFormat={(d) => formatGWh(d as number)}
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
        </Group>
      </svg>

      {tooltip && (
        <BarTooltip
          data={tooltip.data}
          activeKeys={activeKeys}
          left={tooltip.left}
          width={width}
          margin={margin}
          nuclearGWh={nuclearBuckets?.get(tooltip.data.weekKey)}
        />
      )}
    </div>
  );
}

// ─── Responsive Wrapper ──────────────────────────────────────────────────────

export default function StackedBarChart({ data, keys, height, mode, nuclearOverlay }: Props) {
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
            <StackedBarInner data={data} keys={keys} height={h} width={width} mode={mode} nuclearOverlay={nuclearOverlay} />
          ) : null
        }
      </ParentSize>
    </div>
  );
}
