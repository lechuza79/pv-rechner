"use client";

import { useMemo } from "react";
import { MastrMap, type RegionValue } from "../MastrMap";
import { v, space } from "../../lib/theme";

/**
 * Das Versorgungsgebiet auf der Karte — die einzige Art, „stimmt das Gebiet?"
 * tatsächlich zu prüfen.
 *
 * Eine Liste von Gemeindenamen kann niemand nachvollziehen; ein Netzgebiet
 * dagegen erkennt man auf einen Blick: Ein zusammenhängender Fleck rund um die
 * Sitzstadt ist plausibel, verstreute Einzelpunkte quer durchs Land sind es
 * nicht. Genau diese Prüfung soll die Karte ermöglichen — sie behauptet nichts,
 * sie macht die Zuordnung nur ansehbar.
 *
 * Die Karte selbst ist die bestehende Atlas-Karte (`MastrMap`), keine zweite:
 * dieselbe Geometrie, dieselbe Farbskala, dasselbe Nachladen je Kreis.
 *
 * Die Ebene richtet sich nach der Ausdehnung des Gebiets, weil die Karte je
 * Ebene etwas anderes zeichnet:
 *   - alles in EINEM Landkreis  → Gemeinden dieses Kreises
 *   - mehrere Kreise, ein Land  → Kreise dieses Landes, eingefärbt nach Anzahl
 *   - über Landesgrenzen        → Bundesländer
 */
export default function VersorgerGebietKarte({
  gemeindeIds,
  name,
}: {
  /** 8-stellige Gemeindeschlüssel des Gebiets. */
  gemeindeIds: string[];
  name: string;
}) {
  const karte = useMemo(() => {
    if (gemeindeIds.length === 0) return null;

    const kreise = new Set(gemeindeIds.map((a) => a.slice(0, 5)));
    const laender = new Set(gemeindeIds.map((a) => a.slice(0, 2)));

    if (kreise.size === 1) {
      const kreis = Array.from(kreise)[0];
      return {
        level: "landkreis" as const,
        parentAgs: kreis,
        values: gemeindeIds.map((ags): RegionValue => ({ ags, value: 1 })),
        label: "Gemeinde im Gebiet",
        erklaerung: `Alle ${gemeindeIds.length} Gemeinden liegen in einem Landkreis. Eingefärbt ist, was zum Gebiet zählt.`,
      };
    }

    if (laender.size === 1) {
      const land = Array.from(laender)[0];
      const jeKreis = new Map<string, number>();
      for (const ags of gemeindeIds) {
        const k = ags.slice(0, 5);
        jeKreis.set(k, (jeKreis.get(k) ?? 0) + 1);
      }
      return {
        level: "bundesland" as const,
        parentAgs: land,
        values: Array.from(jeKreis.entries()).map(([ags, value]): RegionValue => ({ ags, value })),
        label: "Gemeinden im Kreis",
        erklaerung: `Das Gebiet verteilt sich auf ${kreise.size} Landkreise. Die Färbung zeigt, wie viele Gemeinden je Kreis dazugehören.`,
      };
    }

    const jeLand = new Map<string, number>();
    for (const ags of gemeindeIds) {
      const l = ags.slice(0, 2);
      jeLand.set(l, (jeLand.get(l) ?? 0) + 1);
    }
    return {
      level: "de" as const,
      parentAgs: undefined,
      values: Array.from(jeLand.entries()).map(([ags, value]): RegionValue => ({ ags, value })),
      label: "Gemeinden im Land",
      erklaerung: `Das Gebiet reicht über ${laender.size} Bundesländer. Die Färbung zeigt, wie viele Gemeinden je Land dazugehören.`,
    };
  }, [gemeindeIds]);

  if (!karte) {
    return <p style={{ color: v("--color-text-muted"), fontSize: 12 }}>Keine Gemeinden zugeordnet.</p>;
  }

  return (
    <div>
      <div
        style={{
          border: `1px solid ${v("--color-border")}`,
          borderRadius: v("--radius-md"),
          overflow: "hidden",
          background: v("--color-bg"),
        }}
      >
        <MastrMap level={karte.level} parentAgs={karte.parentAgs} values={karte.values} valueLabel={karte.label} />
      </div>
      <p style={{ fontSize: 11, color: v("--color-text-muted"), marginTop: space.xs, lineHeight: 1.5 }}>
        {karte.erklaerung} Ein zusammenhängender Bereich rund um den Sitz spricht für die Zuordnung;
        verstreute Einzelgemeinden sind ein Grund, bei {name} genauer hinzusehen.
      </p>
    </div>
  );
}
