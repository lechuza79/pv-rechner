"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { scaleQuantile } from "@visx/scale";
import { v } from "../lib/theme";
import { bundeslandByAgs } from "../lib/mastr-regions";

import type { Feature, FeatureCollection as GeoJsonFeatureCollection, Geometry } from "geojson";

type RegionProps = { id: string; name: string; type?: string };
type RegionFeature = Feature<Geometry, RegionProps>;
type FeatureCollection = GeoJsonFeatureCollection<Geometry, RegionProps>;

export type RegionValue = {
  ags: string;
  value: number;
};

export type MastrMapProps = {
  level: "de";
  values: RegionValue[];
  selectedAgs?: string;
  onSelect?: (ags: string) => void;
  valueLabel?: string;
};

const COLOR_RAMP = ["#EAF2FE", "#C9DCFB", "#A8C5F7", "#87AFF4", "#5B95F0", "#3380EE", "#1365EA"];
const MAP_HEIGHT = 640;

export function MastrMap({ values, selectedAgs, onSelect, valueLabel = "kWp" }: MastrMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [lkGeo, setLkGeo] = useState<FeatureCollection | null>(null);
  const [blGeo, setBlGeo] = useState<FeatureCollection | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // Track container width manually (ResizeObserver + initial measure)
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
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
    if (nums.length === 0) {
      return () => COLOR_RAMP[0];
    }
    return scaleQuantile<string>({
      domain: nums,
      range: COLOR_RAMP,
    });
  }, [values]);

  const fillFor = (ags: string) => {
    const val = valueByAgs.get(ags) ?? 0;
    if (val <= 0) return COLOR_RAMP[0];
    return colorScale(val);
  };

  // Build a shared d3-geo path generator fitted to the LK bounds so both layers
  // use the same projection and align pixel-perfect.
  const { lkPaths, blPaths } = useMemo(() => {
    if (!lkGeo || !blGeo || width < 10) return { lkPaths: null, blPaths: null };
    const projection = geoMercator().fitSize([width, MAP_HEIGHT], lkGeo as never);
    const path = geoPath(projection);
    return {
      lkPaths: lkGeo.features.map((f) => ({
        id: (f.properties as RegionProps).id,
        name: (f.properties as RegionProps).name,
        d: path(f as never) ?? "",
      })),
      blPaths: blGeo.features.map((f) => ({
        id: (f.properties as RegionProps).id,
        d: path(f as never) ?? "",
      })),
    };
  }, [lkGeo, blGeo, width]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: MAP_HEIGHT, position: "relative" }}>
      {!lkGeo || !blGeo || width < 10 ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: v("--color-bg-muted"),
            borderRadius: 12,
          }}
        />
      ) : (
        <svg
          width={width}
          height={MAP_HEIGHT}
          role="img"
          aria-label="Deutschlandkarte: Landkreise"
        >
          {/* Landkreis layer — filled, clickable */}
          <g>
            {lkPaths?.map((p) => {
              const isHovered = hovered === p.id;
              const isSelected = selectedAgs === p.id;
              return (
                <path
                  key={p.id}
                  d={p.d}
                  fill={fillFor(p.id)}
                  stroke={isSelected ? v("--color-accent-dark") : v("--color-border")}
                  strokeWidth={isSelected ? 1.8 : isHovered ? 1.2 : 0.5}
                  style={{
                    cursor: onSelect ? "pointer" : "default",
                    transition: "stroke 120ms, stroke-width 120ms",
                  }}
                  onMouseEnter={() => setHovered(p.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onSelect?.(p.id)}
                />
              );
            })}
          </g>
          {/* BL border overlay */}
          <g style={{ pointerEvents: "none" }}>
            {blPaths?.map((p) => (
              <path
                key={`bl-${p.id}`}
                d={p.d}
                fill="none"
                stroke={v("--color-text-secondary")}
                strokeWidth={1}
                strokeLinejoin="round"
              />
            ))}
          </g>
        </svg>
      )}

      {hovered && lkGeo && (
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
          <div style={{ fontWeight: 600, color: v("--color-text-primary") }}>
            {lkGeo.features.find((f) => (f.properties as RegionProps).id === hovered)
              ?.properties.name ?? bundeslandByAgs(hovered)?.name ?? hovered}
          </div>
          <div style={{ color: v("--color-text-secondary"), fontVariantNumeric: "tabular-nums" }}>
            {(valueByAgs.get(hovered) ?? 0).toLocaleString("de-DE")} {valueLabel}
          </div>
        </div>
      )}
    </div>
  );
}
