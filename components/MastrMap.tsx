"use client";

import { useEffect, useState, useMemo } from "react";
import { Mercator } from "@visx/geo";
import { ParentSize } from "@visx/responsive";
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

export function MastrMap({ level, values, selectedAgs, onSelect, valueLabel = "kWp" }: MastrMapProps) {
  const [lkGeo, setLkGeo] = useState<FeatureCollection | null>(null);
  const [blGeo, setBlGeo] = useState<FeatureCollection | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    if (level !== "de") return;
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
  }, [level]);

  const valueByAgs = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of values) m.set(v.ags, v.value);
    return m;
  }, [values]);

  // Quantile scale distributes colors across the data quantiles — better for
  // power-law distributions (few huge, many small) than linear quantize.
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

  if (!lkGeo || !blGeo) {
    return (
      <div
        style={{
          width: "100%",
          aspectRatio: "4 / 5",
          background: v("--color-bg-muted"),
          borderRadius: 12,
        }}
      />
    );
  }

  return (
    <div style={{ width: "100%", aspectRatio: "4 / 5", position: "relative" }}>
      <ParentSize>
        {({ width, height }) => {
          if (width < 10) return null;
          return (
            <svg width={width} height={height} role="img" aria-label="Deutschlandkarte: Landkreise">
              {/* Landkreis layer — filled + clickable */}
              <Mercator<RegionFeature>
                data={lkGeo.features}
                fitSize={[[width, height], lkGeo as never]}
              >
                {({ features }) =>
                  features.map(({ feature, path }) => {
                    const ags = feature.properties.id;
                    const isHovered = hovered === ags;
                    const isSelected = selectedAgs === ags;
                    return (
                      <path
                        key={ags}
                        d={path ?? ""}
                        fill={fillFor(ags)}
                        stroke={isSelected ? v("--color-accent-dark") : v("--color-border")}
                        strokeWidth={isSelected ? 1.8 : isHovered ? 1.2 : 0.25}
                        style={{
                          cursor: onSelect ? "pointer" : "default",
                          transition: "stroke 120ms, stroke-width 120ms",
                        }}
                        onMouseEnter={() => setHovered(ags)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => onSelect?.(ags)}
                      />
                    );
                  })
                }
              </Mercator>

              {/* Bundesland border overlay — no fill, pointer-events: none */}
              <g style={{ pointerEvents: "none" }}>
                <Mercator<RegionFeature>
                  data={blGeo.features}
                  fitSize={[[width, height], lkGeo as never]}
                >
                  {({ features }) =>
                    features.map(({ feature, path }) => (
                      <path
                        key={`bl-${feature.properties.id}`}
                        d={path ?? ""}
                        fill="none"
                        stroke={v("--color-text-secondary")}
                        strokeWidth={0.9}
                        strokeLinejoin="round"
                      />
                    ))
                  }
                </Mercator>
              </g>
            </svg>
          );
        }}
      </ParentSize>

      {hovered && (
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
            {lkGeo.features.find((f) => f.properties.id === hovered)?.properties.name ??
              bundeslandByAgs(hovered)?.name ??
              hovered}
          </div>
          <div style={{ color: v("--color-text-secondary"), fontVariantNumeric: "tabular-nums" }}>
            {(valueByAgs.get(hovered) ?? 0).toLocaleString("de-DE")} {valueLabel}
          </div>
        </div>
      )}
    </div>
  );
}
