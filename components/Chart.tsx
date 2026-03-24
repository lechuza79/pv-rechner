"use client";
import { YEAR, YEARS } from "../lib/constants";
import { v } from "../lib/theme";

export default function Chart({ scenarios, kosten }: { scenarios: { id: string; color: string; data: { years: { i: number; kum: number }[]; be: { i: number; kum: number } | undefined } }[]; kosten: number }) {
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
          <text x={P.l - 8} y={y(val)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{(val / 1000).toFixed(0)}k</text>
        </g>
      ))}
      {[0, 5, 10, 15, 20, 25].map(i => (
        <text key={i} x={x(i)} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{YEAR + i}</text>
      ))}
      {scenarios.map(s => {
        const pts = s.data.years.map((yr, i) => `${x(i)},${y(yr.kum)}`).join(" ");
        return (
          <g key={s.id}>
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" opacity={s.id === "realistic" ? 1 : 0.45} />
            {s.data.be && (
              <>
                <circle cx={x(s.data.be.i)} cy={y(s.data.be.kum)} r={4.5} fill={s.color} stroke="var(--color-bg-hero)" strokeWidth={2} />
                <text x={x(s.data.be.i)} y={y(s.data.be.kum) - 11} textAnchor="middle" fontSize={11} fontWeight="700" fill={s.color} fontFamily="var(--font-mono)">{s.data.be.i}J</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
