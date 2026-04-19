"use client";

import { useEffect, useState, useMemo } from "react";
import { Mercator } from "@visx/geo";
import { ParentSize } from "@visx/responsive";
import { scaleQuantize } from "@visx/scale";
import { v } from "../lib/theme";
import { bundeslandByAgs, bundeslandByIso } from "../lib/mastr-regions";

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

export function MastrMap({ level, values, selectedAgs, onSelect, valueLabel = "kWp" }: MastrMapProps) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    if (level !== "de") return;
    fetch("/geo/de-bundeslaender.geo.json")
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => setGeo(null));
  }, [level]);

  const valueByAgs = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of values) m.set(v.ags, v.value);
    return m;
  }, [values]);

  const maxVal = useMemo(() => Math.max(1, ...values.map((v) => v.value)), [values]);

  // 7-step sequential color ramp from light to accent
  const colorScale = useMemo(
    () =>
      scaleQuantize<string>({
        domain: [0, maxVal],
        range: ["#EAF2FE", "#C9DCFB", "#A8C5F7", "#87AFF4", "#5B95F0", "#3380EE", "#1365EA"],
      }),
    [maxVal],
  );

  if (!geo) {
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
            <svg width={width} height={height} role="img" aria-label="Deutschlandkarte: Bundesländer">
              <Mercator<RegionFeature>
                data={geo.features}
                // d3-geo's ExtendedFeatureCollection type is structurally compatible with
                // our GeoJSON FeatureCollection but nominally distinct; cast is safe.
                fitSize={[[width, height], geo as never]}
              >
                {({ features }) =>
                  features.map(({ feature, path }) => {
                    const iso = feature.properties.id;
                    const bl = bundeslandByIso(iso);
                    const ags = bl?.ags ?? "";
                    const val = valueByAgs.get(ags) ?? 0;
                    const isHovered = hovered === ags;
                    const isSelected = selectedAgs === ags;
                    return (
                      <path
                        key={iso}
                        d={path ?? ""}
                        fill={colorScale(val)}
                        stroke={isSelected ? v("--color-accent-dark") : v("--color-border")}
                        strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0.5}
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
            {bundeslandByAgs(hovered)?.name ?? hovered}
          </div>
          <div style={{ color: v("--color-text-secondary"), fontVariantNumeric: "tabular-nums" }}>
            {(valueByAgs.get(hovered) ?? 0).toLocaleString("de-DE")} {valueLabel}
          </div>
        </div>
      )}
    </div>
  );
}
