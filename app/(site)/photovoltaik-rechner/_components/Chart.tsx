"use client";
import { YEAR, YEARS } from "../../../../lib/constants";
import { fsPx } from "../../../../lib/theme";

/**
 * `dimOthers` steuert, wofür das Chart benutzt wird — und das sind zwei
 * verschiedene Dinge:
 *
 * `true` (Default, Rechner-Ergebnis): drei Strompreis-SZENARIEN derselben
 * Rechnung. Eines ist gewählt, die anderen zwei sind Kontext und treten zurück.
 *
 * `false` (Vergleich im Ratgeber): mehrere gleichrangige RECHNUNGEN
 * nebeneinander — heutige Vergütung, Entwurf ab 2027, eigene Annahme. Hier ist
 * der Vergleich der Inhalt; eine der Kurven blass zu zeichnen nimmt genau die
 * Aussage weg. Dann werden zusätzlich die Break-even-Marken gestaffelt, weil sie
 * bei ähnlichen Laufzeiten sonst übereinanderliegen.
 */
export default function Chart({ scenarios, kosten, highlightId = "realistic", dimOthers = true, startJahr = YEAR }: { startJahr?: number; scenarios: { id: string; color: string; data: { years: { i: number; kum: number }[]; be: { i: number; kum: number } | undefined } }[]; kosten: number; highlightId?: string; dimOthers?: boolean }) {
  const W = 640, H = 280;
  const P = { t: 24, r: 16, b: 32, l: 52 };
  const cW = W - P.l - P.r, cH = H - P.t - P.b;
  const allV = scenarios.flatMap(s => s.data.years.map(y => y.kum));
  const yMin = Math.floor(Math.min(...allV, -kosten) / 5000) * 5000;
  const yMax = Math.ceil(Math.max(...allV) / 5000) * 5000;
  const yR = yMax - yMin || 1;
  const x = (i: number) => P.l + (i / YEARS) * cW;
  const y = (v: number) => P.t + cH - ((v - yMin) / yR) * cH;
  const tStep = yR <= 30000 ? 5000 : yR <= 60000 ? 10000 : 20000;
  const yTicks = [];
  for (let val = yMin; val <= yMax; val += tStep) yTicks.push(val);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <rect x={P.l} y={y(yMax)} width={cW} height={y(0) - y(yMax)} fill="var(--color-chart-positive-bg)" />
      <rect x={P.l} y={y(0)} width={cW} height={y(yMin) - y(0)} fill="var(--color-chart-negative-bg)" />
      {yTicks.map(val => (
        <g key={val}>
          <line x1={P.l} x2={W - P.r} y1={y(val)} y2={y(val)} stroke={val === 0 ? "var(--color-chart-zero)" : "var(--color-chart-grid)"} strokeWidth={val === 0 ? 1.5 : 0.5} />
          <text x={P.l - 8} y={y(val)} textAnchor="end" dominantBaseline="middle" fontSize={fsPx("--font-size-micro")} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{(val / 1000).toFixed(0)}k</text>
        </g>
      ))}
      {[0, 5, 10, 15, 20, 25].map(i => (
        <text key={i} x={x(i)} y={H - 4} textAnchor="middle" fontSize={fsPx("--font-size-micro")} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{startJahr + i}</text>
      ))}
      {scenarios.map((s, si) => {
        const pts = s.data.years.map((yr, i) => `${x(i)},${y(yr.kum)}`).join(" ");
        const on = dimOthers ? s.id === highlightId : true;
        // Im Vergleichsmodus liegen die Break-even-Punkte oft nur ein bis zwei
        // Jahre auseinander — ohne Staffelung überdecken sich die Beschriftungen.
        const labelY = y(s.data.be?.kum ?? 0) - 11 - (dimOthers ? 0 : si * 13);
        return (
          <g key={s.id}>
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth={on ? 3 : 2} strokeLinejoin="round" opacity={on ? 1 : 0.35} />
            {s.data.be && (
              <>
                <circle cx={x(s.data.be.i)} cy={y(s.data.be.kum)} r={4.5} fill={s.color} stroke="var(--color-bg)" strokeWidth={2} />
                <text x={x(s.data.be.i)} y={labelY} textAnchor="middle" fontSize={fsPx("--font-size-caption")} fontWeight="700" fill={s.color} fontFamily="var(--font-mono)">{s.data.be.i}J</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
