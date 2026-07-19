"use client";

import { v } from "../lib/theme";
import DonutChart from "./charts/DonutChart";
import GemeindeWidgetShell from "./atlas/GemeindeWidgetShell";
import { DATA_SOURCES } from "../lib/data-sources";

// Einbettbares Widget: installierte Solarleistung nach ANLAGENTYP (private
// Dächer / Gewerbe-Dächer / Freifläche) je Bundesland — echte MaStR-Daten, kein
// Modell. Bewusst NICHT der Erneuerbaren-Technologie-Mix wie in der Gemeinde-
// Variante: auf der PV-Förderseite ist die Bauform (Dach vs. Freifläche) die
// relevante Differenzierung. Gleiche Shell + Donut wie das Gemeinde-Widget,
// damit Land und Kommune visuell einheitlich sind.

export type AnlagentypSegment = { key: string; label: string; color: string; kwp: number };

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");
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
  showSource = true,
  showEmbed = true,
  branding = false,
}: {
  name: string;
  segments: AnlagentypSegment[];
  liveUrl: string;
  showSource?: boolean;
  showEmbed?: boolean;
  branding?: boolean;
}) {
  const rows = segments.filter((t) => t.kwp > 0).sort((a, b) => b.kwp - a.kwp);
  const total = rows.reduce((s, t) => s + t.kwp, 0);
  const totalMW = total >= 1000;
  const totalGW = total >= 1_000_000;
  const totalValue = totalGW
    ? (total / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })
    : totalMW
      ? (total / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })
      : nf(total);
  const unit = totalGW ? "GW" : totalMW ? "MW" : "kW";

  const shareText = `Solarleistung in ${name} nach Anlagentyp: ${totalValue} ${unit} installiert – Solar Check`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return (
    <GemeindeWidgetShell
      title={`Installierte Leistung nach Anlagentyp`}
      subline={`Solaranlagen in ${name} — private Dächer, Gewerbe und Freifläche`}
      sources={DATA_SOURCES.mastr}
      shareText={shareText}
      shareUrl={liveUrl}
      filename={`solar-check-anlagentyp-${slug}.png`}
      embedHash="gemeinde-erneuerbare"
      showSource={showSource}
      showEmbed={showEmbed}
      branding={branding}
    >
      {rows.length === 0 ? (
        <p style={S.empty}>Für {name} ist kein Anlagenbestand erfasst.</p>
      ) : (
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
};
