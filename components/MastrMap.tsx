"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { scaleQuantile } from "@visx/scale";
import { v } from "../lib/theme";
import { bundeslandByAgs } from "../lib/mastr-regions";

import type { FeatureCollection as GeoJsonFeatureCollection, Geometry } from "geojson";

type RegionProps = { id: string; name: string; bl?: string; kind?: string };
type FeatureCollection = GeoJsonFeatureCollection<Geometry, RegionProps>;

export type RegionValue = {
  ags: string;
  value: number;
};

export type MastrMapProps = {
  /** "de" shows 16 Bundesländer; "bundesland" zooms into parentAgs + shows its Landkreise. */
  level: "de" | "bundesland";
  /** Required when level="bundesland" — 2-digit Bundesland AGS to zoom to. */
  parentAgs?: string;
  /** Values to color the visible regions (BL on de-level, LK on bundesland-level). */
  values: RegionValue[];
  /** Highlighted region (BL on de-level, LK on bundesland-level). */
  selectedAgs?: string;
  onSelect?: (ags: string) => void;
  valueLabel?: string;
  /** True while choropleth data is fetching — polygons animate with a pulse. */
  loading?: boolean;
};

// Choropleth shades derive from the accent color (mixed toward the background),
// so the map and the accent always share one variable — themeable in embeds and
// on the main site (where the accent is the brand blue, this matches the old ramp).
const COLOR_RAMP = [12, 26, 40, 55, 70, 85, 100].map(
  (pct) => `color-mix(in srgb, var(--color-accent) ${pct}%, var(--color-bg))`,
);
export function MastrMap({
  level,
  parentAgs,
  values,
  selectedAgs,
  onSelect,
  valueLabel = "MW",
  loading = false,
}: MastrMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Both dimensions are measured from the container. Its height is set by CSS
  // (.mastr-map-box) and shrinks on narrow viewports at the SAME breakpoint as
  // the single-column layout, so the map always fits its box and never pushes
  // the KPI row off screen. The projection just scales into whatever box it gets.
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [lkGeo, setLkGeo] = useState<FeatureCollection | null>(null);
  const [blGeo, setBlGeo] = useState<FeatureCollection | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // Clear any hover when the drilldown level changes. Without this a hovered
  // Bundesland id lingers after tapping into it, and the info box would show
  // that Bundesland with value 0 (its key no longer exists in the now
  // Landkreis-level data). Touch devices are the main victims — a tap both
  // hovers and drills, so the stale-0 box is what mobile users actually saw.
  useEffect(() => {
    setHovered(null);
  }, [level, parentAgs]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setWidth(rect.width);
    setHeight(rect.height);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
        setHeight(entry.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/geo/de-landkreise.geo.json").then((r) => r.json()),
      fetch("/geo/de-bundeslaender.geo.json").then((r) => r.json()),
    ])
      .then(([lk, bl]) => {
        setLkGeo(lk);
        setBlGeo(bl);
      })
      .catch(() => {
        setLkGeo(null);
        setBlGeo(null);
      });
  }, []);

  const valueByAgs = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of values) m.set(v.ags, v.value);
    return m;
  }, [values]);

  const colorScale = useMemo(() => {
    const nums = values.map((v) => v.value).filter((n) => n > 0);
    if (nums.length === 0) return () => COLOR_RAMP[0];
    return scaleQuantile<string>({ domain: nums, range: COLOR_RAMP });
  }, [values]);

  const fillFor = (ags: string) => {
    if (loading) return COLOR_RAMP[0]; // faint accent wash while loading, not grey
    const val = valueByAgs.get(ags) ?? 0;
    if (val <= 0) return COLOR_RAMP[0];
    return colorScale(val);
  };

  const {
    fillFeatures,
    projection,
  } = useMemo(() => {
    if (!lkGeo || !blGeo || width < 10 || height < 10) {
      return { fillFeatures: [], projection: null };
    }

    if (level === "bundesland" && parentAgs) {
      // Zoom to the Bundesland; render its Landkreise as fill.
      const parentFeature = blGeo.features.find((f) => (f.properties as RegionProps).id === parentAgs);
      if (!parentFeature) {
        return { fillFeatures: [], projection: null };
      }
      const proj = geoMercator().fitExtent(
        [
          [20, 20],
          [width - 20, height - 20],
        ],
        parentFeature as never,
      );
      // States are wider than tall, so fitExtent centers them vertically and
      // leaves a big gap above. Shift the projection up so the state sits at
      // the top of the box (height stays the same).
      const bounds = geoPath(proj).bounds(parentFeature as never);
      const dy = bounds[0][1] - 20;
      if (dy > 0) {
        const [tx, ty] = proj.translate();
        proj.translate([tx, ty - dy]);
      }
      const lksInBl = lkGeo.features.filter((f) =>
        (f.properties as RegionProps).id.startsWith(parentAgs),
      );
      return {
        fillFeatures: lksInBl,
        projection: proj,
      };
    }

    // Default: de-level. Render Bundesländer as fill.
    const proj = geoMercator().fitSize([width, height], lkGeo as never);
    return {
      fillFeatures: blGeo.features,
      projection: proj,
    };
  }, [level, parentAgs, lkGeo, blGeo, width, height]);

  const pathGen = useMemo(() => (projection ? geoPath(projection) : null), [projection]);

  const fillPaths = useMemo(() => {
    if (!pathGen) return [];
    return fillFeatures.map((f) => {
      const props = f.properties as RegionProps;
      return {
        id: props.id,
        name: props.name,
        d: pathGen(f as never) ?? "",
      };
    });
  }, [fillFeatures, pathGen]);

  const hoveredName = useMemo(() => {
    if (!hovered) return null;
    const f = fillFeatures.find((ft) => (ft.properties as RegionProps).id === hovered);
    return f ? (f.properties as RegionProps).name : bundeslandByAgs(hovered)?.name ?? hovered;
  }, [hovered, fillFeatures]);

  // The on-map info box is a desktop hover affordance: it only shows a value
  // for a region actually under the pointer AND present in the current view.
  // The `valueByAgs.has` guard is what kills the old stale-0 bug — after
  // drilling into a Bundesland the hovered id no longer exists in the (now
  // Landkreis-level) data, so the box hides instead of reading 0. On touch
  // there is no hover, so mobile relies on the KPI row under the map instead.
  const hoverValid = hovered !== null && valueByAgs.has(hovered);
  const info: { name: string; value: number } | null = hoverValid
    ? { name: hoveredName ?? hovered!, value: valueByAgs.get(hovered!) ?? 0 }
    : null;

  return (
    <div
      ref={containerRef}
      className={`mastr-map-box${level === "de" ? " mastr-map-box--de" : ""}`}
      style={{ width: "100%", position: "relative" }}
    >
      {!lkGeo || !blGeo || width < 10 || height < 10 || !projection ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: v("--color-accent-dim"),
            borderRadius: 12,
          }}
        />
      ) : (
        <svg width={width} height={height} role="img" aria-label="Deutschlandkarte">
          <g
            style={
              loading ? { animation: "sc-map-pulse 1.4s ease-in-out infinite" } : undefined
            }
          >
            {fillPaths.map((p) => {
              const isHovered = hovered === p.id;
              const isSelected = selectedAgs === p.id;
              return (
                <path
                  key={p.id}
                  d={p.d}
                  fill={fillFor(p.id)}
                  stroke={isSelected ? v("--color-accent-dark") : loading ? COLOR_RAMP[3] : v("--color-border")}
                  strokeWidth={isSelected ? 2 : isHovered ? 1.3 : 0.5}
                  style={{
                    cursor: onSelect && !loading ? "pointer" : "default",
                    transition: "fill 240ms ease-out, stroke 120ms, stroke-width 120ms",
                  }}
                  onMouseEnter={() => !loading && setHovered(p.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => !loading && onSelect?.(p.id)}
                />
              );
            })}
          </g>
        </svg>
      )}

      {info && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            background: v("--color-bg"),
            border: `1px solid ${v("--color-border")}`,
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 13,
            pointerEvents: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontWeight: 600, color: v("--color-text-primary") }}>{info.name}</div>
          <div style={{ color: v("--color-text-secondary"), fontVariantNumeric: "tabular-nums" }}>
            {info.value.toLocaleString("de-DE", { maximumFractionDigits: 0 })} {valueLabel}
          </div>
        </div>
      )}
    </div>
  );
}
