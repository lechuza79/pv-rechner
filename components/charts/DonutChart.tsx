"use client";

import type { ReactNode } from "react";
import { Pie } from "@visx/shape";
import { Group } from "@visx/group";
import { roundSvgPath } from "../../lib/svg-path";

export interface DonutSegment {
  key: string;
  label: string;
  /** Hex-Farbe (Energie-Palette). Kein CSS-Var-Token — im Embed nicht definiert. */
  color: string;
  value: number;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  /**
   * Inhalt für die Mitte (Zahl + Beschriftung). Wird als HTML-Overlay exakt
   * zentriert — so kann der Aufrufer dieselben Style-Objekte wie im übrigen
   * Layout verwenden (kein SVG-Text-Approximieren).
   */
  children?: ReactNode;
}

/**
 * Donut-Chart auf Visx-Basis. Segmente mit ~1px-Lücke (padAngle), scharfe
 * Kanten, kein Hintergrund (transparentes SVG). Reihenfolge = wie übergeben.
 * Die Mitte ist ein HTML-Overlay (siehe `children`).
 */
export default function DonutChart({ segments, size = 200, children }: DonutChartProps) {
  const radius = size / 2;
  const innerRadius = radius * 0.72;
  // ~1px-Lücke am Außenrand: padAngle ≈ Lückenbreite / Radius.
  const padAngle = 1 / radius;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} role="img">
        <Group top={radius} left={radius}>
          <Pie
            data={segments}
            pieValue={(d) => d.value}
            outerRadius={radius}
            innerRadius={innerRadius}
            padAngle={padAngle}
            pieSort={null}
            pieSortValues={null}
          >
            {(pie) =>
              pie.arcs.map((arc) => {
                // Gerundet, weil dieses Diagramm seine Daten als Props vom
                // Server bekommt und damit serverseitig UND beim Hydrieren
                // gerechnet wird. Die Bogen-Trigonometrie darf sich zwischen
                // den beiden Engines im letzten Bit unterscheiden — ungerundet
                // wird daraus ein Hydration-Mismatch. Begründung in
                // lib/svg-path.ts.
                const d = pie.path(arc);
                return (
                  <path
                    key={arc.data.key}
                    d={d ? roundSvgPath(d) : undefined}
                    fill={arc.data.color}
                  />
                );
              })
            }
          </Pie>
        </Group>
      </svg>
      {children != null && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
