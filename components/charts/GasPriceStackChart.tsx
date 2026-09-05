// Gas-Endkundenpreis unter dem GModG, gestapelt nach Preisbestandteilen (ct/kWh
// brutto) über die Zeit. Zeigt, WARUM Gas teurer wird: der beigemischte Biomethan-
// Block wächst mit der Bio-Treppe, Netzentgelt und CO₂ steigen zusätzlich. Daten:
// gasMixSeries (lib/greengas.ts). Reines SVG, geteilt: Rechner + Embed.
import type { GasMixYear } from "../../lib/greengas";
import { fsPx } from "../../lib/theme";

// Feste Kategorie-Farben (theme-invariant) — Energieträger-Tokens + semantisches Rot
// für den CO₂-Block. Reihenfolge = Stapelreihenfolge von unten nach oben.
const LAYERS: { key: keyof GasMixYear["components"]; label: string; color: string }[] = [
  { key: "erdgas", label: "Erdgas", color: "var(--color-energy-gas)" },
  { key: "biomethan", label: "Biomethan (Grüngas-Pflicht)", color: "var(--color-energy-solar)" },
  { key: "netz", label: "Netzentgelt", color: "var(--color-energy-other)" },
  { key: "steuer", label: "Steuer/Abgabe", color: "var(--color-energy-lignite)" },
  { key: "co2", label: "CO₂-Preis", color: "var(--color-negative)" },
];

export default function GasPriceStackChart({ data }: { data: GasMixYear[] }) {
  if (data.length === 0) return null;
  const W = 640, legendH = 44, H = 300 + legendH;
  const P = { t: 20, r: 52, b: 34, l: 44 };
  const cW = W - P.l - P.r, cH = H - legendH - P.t - P.b;
  const n = data.length;
  const startYear = data[0].year;
  const endYear = data[n - 1].year;

  const yMax = Math.ceil(Math.max(...data.map(d => d.totalCt)) / 5) * 5;
  const x = (i: number) => P.l + (i / (n - 1)) * cW;
  const y = (v: number) => P.t + cH - (v / yMax) * cH;

  const yTicks: number[] = [];
  for (let val = 0; val <= yMax; val += 5) yTicks.push(val);
  const xYears = [startYear, startYear + Math.round((endYear - startYear) / 2), endYear];

  // Kumulierte Unterkanten je Zeitpunkt für die Stapel-Flächen.
  const areaPath = (layerIdx: number) => {
    const lower: number[] = [];
    const upper: number[] = [];
    for (const d of data) {
      let cum = 0;
      for (let k = 0; k < layerIdx; k++) cum += d.components[LAYERS[k].key];
      lower.push(cum);
      upper.push(cum + d.components[LAYERS[layerIdx].key]);
    }
    const top = data.map((_, i) => `${x(i)},${y(upper[i])}`).join(" ");
    const bottom = data.map((_, i) => `${x(n - 1 - i)},${y(lower[n - 1 - i])}`).join(" ");
    return `M ${top} L ${bottom} Z`;
  };

  const totalLine = data.map((d, i) => `${x(i)},${y(d.totalCt)}`).join(" ");
  const lastTotal = data[n - 1].totalCt;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
      aria-label="Gas-Endkundenpreis nach Bestandteilen über die Jahre der Grüngas-Pflicht">
      {/* Y-Grid + Labels */}
      {yTicks.map(val => (
        <g key={val}>
          <line x1={P.l} x2={P.l + cW} y1={y(val)} y2={y(val)} stroke="var(--color-chart-grid)" strokeWidth={0.5} />
          <text x={P.l - 8} y={y(val)} textAnchor="end" dominantBaseline="middle" fontSize={fsPx("--font-size-micro")} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{val}</text>
        </g>
      ))}
      <text x={P.l - 8} y={P.t - 8} textAnchor="end" fontSize={fsPx("--font-size-micro")} fill="var(--color-text-faint)">ct/kWh</text>
      {/* Stapel-Flächen */}
      {LAYERS.map((l, idx) => (
        <path key={l.key} d={areaPath(idx)} fill={l.color} opacity={0.9} />
      ))}
      {/* Gesamtpreis-Linie */}
      <polyline points={totalLine} fill="none" stroke="var(--color-text-primary)" strokeWidth={2} strokeLinejoin="round" />
      <circle cx={x(n - 1)} cy={y(lastTotal)} r={3.5} fill="var(--color-text-primary)" stroke="var(--color-bg)" strokeWidth={1.5} />
      <text x={x(n - 1) + 6} y={y(lastTotal) - 4} fontSize={fsPx("--font-size-caption")} fontWeight={700} fill="var(--color-text-primary)" fontFamily="var(--font-mono)">
        {(Math.round(lastTotal * 10) / 10).toLocaleString("de-DE")}
      </text>
      {/* X-Labels */}
      {xYears.map(yr => (
        <text key={yr} x={x(yr - startYear)} y={H - legendH - 4} textAnchor="middle" fontSize={fsPx("--font-size-micro")} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{yr}</text>
      ))}
      {/* Legende (2 Reihen, im SVG damit sie im Export überlebt) */}
      {LAYERS.map((l, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const lx = P.l + col * 190;
        const ly = H - legendH + 14 + row * 18;
        return (
          <g key={l.key}>
            <rect x={lx} y={ly - 8} width={11} height={11} rx={2} fill={l.color} />
            <text x={lx + 16} y={ly} fontSize={fsPx("--font-size-micro")} fill="var(--color-text-secondary)">{l.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
