"use client";

import { useMemo, useCallback, useRef, useState, useLayoutEffect } from "react";
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
  FOSSIL_KEYS,
  NUCLEAR_KEYS,
  SONSTIGE_KEYS,
  CATEGORY_COLORS,
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
  mode?: "ytd" | "12m" | "30d" | "max";
  nuclearOverlay?: NuclearOverlayPoint[];
  preAggregated?: boolean; // Data is already weekly GWh (from Supabase)
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
  // Derive dominant year from data (most frequent ISO week year, not just first entry)
  // Needed because Jan 1 can fall in ISO week 52 of the previous year
  let dataYear = new Date().getFullYear();
  if (filledWeeks.length > 0) {
    const yearCounts = new Map<number, number>();
    for (const w of filledWeeks) {
      const y = parseInt(w.weekKey.split("-W")[0], 10);
      yearCounts.set(y, (yearCounts.get(y) || 0) + 1);
    }
    let maxCount = 0;
    yearCounts.forEach((count, year) => {
      if (count > maxCount) { maxCount = count; dataYear = year; }
    });
  }
  const genKeys = GENERATION_STACK_KEYS;
  const grid: WeekBucket[] = [];

  for (let w = 1; w <= 52; w++) {
    const weekKey = `${dataYear}-W${String(w).padStart(2, "0")}`;
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

// ─── Aggregate weekly buckets to monthly ────────────────────────────────────

const MONTH_LABELS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

function isoWeekToMonth(year: number, week: number): { year: number; month: number } {
  // Monday of ISO week: Jan 4 is always in week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7; // Mon=1..Sun=7
  const monday = new Date(jan4.getTime() + ((week - 1) * 7 - (dayOfWeek - 1)) * 86400000);
  // Use Wednesday (mid-week) to determine which month the week "belongs" to
  const wed = new Date(monday.getTime() + 2 * 86400000);
  return { year: wed.getUTCFullYear(), month: wed.getUTCMonth() }; // 0-based
}

function aggregateWeeksToMonths(weekBuckets: WeekBucket[]): WeekBucket[] {
  const genKeys = GENERATION_STACK_KEYS;
  const months = new Map<string, WeekBucket>();

  for (const w of weekBuckets) {
    const parts = w.weekKey.match(/^(\d{4})-W(\d{2})$/);
    if (!parts) continue;
    const yr = parseInt(parts[1], 10);
    const wk = parseInt(parts[2], 10);
    const { year, month } = isoWeekToMonth(yr, wk);
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

    if (!months.has(monthKey)) {
      const label = month === 0 ? String(year) : MONTH_LABELS[month];
      const bucket: WeekBucket = { weekKey: monthKey, label };
      for (const key of genKeys) bucket[key] = 0;
      months.set(monthKey, bucket);
    }

    const bucket = months.get(monthKey)!;
    for (const key of genKeys) {
      bucket[key] = (bucket[key] as number) + (typeof w[key] === "number" ? (w[key] as number) : 0);
    }
  }

  return Array.from(months.values()).sort((a, b) => a.weekKey.localeCompare(b.weekKey));
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
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, marginTop: 6 }}>
      <span style={{ flex: 1, fontWeight: 700, fontSize: 12, color }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color }}>{value}</span>
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
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipWidth = 200;
  const goLeft = left > width / 2;
  const x = goLeft ? left - tooltipWidth - 12 : left + 12;

  // Center tooltip vertically within chart area, clamp to viewport
  const chartHeight = CHART_HEIGHT - margin.top - margin.bottom;
  useLayoutEffect(() => {
    const el = tooltipRef.current;
    if (!el) return;
    const elHeight = el.getBoundingClientRect().height;
    let top = margin.top + (chartHeight - elHeight) / 2;
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

  let totalGWh = 0;
  let renewableGWh = 0;
  let fossilGWh = 0;
  let nuclearGWhLocal = 0;
  let sonstigeGWh = 0;
  for (const key of activeKeys) {
    const val = data[key];
    if (typeof val === "number" && val > 0) {
      totalGWh += val;
      if (RENEWABLE_KEYS.includes(key)) renewableGWh += val;
      else if (FOSSIL_KEYS.includes(key)) fossilGWh += val;
      else if (NUCLEAR_KEYS.includes(key)) nuclearGWhLocal += val;
      else sonstigeGWh += val;
    }
  }
  if (totalGWh < 0.01) return null;

  const renewablePct = totalGWh > 0 ? Math.round(renewableGWh / totalGWh * 100) : 0;
  const fossilPct = totalGWh > 0 ? Math.round(fossilGWh / totalGWh * 100) : 0;
  const nuclearPctLocal = totalGWh > 0 ? Math.round(nuclearGWhLocal / totalGWh * 100) : 0;
  const sonstigePct = totalGWh > 0 ? Math.round(sonstigeGWh / totalGWh * 100) : 0;

  const renewableKeys = [...activeKeys].reverse().filter(k => RENEWABLE_KEYS.includes(k));
  const fossilKeys = [...activeKeys].reverse().filter(k => FOSSIL_KEYS.includes(k));
  const nuclearKeysLocal = [...activeKeys].reverse().filter(k => NUCLEAR_KEYS.includes(k));
  const sonstigeKeys = [...activeKeys].reverse().filter(k => SONSTIGE_KEYS.includes(k));

  return (
    <div
      ref={tooltipRef}
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
          <BarTooltipSummary color={CATEGORY_COLORS.renewable} label={`Erneuerbare ${renewablePct}%`} value={formatGWh(renewableGWh)} />
          {renewableKeys.map(key => {
            const val = data[key];
            if (typeof val !== "number" || val <= 0.01) return null;
            return <BarTooltipRow key={key} color={ENERGY_COLORS_HEX[key]} label={ENERGY_LABELS[key] || key} value={formatGWh(val)} />;
          })}
        </>
      )}

      {/* Fossil */}
      {fossilGWh > 0 && (
        <>
          <BarTooltipSummary color={CATEGORY_COLORS.fossil} label={`Fossil ${fossilPct}%`} value={formatGWh(fossilGWh)} />
          {fossilKeys.map(key => {
            const val = data[key];
            if (typeof val !== "number" || val <= 0.01) return null;
            return <BarTooltipRow key={key} color={ENERGY_COLORS_HEX[key]} label={ENERGY_LABELS[key] || key} value={formatGWh(val)} />;
          })}
        </>
      )}

      {/* Sonstige */}
      {sonstigeGWh > 0 && (
        <>
          <BarTooltipSummary color={CATEGORY_COLORS.other} label={`Sonstige ${sonstigePct}%`} value={formatGWh(sonstigeGWh)} />
          {sonstigeKeys.map(key => {
            const val = data[key];
            if (typeof val !== "number" || val <= 0.01) return null;
            return <BarTooltipRow key={key} color={ENERGY_COLORS_HEX[key]} label={ENERGY_LABELS[key] || key} value={formatGWh(val)} />;
          })}
        </>
      )}

      {/* Kernenergie (inländisch) */}
      {nuclearGWhLocal > 0.01 && (
        <>
          <BarTooltipSummary color={CATEGORY_COLORS.nuclear} label={`Kernenergie ${nuclearPctLocal}%`} value={formatGWh(nuclearGWhLocal)} />
          {nuclearKeysLocal.map(key => {
            const val = data[key];
            if (typeof val !== "number" || val <= 0.01) return null;
            return <BarTooltipRow key={key} color={ENERGY_COLORS_HEX[key]} label={ENERGY_LABELS[key] || key} value={formatGWh(val)} />;
          })}
        </>
      )}

      {/* Importierte Kernenergie */}
      {nuclearGWh != null && nuclearGWh > 0.01 && (
        <>
          <BarTooltipSummary color={CATEGORY_COLORS.nuclearImport} label={`Kernenergie ${totalGWh > 0 ? Math.round(nuclearGWh / (totalGWh + nuclearGWh) * 100) : 0}%`} value={formatGWh(nuclearGWh)} />
          <div style={{ fontSize: 10, color: "var(--color-text-faint)", marginTop: -2, marginBottom: 2 }}>importiert</div>
        </>
      )}
    </div>
  );
}

