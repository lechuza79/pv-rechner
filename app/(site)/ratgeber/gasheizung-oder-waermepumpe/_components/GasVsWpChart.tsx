"use client";

import { useState } from "react";
import type { HeatCostPoint } from "../../../../../lib/greengas";
import InfoTooltip from "../../../../../components/InfoTooltip";
import ChartActionBar from "../../../../../components/ChartActionBar";
import { useChartExport } from "../../../../../lib/useChartExport";
import { v } from "../../../../../lib/theme";

// Artikel-Chart „Gasheizung vs. Wärmepumpe" über 20 Jahre. Umschaltbar zwischen
// teilsaniertem und unsaniertem Muster-EFH (der unsanierte Fall widerlegt das
// verbreitete „im Altbau geht keine Wärmepumpe"). Links die Jahreskosten-Linien
// mit Hover-Werten, rechts die 20-Jahre-Summen als Balken — beide teilen eine
// gemeinsame Nulllinie. Farben neutral: Gas invers (weiß/dunkel), Wärmepumpe in
// zwei Blautönen. Zahlen kommen serverseitig aus den geteilten Rechenfunktionen.

export interface MusterVariant {
  key: string;
  label: string;
  sub: string;
  series: HeatCostPoint[];
  totals: { gas: number; wp: number; wpPv: number };
}

type Key = "gas" | "wp" | "wpPv";
const SERIES: { key: Key; color: string; label: string; short: string }[] = [
  { key: "gas", color: "var(--color-text-primary)", label: "Gasheizung", short: "Gas" },
  { key: "wp", color: "var(--color-accent)", label: "Wärmepumpe", short: "WP" },
  { key: "wpPv", color: "var(--color-accent-light)", label: "Wärmepumpe + PV", short: "WP+PV" },
];

const eur = (n: number) => `${Math.round(n).toLocaleString("de-DE")} €`;
const eurK = (n: number) => `${Math.round(n / 1000).toLocaleString("de-DE")}.000 €`;

function niceMax(max: number): number {
  const step = Math.pow(10, Math.floor(Math.log10(max / 4)));
  const s = (max / 4 / step <= 2 ? 2 : max / 4 / step <= 5 ? 5 : 10) * step;
  return Math.ceil(max / s) * s;
}

const SHARE_URL = "https://solar-check.io/gasheizung-oder-waermepumpe";

