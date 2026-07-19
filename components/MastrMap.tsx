"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { scaleQuantile } from "@visx/scale";
import { v } from "../lib/theme";
import { bundeslandByAgs } from "../lib/mastr-regions";

import type { FeatureCollection as GeoJsonFeatureCollection, Geometry } from "geojson";

type RegionProps = { id: string; name: string; bl?: string; kind?: string; kreis?: string };
type FeatureCollection = GeoJsonFeatureCollection<Geometry, RegionProps>;

export type RegionValue = {
  ags: string;
  value: number;
};

export type MastrMapProps = {
  /**
   * "de" shows the 16 Bundesländer; "bundesland" zooms into parentAgs and shows
   * its Landkreise; "landkreis" zooms into parentAgs and shows its Gemeinden.
   * The Gemeinde geometry for a Kreis is lazy-loaded on demand (one small file
   * per Kreis), so the ~11.000 Gemeinde polygons never load all at once.
   */
  level: "de" | "bundesland" | "landkreis";
  /** Zoom target: 2-digit Bundesland AGS (level=bundesland) or 5-digit Kreis AGS (level=landkreis). */
  parentAgs?: string;
  /** Values to color the visible regions (BL / LK / Gemeinde depending on level). */
  values: RegionValue[];
  /** Highlighted region (BL / LK / Gemeinde depending on level). */
  selectedAgs?: string;
  /** name is the clicked region's label from the geometry — lets the caller show
   *  it immediately, before the (slower) summary API returns. */
  onSelect?: (ags: string, name?: string) => void;
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

// Region label with its official designation, e.g. "Landkreis Würzburg" or
// "Kreisfreie Stadt Flensburg". Bundesländer carry no designation → just the
// name. Used for the hover box and for the name handed to onSelect (so a freshly
// clicked Kreis reads its full name immediately, before the summary loads).
function regionLabel(name: string, kind?: string): string {
  return kind ? `${kind} ${name}` : name;
}
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
  // Only the WIDTH is measured. The height is derived from the geometry: we fit
  // the projection to the width and make the box exactly as tall as the shape
  // needs (see the projection memo). That kills the letterbox whitespace a fixed
  // box left under flatter regions — and works for every level, page and embed.
  const [width, setWidth] = useState(0);
  const [lkGeo, setLkGeo] = useState<FeatureCollection | null>(null);
  const [blGeo, setBlGeo] = useState<FeatureCollection | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // Gemeinde geometry is loaded per Kreis, only when the user drills into one.
  // Each Kreis bundle is a small file (~10-70 KB) served from public/geo; the
  // full set (~11.000 polygons, several MB) is never loaded at once. Loaded
  // bundles are kept in a ref cache so going up and back is instant and never
  // re-fetches.
  const gemCache = useRef<Map<string, FeatureCollection>>(new Map());
  const [gemGeo, setGemGeo] = useState<FeatureCollection | null>(null);
  const [gemKreis, setGemKreis] = useState<string | null>(null);

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
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The Bundesländer outlines (~260 KB) are all the DE level needs — both as
  // fill polygons and as the fitSize target (their union IS the country
  // outline). Load only them up front.
  useEffect(() => {
    fetch("/geo/de-bundeslaender.geo.json")
      .then((r) => r.json())
      .then(setBlGeo)
      .catch(() => setBlGeo(null));
  }, []);

  // The Landkreis geometry (~630 KB) is only needed once the user drills into a
  // Bundesland — lazy-load it on the first drill-down instead of blocking the
  // initial DE render. Also triggered on landkreis-level (deep links land there
  // directly) so navigating back up to the Bundesland is instant. The ref guard
  // makes this a one-shot fetch; on failure it re-arms so a later drill-down
  // retries.
  const lkRequested = useRef(false);
  useEffect(() => {
    if (level === "de" || lkRequested.current) return;
    lkRequested.current = true;
    fetch("/geo/de-landkreise.geo.json")
      .then((r) => r.json())
      .then(setLkGeo)
      .catch(() => {
        lkRequested.current = false;
        setLkGeo(null);
      });
  }, [level]);

  // Lazy-load the Gemeinde bundle for the Kreis we drill into. The file name IS
  // the 5-digit Kreis AGS (public/geo/gemeinden/<kreis>.geo.json), which matches
  // the Landkreis ids one-to-one — so parentAgs always points at a real bundle.
  useEffect(() => {
    if (level !== "landkreis" || !parentAgs) return;
    const kreis = parentAgs;
    const cached = gemCache.current.get(kreis);
    if (cached) {
      setGemGeo(cached);
      setGemKreis(kreis);
      return;
    }
    let cancelled = false;
    fetch(`/geo/gemeinden/${kreis}.geo.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((geo: FeatureCollection) => {
        if (cancelled) return;
        gemCache.current.set(kreis, geo);
        setGemGeo(geo);
        setGemKreis(kreis);
      })
      .catch(() => {
        if (cancelled) return;
        setGemGeo(null);
        setGemKreis(kreis);
      });
    return () => {
      cancelled = true;
    };
  }, [level, parentAgs]);

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
    contentHeight,
  } = useMemo(() => {
    const EMPTY = {
      fillFeatures: [] as FeatureCollection["features"],
      projection: null as ReturnType<typeof geoMercator> | null,
      contentHeight: 0,
    };
    if (!blGeo || width < 10) return EMPTY;

    const PAD = 12;
    // Cap so a tall outline (Deutschland, schmale Kreise) can't grow the box
    // without bound; flatter outlines stay below it and shrink to fit exactly.
    const MAX_H = 620;
    // Fit the shape to the WIDTH and make the box exactly as tall as the shape —
    // no letterbox gap. If that would exceed MAX_H, fall back to fitting both
    // dimensions into width × MAX_H (centered). `fitObject` is the outline we
    // zoom to; `features` are the polygons drawn inside it.
    const fitToWidth = (fitObject: unknown, features: FeatureCollection["features"]) => {
      const proj = geoMercator().fitWidth(Math.max(width - 2 * PAD, 10), fitObject as never);
      const b = geoPath(proj).bounds(fitObject as never);
      const naturalH = Math.round(b[1][1] - b[0][1] + 2 * PAD);
      if (naturalH <= MAX_H) {
        const shapeW = b[1][0] - b[0][0];
        const [tx, ty] = proj.translate();
        // Center horizontally, top-align vertically (both inside PAD).
        proj.translate([tx + (width - shapeW) / 2 - b[0][0], ty + PAD - b[0][1]]);
        return { fillFeatures: features, projection: proj, contentHeight: naturalH };
      }
      const capped = geoMercator().fitExtent(
        [
          [PAD, PAD],
          [width - PAD, MAX_H - PAD],
        ],
        fitObject as never,
      );
      return { fillFeatures: features, projection: capped, contentHeight: MAX_H };
    };

    if (level === "landkreis" && parentAgs) {
      // Zoom to the Kreis; render its Gemeinden as fill. Until the bundle for
      // THIS Kreis has arrived (gemKreis === parentAgs), hold the placeholder
      // rather than draw the previous Kreis's shapes.
      if (!gemGeo || gemKreis !== parentAgs || gemGeo.features.length === 0) return EMPTY;
      return fitToWidth(gemGeo, gemGeo.features);
    }

    if (level === "bundesland" && parentAgs) {
      // Zoom to the Bundesland; render its Landkreise as fill. The Landkreis
      // geometry is lazy-loaded on drill-down — until it arrives, hold the
      // placeholder (same loading box as the Gemeinde case above).
      if (!lkGeo) return EMPTY;
      const parentFeature = blGeo.features.find((f) => (f.properties as RegionProps).id === parentAgs);
      if (!parentFeature) return EMPTY;
      const lksInBl = lkGeo.features.filter((f) => (f.properties as RegionProps).id.startsWith(parentAgs));
      return fitToWidth(parentFeature, lksInBl);
    }

    // Default: de-level. Fit the whole country outline (the Bundesländer union
    // — identical bounds to the old Landkreis-based fit), render Bundesländer.
    return fitToWidth(blGeo, blGeo.features);
  }, [level, parentAgs, lkGeo, blGeo, gemGeo, gemKreis, width]);

  const pathGen = useMemo(() => (projection ? geoPath(projection) : null), [projection]);

  const fillPaths = useMemo(() => {
    if (!pathGen) return [];
    return fillFeatures.map((f) => {
      const props = f.properties as RegionProps;
      return {
        id: props.id,
        name: props.name,
        label: regionLabel(props.name, props.kind),
        d: pathGen(f as never) ?? "",
      };
    });
  }, [fillFeatures, pathGen]);

  const hoveredName = useMemo(() => {
    if (!hovered) return null;
    const f = fillFeatures.find((ft) => (ft.properties as RegionProps).id === hovered);
    if (f) {
      const props = f.properties as RegionProps;
      return regionLabel(props.name, props.kind);
    }
    return bundeslandByAgs(hovered)?.name ?? hovered;
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
      // Height follows the shape (contentHeight). Until the geometry is measured
      // it stays 0 → the CSS `.mastr-map-box` height acts as the loading box.
      style={{ width: "100%", position: "relative", height: contentHeight > 0 ? contentHeight : undefined }}
    >
      {!projection || contentHeight < 10 ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: v("--color-accent-dim"),
            borderRadius: 12,
          }}
        />
      ) : (
        <svg width={width} height={contentHeight} role="img" aria-label="Deutschlandkarte">
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
                  data-ags={p.id}
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
                  onClick={() => !loading && onSelect?.(p.id, p.label)}
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
            boxShadow: v("--shadow-sm"),
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
