// Heizkosten-Vergleich je kWh WÄRME: Gas (mit GModG-Grüngasquote) vs. Wärmepumpe
// vs. Wärmepumpe mit PV. Ehrliche Vergleichsbasis — JAZ und Kesselwirkungsgrad sind
// eingerechnet (Daten: heatCostComparisonSeries, lib/greengas.ts). Reines SVG im
// Stil von HeatPumpChart, ohne externe Chart-Library. Geteilt: Rechner + Embed.
import type { HeatCostPoint } from "../../lib/greengas";

const fmtCt = (v: number) => `${(Math.round(v * 10) / 10).toLocaleString("de-DE")} ct`;

// Netter Achsen-Schritt (1/2/5 × 10ⁿ) für ~5 Ticks — funktioniert für ct/kWh
// (yMax ~25) genauso wie für €/Jahr (yMax ~2500).
function niceStep(max: number): number {
  const raw = max / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
}

export default function HeatCostCompareChart({
  data,
  pvCoveragePct,
  fmt = fmtCt,
  unit = "ct/kWh",
  ariaLabel = "Heizkosten je Kilowattstunde Wärme: Gasheizung mit Grüngas-Pflicht gegen Wärmepumpe",
}: {
  data: HeatCostPoint[];
  /** Prozent des WP-Stroms, den die PV in der WP+PV-Linie deckt (nur fürs Label). */
  pvCoveragePct?: number;
  /** Formatter für End-Labels (default ct/kWh). Für €/Jahr eigenen übergeben. */
  fmt?: (v: number) => string;
  /** Einheit oben an der Y-Achse (default „ct/kWh"). */
  unit?: string;
  ariaLabel?: string;
}) {
  if (data.length === 0) return null;
  const W = 640, H = 300;
  const P = { t: 20, r: 128, b: 34, l: 44 };
  const cW = W - P.l - P.r, cH = H - P.t - P.b;
  const n = data.length;
  const startYear = data[0].year;
  const endYear = data[n - 1].year;
  const hasPv = data.some(d => d.wpPv !== null);

  const allV = data.flatMap(d => [d.gas, d.wp, ...(d.wpPv !== null ? [d.wpPv] : [])]);
  const step = niceStep(Math.max(...allV));
  const yMax = Math.ceil(Math.max(...allV) / step) * step;
  const x = (i: number) => P.l + (i / (n - 1)) * cW;
  const y = (v: number) => P.t + cH - (v / yMax) * cH;

  const yTicks: number[] = [];
  for (let val = 0; val <= yMax; val += step) yTicks.push(val);
  const xYears = [startYear, startYear + Math.round((endYear - startYear) / 2), endYear];

  // Farben bewusst neutral statt wertend: Gas in der invertierten Textfarbe (weiß
  // auf Dunkel, dunkel auf Hell), Wärmepumpe in zwei Blautönen (dunkel = Netzstrom,
  // hell = mit PV).
  const series = [
    { key: "gas" as const, color: "var(--color-text-primary)", label: "Gasheizung", labelSub: "mit Grüngas-Pflicht" },
    { key: "wp" as const, color: "var(--color-accent)", label: "Wärmepumpe", labelSub: "Netzstrom" },
    ...(hasPv
      ? [{ key: "wpPv" as const, color: "var(--color-accent-light)", label: "Wärmepumpe + PV", labelSub: pvCoveragePct ? `${pvCoveragePct} % solar` : "mit Solarstrom" }]
      : []),
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
      aria-label={ariaLabel}>
      {/* Y-Grid + Labels */}
      {yTicks.map(val => (
        <g key={val}>
          <line x1={P.l} x2={P.l + cW} y1={y(val)} y2={y(val)} stroke="var(--color-chart-grid)" strokeWidth={0.5} />
          <text x={P.l - 8} y={y(val)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{val.toLocaleString("de-DE")}</text>
        </g>
      ))}
      <text x={P.l - 8} y={P.t - 8} textAnchor="end" fontSize={9.5} fill="var(--color-text-faint)">{unit}</text>
      {/* X-Labels */}
      {xYears.map(yr => {
        const i = yr - startYear;
        return <text key={yr} x={x(i)} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{yr}</text>;
      })}
      {/* Polylinien */}
      {series.map(s => {
        const pts = data
          .filter(d => d[s.key] !== null)
          .map(d => `${x(d.year - startYear)},${y(d[s.key] as number)}`)
          .join(" ");
        return <polyline key={s.key} points={pts} fill="none" stroke={s.color} strokeWidth={s.key === "gas" ? 3 : 2.5} strokeLinejoin="round" strokeLinecap="round" />;
      })}
      {/* End-Punkte + Labels mit Kollisionsvermeidung: liegen zwei Linienenden zu nah
          (WP und WP+PV bei ähnlichen Wärmekosten), wird das untere Label nach unten
          verschoben. Der Punkt bleibt an der Linie; eine kurze Leitlinie führt hin. */}
      {(() => {
        const MINGAP = 34;
        const lx = x(n - 1);
        const ends = series.map(s => {
          const last = data[n - 1][s.key] as number;
          return { key: s.key, color: s.color, label: s.label, labelSub: s.labelSub, last, cy: y(last), ly: 0 };
        });
        let prev = -Infinity;
        for (const e of [...ends].sort((a, b) => a.cy - b.cy)) {
          e.ly = Math.max(e.cy, prev + MINGAP);
          prev = e.ly;
        }
        return ends.map(e => (
          <g key={e.key}>
            <circle cx={lx} cy={e.cy} r={3.5} fill={e.color} stroke="var(--color-bg)" strokeWidth={1.5} />
            {Math.abs(e.ly - e.cy) > 2 && <line x1={lx + 3.5} y1={e.cy} x2={lx + 8} y2={e.ly - 4} stroke={e.color} strokeWidth={1} opacity={0.5} />}
            <text x={lx + 10} y={e.ly - 4} fontSize={11.5} fontWeight={700} fill={e.color} fontFamily="var(--font-mono)">{fmt(e.last)}</text>
            <text x={lx + 10} y={e.ly + 8} fontSize={9.5} fill="var(--color-text-secondary)">{e.label}</text>
            <text x={lx + 10} y={e.ly + 19} fontSize={8.5} fill="var(--color-text-faint)">{e.labelSub}</text>
          </g>
        ));
      })()}
    </svg>
  );
}