export default function GasVsWpChart({
  variants,
  pvCoveragePct,
}: {
  variants: MusterVariant[];
  pvCoveragePct: number;
}) {
  const [active, setActive] = useState(0);
  const [hoverLine, setHoverLine] = useState<number | null>(null);
  const [hoverBar, setHoverBar] = useState<Key | null>(null);
  const m = variants[active];
  const ersparnis = m.totals.gas - m.totals.wpPv;
  const legend = SERIES.map(s => (s.key === "wpPv" ? { ...s, note: `${pvCoveragePct} % solar` } : s.key === "wp" ? { ...s, note: "Netzstrom" } : { ...s, note: "mit Grüngas-Pflicht" }));

  const { chartRef, downloadPng, sharePng, shareWhatsApp, shareTwitter, isExporting, canNativeShare } = useChartExport({
    context: { title: `Gasheizung vs. Wärmepumpe — ${m.label}` },
    filename: "gasheizung-vs-waermepumpe-20-jahre",
    shareText: "Gasheizung oder Wärmepumpe? Die Rechnung über 20 Jahre – Solar Check",
    shareUrl: SHARE_URL,
    mode: "node",
  });

  // ── Gemeinsames SVG: Linien links, Balken rechts, geteilte Nulllinie ──
  const W = 640, H = 280, P = { t: 14, r: 14, b: 26, l: 46 };
  const cH = H - P.t - P.b;
  const y0 = P.t + cH; // Nulllinie — für Linien UND Balken
  const linienW = 348;
  const pts = m.series;
  const n = pts.length;
  const startYear = pts[0].year, endYear = pts[n - 1].year;
  const yMax = niceMax(Math.max(...pts.map(p => p.gas)));
  const xL = (i: number) => P.l + (i / (n - 1)) * linienW;
  const yL = (val: number) => y0 - (val / yMax) * cH;
  const yTicks: number[] = [];
  for (let val = 0; val <= yMax; val += yMax / 4) yTicks.push(val);
  const xYears = [startYear, Math.round((startYear + endYear) / 2), endYear];

  // Balken (rechts): nutzen den unteren Teil, oben bleibt Platz für die Ersparnis.
  const barX0 = P.l + linienW + 40;
  const barZoneW = W - P.r - barX0;
  const barMax = m.totals.gas;
  const barTop = P.t + cH * 0.46; // Balken beginnen erst hier → oben Raum
  const barMaxH = y0 - barTop;
  const barW = 26; // schmal
  const slot = barZoneW / SERIES.length;
  const bx = (j: number) => barX0 + j * slot + (slot - barW) / 2;
  const barH = (val: number) => Math.max(3, (val / barMax) * barMaxH);

  return (
    <div ref={chartRef} style={{ background: v("--color-bg"), border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-lg"), padding: "16px 16px 14px", marginBottom: 16 }}>
      {/* Kopf */}
      <div style={{ fontSize: 15, fontWeight: 700, color: v("--color-text-primary"), marginBottom: 2 }}>Die Rechnung über 20 Jahre</div>
      <div style={{ fontSize: 12.5, color: v("--color-text-muted"), lineHeight: 1.5, marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        So entwickeln sich die jährlichen Heizkosten für ein typisches Einfamilienhaus
        <InfoTooltip title="Das Muster-Haus" ariaLabel="Angaben zum Muster-Haus">{m.sub}</InfoTooltip>
      </div>

      {/* Umschalter */}
      <div data-sc-export-ignore style={{ display: "flex", borderRadius: v("--radius-md"), border: `1px solid ${v("--color-border")}`, overflow: "hidden", marginBottom: 8 }} role="tablist" aria-label="Gebäudestand">
        {variants.map((vr, i) => {
          const on = i === active;
          return (
            <button key={vr.key} role="tab" aria-selected={on} onClick={() => setActive(i)}
              style={{ flex: 1, padding: "8px 6px", cursor: "pointer", textAlign: "center", background: on ? v("--color-accent-dim") : "transparent", border: "none", borderBottom: `2px solid ${on ? v("--color-accent") : "transparent"}` }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: on ? v("--color-accent") : v("--color-text-muted") }}>{vr.label}</div>
            </button>
          );
        })}
      </div>
      {active === 1 && (
        <div style={{ fontSize: 11.5, color: v("--color-text-secondary"), lineHeight: 1.5, marginBottom: 8, padding: "0 2px" }}>
          Auch im unsanierten Altbau — wo viele die Wärmepumpe für unmöglich halten — bleibt sie über 20 Jahre günstiger, trotz ehrlich schlechterer Arbeitszahl.
        </div>
      )}

      {/* Chart */}
      <div style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
          aria-label={`Jährliche Heizkosten und 20-Jahre-Summen ${m.label}: Gasheizung steigt, Wärmepumpe bleibt günstig`}
          onMouseLeave={() => { setHoverLine(null); setHoverBar(null); }}>
          {/* Y-Grid + Labels (Linien) */}
          {yTicks.map(val => (
            <g key={val}>
              <line x1={P.l} x2={P.l + linienW} y1={yL(val)} y2={yL(val)} stroke="var(--color-chart-grid)" strokeWidth={0.5} />
              <text x={P.l - 8} y={yL(val)} textAnchor="end" dominantBaseline="middle" fontSize={9.5} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{val >= 1000 ? `${Math.round(val / 1000)}k` : val}</text>
            </g>
          ))}
          <text x={P.l - 8} y={P.t - 4} textAnchor="end" fontSize={9} fill="var(--color-text-faint)">€/Jahr</text>
          {xYears.map(yr => <text key={yr} x={xL(yr - startYear)} y={H - 4} textAnchor="middle" fontSize={9.5} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{yr}</text>)}

          {/* gemeinsame Nulllinie */}
          <line x1={P.l} x2={W - P.r} y1={y0} y2={y0} stroke="var(--color-chart-zero)" strokeWidth={1} />

          {/* Linien */}
          {SERIES.map(s => (
            <polyline key={s.key} points={pts.map(p => `${xL(p.year - startYear)},${yL(p[s.key] as number)}`).join(" ")}
              fill="none" stroke={s.color} strokeWidth={s.key === "gas" ? 2.5 : 2} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {hoverLine !== null && (
            <g>
              <line x1={xL(hoverLine)} x2={xL(hoverLine)} y1={P.t} y2={y0} stroke="var(--color-border)" strokeWidth={1} />
              {SERIES.map(s => <circle key={s.key} cx={xL(hoverLine)} cy={yL(pts[hoverLine][s.key] as number)} r={3.5} fill={s.color} stroke="var(--color-bg)" strokeWidth={1.5} />)}
            </g>
          )}
          {pts.map((_, i) => (
            <rect key={i} x={i === 0 ? P.l : xL(i) - linienW / (n - 1) / 2} y={P.t} width={linienW / (n - 1)} height={cH} fill="transparent" onMouseEnter={() => setHoverLine(i)} />
          ))}

          {/* Ersparnis (SVG-Text, oben im Balken-Bereich) */}
          <text x={barX0} y={P.t + 12} fontSize={9.5} fill="var(--color-text-secondary)" letterSpacing="0.4">ERSPARNIS 20 JAHRE</text>
          <text x={barX0} y={P.t + 36} fontSize={22} fontWeight={800} fill="var(--color-positive)" fontFamily="var(--font-mono)">{eurK(ersparnis)}</text>
          <line x1={barX0} x2={W - P.r} y1={P.t + 48} y2={P.t + 48} stroke="var(--color-border)" strokeWidth={0.5} />
          <text x={barX0} y={P.t + 62} fontSize={9.5} fill="var(--color-text-muted)" letterSpacing="0.4">GESAMTKOSTEN</text>

          {/* Balken */}
          {SERIES.map((s, j) => {
            const val = m.totals[s.key];
            const h = barH(val);
            const on = hoverBar === s.key;
            return (
              <g key={s.key} onMouseEnter={() => setHoverBar(s.key)} onMouseLeave={() => setHoverBar(null)}>
                <rect x={bx(j)} y={y0 - h} width={barW} height={h} rx={2} fill={s.color} opacity={hoverBar && !on ? 0.5 : 1} />
                {/* Wert + Label nur bei Hover */}
                {on && (
                  <>
                    <text x={bx(j) + barW / 2} y={y0 - h - 5} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={s.color} fontFamily="var(--font-mono)">{eurK(val)}</text>
                    <text x={bx(j) + barW / 2} y={y0 + 13} textAnchor="middle" fontSize={9.5} fill="var(--color-text-secondary)">{s.short}</text>
                  </>
                )}
                {/* unsichtbare, breitere Hover-Zone */}
                <rect x={barX0 + j * slot} y={barTop} width={slot} height={y0 - barTop + 16} fill="transparent" onMouseEnter={() => setHoverBar(s.key)} />
              </g>
            );
          })}
        </svg>

        {/* Hover-Tooltip für die Linien */}
        {hoverLine !== null && (
          <div style={{ position: "absolute", left: `${(xL(hoverLine) / W) * 100}%`, top: 0, transform: `translateX(${hoverLine > n / 2 ? "-105%" : "5%"})`, background: v("--color-bg"), border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-md"), padding: "7px 9px", pointerEvents: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.12)", zIndex: 2, minWidth: 138 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: v("--color-text-primary"), marginBottom: 4, fontFamily: v("--font-mono") }}>{pts[hoverLine].year}</div>
            {SERIES.map(s => (
              <div key={s.key} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11, marginTop: 2 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: v("--color-text-secondary") }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />{s.label}
                </span>
                <span style={{ fontFamily: v("--font-mono"), fontWeight: 700, color: v("--color-text-primary") }}>{eur(pts[hoverLine][s.key] as number)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legende (unter dem Chart) */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16, marginTop: 12, fontSize: 11.5 }}>
        {legend.map(s => (
          <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: v("--color-text-secondary") }}>
            <span style={{ width: 11, height: 3, borderRadius: 2, background: s.color }} /> {s.label}
            <span style={{ color: v("--color-text-faint") }}>· {s.note}</span>
          </span>
        ))}
      </div>

      {/* CTA */}
      <a data-sc-export-ignore href="/waermepumpe-rechner" style={{ display: "block", textAlign: "center", marginTop: 14, padding: "9px 14px", borderRadius: v("--radius-md"), background: v("--color-accent"), color: v("--color-text-on-accent"), fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
        Für dein Haus durchrechnen →
      </a>

      {/* Quelle + Aktionsleiste */}
      <div data-sc-export-ignore style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10.5, color: v("--color-text-faint") }}>Preispfade nach IW-Report 36/2026 · ohne Gewähr</span>
        <ChartActionBar
          variant="bar"
          showDownload
          size={28}
          onDownload={downloadPng}
          onCopyLink={() => navigator.clipboard?.writeText(SHARE_URL).catch(() => {})}
          onShareImage={canNativeShare ? sharePng : undefined}
          onWhatsApp={shareWhatsApp}
          onTwitter={shareTwitter}
          isExporting={isExporting}
          canNativeShare={canNativeShare}
        />
      </div>
    </div>
  );
}
