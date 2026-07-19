"use client";

import { v } from "../../lib/theme";
import DonutChart from "../charts/DonutChart";
import GemeindeWidgetShell from "./GemeindeWidgetShell";
import { DATA_SOURCES } from "../../lib/data-sources";

// Einbettbares Widget: installierte erneuerbare Leistung nach Technologie je
// Gemeinde (echte MaStR-Daten, kein Modell). Donut in unseren Blau-Shades;
// Speicher separat (kWh-Kapazität, andere Einheit). Steht in der geteilten
// Widget-Hülle — auf der Atlas-Seite UND unter /embed/gemeinde-erneuerbare.

type Gen = { count: number; kwp: number };

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");
function fmtKwh(kwh: number): string {
  if (kwh >= 1000) return `${(kwh / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MWh`;
  return `${nf(kwh)} kWh`;
}
// Anteil am Mix in Prozent (Chart-Konvention: ab 10 % runden, darunter 1 Stelle).
function fmtPct(share: number): string {
  const s =
    share >= 9.95
      ? Math.round(share).toLocaleString("de-DE")
      : share.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${s} %`;
}

// Unsere Blau-Shades (dunkel → hell), fest je Technologie.
const TECH: { key: string; label: string; color: string }[] = [
  { key: "solar", label: "Solar", color: "#1365EA" },
  { key: "wind", label: "Wind", color: "#073C93" },
  { key: "biomasse", label: "Biomasse", color: "#6A9EF2" },
  { key: "wasser", label: "Wasserkraft", color: "#BCD6FF" },
];

export default function GemeindeErneuerbareWidget({
  name,
  solarKwp,
  generators,
  speicherKwh,
  liveUrl,
  showSource = true,
  showEmbed = true,
  branding = false,
}: {
  name: string;
  solarKwp: number;
  generators: { wind: Gen; biomasse: Gen; wasser: Gen };
  speicherKwh: number;
  liveUrl: string;
  /** Web-Quellenzeile zeigen. Embed: an. Atlas-Seite: aus (globaler Seitenfuß). */
  showSource?: boolean;
  showEmbed?: boolean;
  branding?: boolean;
}) {
  const kwpOf = (key: string): number =>
    key === "solar"
      ? solarKwp
      : key === "wind"
        ? generators.wind.kwp
        : key === "biomasse"
          ? generators.biomasse.kwp
          : generators.wasser.kwp;

  const rows = TECH.map((t) => ({ ...t, kwp: kwpOf(t.key) }))
    .filter((t) => t.kwp > 0)
    .sort((a, b) => b.kwp - a.kwp);

  const total = rows.reduce((s, t) => s + t.kwp, 0);
  const totalMW = total >= 1000;
  const totalValue = totalMW ? (total / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 }) : nf(total);
  const unit = totalMW ? "MW" : "kW";

  const shareText = `Erneuerbare Leistung in ${name}: ${totalValue} ${unit} installiert – Solar Check`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return (
    <GemeindeWidgetShell
      title={`Erneuerbare Leistung in ${name}`}
      subline="Installierte Leistung nach Technologie"
      sources={DATA_SOURCES.mastr}
      shareText={shareText}
      shareUrl={liveUrl}
      filename={`solar-check-erneuerbare-${slug}.png`}
      embedHash="gemeinde-erneuerbare"
      showSource={showSource}
      showEmbed={showEmbed}
      branding={branding}
    >
      {rows.length === 0 ? (
        <p style={S.empty}>Für {name} sind keine Erneuerbaren-Anlagen erfasst.</p>
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

          {speicherKwh > 0 && (
            <p style={S.note}>
              Dazu <strong style={S.strong}>{fmtKwh(speicherKwh)}</strong> Batteriespeicher-Kapazität.
            </p>
          )}
        </>
      )}
    </GemeindeWidgetShell>
  );
}

const S: Record<string, React.CSSProperties> = {
  strong: { color: v("--color-text-primary"), fontWeight: 600 },
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
  note: { fontSize: 12, color: v("--color-text-secondary"), lineHeight: 1.5, margin: "16px 0 0" },
};
