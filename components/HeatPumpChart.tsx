"use client";
import { YEAR } from "../lib/constants";

interface ScenarioData {
  id: string;
  color: string;
  years: { i: number; kum: number }[];
  amortisationsJahre: number | null;
}

export default function HeatPumpChart({ scenarios, horizon }: { scenarios: ScenarioData[]; horizon: number }) {
  const W = 640, H = 280;
  const P = { t: 24, r: 16, b: 32, l: 52 };
  const cW = W - P.l - P.r, cH = H - P.t - P.b;
  const allV = scenarios.flatMap(s => s.years.map(y => y.kum));
  const yMin = Math.floor(Math.min(...allV, 0) / 5000) * 5000;
  const yMax = Math.ceil(Math.max(...allV, 0) / 5000) * 5000;
  const yR = yMax - yMin || 1;
  const x = (i: number) => P.l + (i / horizon) * cW;
  const y = (v: number) => P.t + cH - ((v - yMin) / yR) * cH;
  const tStep = yR <= 30000 ? 5000 : yR <= 60000 ? 10000 : 20000;
  const yTicks: number[] = [];
  for (let val = yMin; val <= yMax; val += tStep) yTicks.push(val);
  const xTicks = [0, Math.round(horizon / 4), Math.round(horizon / 2), Math.round(3 * horizon / 4), horizon];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <rect x={P.l} y={y(yMax)} width={cW} height={y(0) - y(yMax)} fill="var(--color-chart-positive-bg)" />
      <rect x={P.l} y={y(0)} width={cW} height={y(yMin) - y(0)} fill="var(--color-chart-negative-bg)" />
      {yTicks.map(val => (
        <g key={val}>
          <line x1={P.l} x2={W - P.r} y1={y(val)} y2={y(val)} stroke={val === 0 ? "var(--color-chart-zero)" : "var(--color-chart-grid)"} strokeWidth={val === 0 ? 1.5 : 0.5} />
          <text x={P.l - 8} y={y(val)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{(val / 1000).toFixed(0)}k</text>
        </g>
      ))}
      {xTicks.map(i => (
        <text key={i} x={x(i)} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{YEAR + i}</text>
      ))}
      {scenarios.map(s => {
        const pts = s.years.map(yr => `${x(yr.i)},${y(yr.kum)}`).join(" ");
        const be = s.amortisationsJahre !== null ? s.years.find(yr => yr.i === s.amortisationsJahre) : null;
        return (
          <g key={s.id}>
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" opacity={s.id === "realistic" ? 1 : 0.45} />
            {be && (
              <>
                <circle cx={x(be.i)} cy={y(be.kum)} r={4.5} fill={s.color} stroke="var(--color-bg)" strokeWidth={2} />
                <text x={x(be.i)} y={y(be.kum) - 11} textAnchor="middle" fontSize={11} fontWeight="700" fill={s.color} fontFamily="var(--font-mono)">{be.i}J</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
