"use client";

import { v } from "../lib/theme";
import DonutChart from "./charts/DonutChart";
import GemeindeWidgetShell from "./atlas/GemeindeWidgetShell";
import { WIDGETS, widgetForPlace } from "../lib/widget-registry";
import { pvLeistungTeile } from "../lib/atlas-format";
import type { AnlagentypSegment } from "../lib/anlagentyp";

export type { AnlagentypSegment } from "../lib/anlagentyp";

// Einbettbares Widget: installierte Solarleistung nach ANLAGENTYP (private
// Dächer / Gewerbe-Dächer / Freifläche) je Bundesland — echte MaStR-Daten, kein
// Modell. Bewusst NICHT der Erneuerbaren-Technologie-Mix wie in der Gemeinde-
// Variante: auf der PV-Förderseite ist die Bauform (Dach vs. Freifläche) die
// relevante Differenzierung. Gleiche Shell + Donut wie das Gemeinde-Widget,
// damit Land und Kommune visuell einheitlich sind.

// Anteil in Prozent (Chart-Konvention: ab 10 % runden, darunter 1 Stelle).
function fmtPct(share: number): string {
  const s =
    share >= 9.95
      ? Math.round(share).toLocaleString("de-DE")
      : share.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${s} %`;
}

export default function RegionAnlagentypWidget({
  name,
  segments,
  liveUrl,
  onsite = false,
  share = true,
  showEmbed = true,
  branding = true,
}: {
  name: string;
  segments: AnlagentypSegment[];
  liveUrl: string;
  /** First-party embed auf einer eigenen Seite: Quelle erst beim Überfahren,
   *  keine Markenzeile (die Seite trägt beides). */
  onsite?: boolean;
  /** Aktionsleiste zeigen (Einbettende können sie über share=0 abwählen). */
  share?: boolean;
  showEmbed?: boolean;
  branding?: boolean;
}) {
  const rows = segments.filter((t) => t.kwp > 0).sort((a, b) => b.kwp - a.kwp);
  const total = rows.reduce((s, t) => s + t.kwp, 0);
  // Reine Photovoltaik-Nennleistung — also kWp/MWp/GWp aus der einen Quelle,
  // nicht kW: die Zahl ist Peak-Leistung, keine Momentanleistung. Zahl und
  // Einheit getrennt, weil der Wert hier groß in der Donut-Mitte steht.
  const { value: totalValue, unit } = pvLeistungTeile(total);

  const widget = widgetForPlace(WIDGETS.regionAnlagentyp, name, liveUrl);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return (
    <GemeindeWidgetShell
      widget={widget}
      subline="Installierte Leistung nach Anlagentyp — private Dächer, Gewerbe und Freifläche"
      filename={`solar-check-anlagentyp-${slug}.png`}
      onsite={onsite}
      share={share}
      showEmbed={showEmbed}
      branding={branding}
    >
      {rows.length === 0 ? (
        <p style={S.empty}>Für {name} ist kein Anlagenbestand erfasst.</p>
      ) : (
        <>
        <div style={S.split}>
          <DonutChart
            segments={rows.map((t) => ({ key: t.key, label: t.label, color: t.color, value: t.kwp }))}
            size={170}
          >
            <div style={S.center}>
              <div style={S.centerValue}>{totalValue}</div>
              <div style={S.centerUnit}>{unit}</div>
            </div>
          </DonutChart>

          <div style={S.legend}>
            {rows.map((t) => (
              <div key={t.key} style={S.legItem}>
                <span style={{ ...S.dot, background: t.color }} />
                <span style={S.legLabel}>{t.label}</span>
                <span style={S.legVal}>{fmtPct((t.kwp / total) * 100)}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Der Wert in der Mitte ist die Summe DIESER drei Typen — nicht der
            gesamte Solarbestand. Balkonkraftwerke und Anlagen ohne Typ-Zuordnung
            fehlen darin (deshalb liegt die Zahl leicht unter der Landes-Leistung
            weiter unten auf der Seite). Weggelassenes gehört sichtbar an die
            Zahl, nicht in einen Code-Kommentar. */}
        <p style={S.note}>
          Summe dieser drei Anlagentypen. Balkonkraftwerke und Anlagen ohne Typ-Zuordnung
          sind nicht mitgezählt.
        </p>
        </>
      )}
    </GemeindeWidgetShell>
  );
}

const S: Record<string, React.CSSProperties> = {
  empty: { fontSize: 13, color: v("--color-text-muted"), textAlign: "center" },
  split: { display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", justifyContent: "center" },
  center: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  centerValue: { fontFamily: v("--font-mono"), fontSize: 30, fontWeight: 700, color: v("--color-text-primary"), lineHeight: 1 },
  centerUnit: { fontSize: 13, color: v("--color-text-secondary"), marginTop: 4, letterSpacing: 0.5 },
  legend: { display: "flex", flexDirection: "column", gap: 8 },
  legItem: { display: "flex", alignItems: "center", gap: 8, fontSize: 13 },
  dot: { width: 10, height: 10, borderRadius: 3, flex: "0 0 auto" },
  legLabel: { color: v("--color-text-primary") },
  legVal: { fontFamily: v("--font-mono"), fontSize: 12, color: v("--color-text-secondary") },
  note: { fontSize: 11.5, color: v("--color-text-muted"), lineHeight: 1.5, margin: "14px 0 0", textAlign: "center" },
};