// ─── Inner Chart ─────────────────────────────────────────────────────────────

function StackedBarInner({ data, keys, height = CHART_HEIGHT, width, mode, nuclearOverlay, preAggregated }: Props & { width: number }) {
  const margin = CHART_MARGIN;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const buckets = useMemo(() => {
    // Pre-aggregated data from Supabase: ts is "YYYY-WNN", values are already GWh
    if (preAggregated) {
      const weekBuckets = data.map((d): WeekBucket => {
        const weekKey = d.ts as string;
        const bucket: WeekBucket = { weekKey, label: weekKey };
        for (const key of GENERATION_STACK_KEYS) {
          bucket[key] = typeof d[key] === "number" ? (d[key] as number) : 0;
        }
        return bucket;
      });
      // Aggregate to monthly for better readability
      return aggregateWeeksToMonths(weekBuckets);
    }
    if (mode === "30d") return aggregateToDays(data);
    const weeks = aggregateToWeeks(data);
    if (mode === "max") {
      // For multi-year "max" view, use raw weekly data with year-aware labels
      return weeks.map((w): WeekBucket => {
        const [y, wStr] = w.weekKey.split("-W");
        const wNum = parseInt(wStr, 10);
        return { ...w, label: wNum === 1 ? y : `KW${wNum}` };
      });
    }
    if (mode === "ytd") return build52WeekGrid(weeks);
    return weeks;
  }, [data, mode, preAggregated]);

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
        padding: mode === "30d" ? 0.15 : preAggregated ? 0.05 : mode === "max" ? 0.02 : 0.08,
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

  const colorScale = useCallback((key: string) => ENERGY_COLORS_HEX[key] || CATEGORY_COLORS.other, []);

  const [tooltip, setTooltip] = useState<{ data: WeekBucket; left: number } | null>(null);

  if (innerWidth <= 0 || buckets.length < 1) return null;

  // Tick labels: for max mode show only year starts, otherwise density-based
  const totalBuckets = buckets.length;
  const tickValues = useMemo(() => {
    if (preAggregated) {
      // Monthly buckets: show January of each year (weekKey = "YYYY-01")
      return buckets.filter(b => b.weekKey.endsWith("-01")).map(b => b.weekKey);
    }
    if (mode === "max") {
      // Show only KW1 of each year (year label)
      return buckets.filter(b => b.weekKey.endsWith("-W01")).map(b => b.weekKey);
    }
    const interval = totalBuckets > 40 ? 8 : totalBuckets > 20 ? 4 : totalBuckets > 10 ? 2 : 1;
    return buckets.filter((_, i) => i % interval === 0).map((d) => d.weekKey);
  }, [buckets, totalBuckets, mode, preAggregated]);

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
            {(barStacks) => {
              // Find the topmost (last non-zero) bar for each column index
              const topBarKey = new Map<number, string>();
              for (const barStack of barStacks) {
                for (const bar of barStack.bars) {
                  if (bar.height > 0.5) {
                    topBarKey.set(bar.index, `${barStack.index}-${bar.index}`);
                  }
                }
              }

              return barStacks.map((barStack) =>
                barStack.bars.map((bar) => {
                  const isTop = topBarKey.get(bar.index) === `${barStack.index}-${bar.index}`;
                  const r = bar.width > 4 ? 2 : 0;

                  // Only round top corners for the topmost segment
                  const barEl = isTop && r > 0 ? (
                    <path
                      key={`bar-${barStack.index}-${bar.index}`}
                      d={`M${bar.x},${bar.y + r}
                          q0,-${r} ${r},-${r}
                          h${bar.width - 2 * r}
                          q${r},0 ${r},${r}
                          v${Math.max(0, bar.height - r)}
                          h-${bar.width}
                          z`}
                      fill={bar.color}
                      opacity={0.85}
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
                  ) : (
                    <rect
                      key={`bar-${barStack.index}-${bar.index}`}
                      x={bar.x}
                      y={bar.y}
                      width={bar.width}
                      height={Math.max(0, bar.height)}
                      fill={bar.color}
                      opacity={0.85}
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
                  );

                  return barEl;
                })
              );
            }}
          </BarStack>

          {/* Nuclear import overlay — horizontal line at nuclear height */}
          {nuclearBuckets && (
            <>
            <defs>
              <clipPath id="nucClip">
                <rect x={0} y={0} width={innerWidth} height={innerHeight}>
                  <animate attributeName="width" from="0" to={innerWidth} dur="0.8s" fill="freeze" calcMode="spline" keySplines="0.25 0.1 0.25 1" />
                </rect>
              </clipPath>
            </defs>
            <g clipPath="url(#nucClip)">
              {buckets.map((bucket) => {
                const nucGWh = nuclearBuckets.get(bucket.weekKey) || 0;
                if (nucGWh <= 0.01) return null;
                const x = xScale(bucket.weekKey) ?? 0;
                const barWidth = xScale.bandwidth();
                const lineY = yScale(nucGWh) ?? innerHeight;
                return (
                  <g key={`nuc-${bucket.weekKey}`} pointerEvents="none">
                    {/* White outline (1px border around the 2px line) */}
                    <line
                      x1={x}
                      x2={x + barWidth}
                      y1={lineY}
                      y2={lineY}
                      stroke="#FFFFFF"
                      strokeWidth={4}
                      strokeOpacity={0.5}
                    />
                    {/* Nuclear import line */}
                    <line
                      x1={x}
                      x2={x + barWidth}
                      y1={lineY}
                      y2={lineY}
                      stroke={CATEGORY_COLORS.nuclearImport}
                      strokeWidth={2}
                    />
                  </g>
                );
              })}
            </g>
            </>
          )}

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

export default function StackedBarChart({ data, keys, height, mode, nuclearOverlay, preAggregated }: Props) {
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
            <StackedBarInner data={data} keys={keys} height={h} width={width} mode={mode} nuclearOverlay={nuclearOverlay} preAggregated={preAggregated} />
          ) : null
        }
      </ParentSize>
    </div>
  );
}
