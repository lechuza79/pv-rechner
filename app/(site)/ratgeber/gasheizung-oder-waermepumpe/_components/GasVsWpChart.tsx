"use client";

import { useEffect, useState } from "react";
import type { HeatCostPoint } from "../../../../../lib/greengas";
import InfoTooltip from "../../../../../components/InfoTooltip";
import ChartActionBar from "../../../../../components/ChartActionBar";
import { useChartExport } from "../../../../../lib/useChartExport";
import { v } from "../../../../../lib/theme";

// Artikel-Chart „Gasheizung vs. Wärmepumpe" über 20 Jahre. Umschaltbar zwischen
// unsaniertem (Default, links — widerlegt „im Altbau geht keine Wärmepumpe") und
// teilsaniertem Muster-EFH. Links die Jahreskosten-Linien mit Hover-Werten,
// rechts die 20-Jahre-Summen als schmale Balken — beide teilen eine gemeinsame
// Nulllinie im selben SVG (skaliert sauber mit der Breite). Der rechte Text-Block
// (Ersparnis/Gesamtkosten mit Helptext) liegt als HTML-Overlay darüber, damit
// Design-Tokens und die „?"-Tooltips greifen. Farben neutral: Gas invers
// (weiß/dunkel), Wärmepumpe in zwei Blautönen. Zahlen kommen serverseitig aus den
// geteilten Rechenfunktionen.

export interface MusterVariant {
  key: string;
  label: string;
  sub: string;
  explain: string;
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
// DE-Konvention für Tausend: „T€" (Tausend Euro, wie TEUR) — nicht das englische „k".
// Die Beträge werden gestückelt gerendert (Zahl groß, Einheit klein/grau, amtHtml).
// Y-Achse (jährliche €-Beträge): akkurat, ohne verlustbehaftetes k-Runden.
const axisEur = (n: number) => n.toLocaleString("de-DE");

function niceMax(max: number): number {
  const step = Math.pow(10, Math.floor(Math.log10(max / 4)));
  const s = (max / 4 / step <= 2 ? 2 : max / 4 / step <= 5 ? 5 : 10) * step;
  return Math.ceil(max / s) * s;
}

const SHARE_URL = "https://solar-check.io/ratgeber/gasheizung-oder-waermepumpe";
const SOURCE = "Preispfade nach IW-Report 36/2026 · ohne Gewähr";

export default function GasVsWpChart({
  variants,
  pvCoveragePct,
}: {
  variants: MusterVariant[];
  pvCoveragePct: number;
}) {
  const [active, setActive] = useState(0);
  const [hoverLine, setHoverLine] = useState<number | null>(null);
  // Schmale Screens: der Bilanz-Block wandert unter das Chart (statt daneben),
  // die Balken bekommen die volle Höhe. Side-by-side scheitert bei ~375 px
  // Spaltenbreite (Textstreifen zu schmal → Umbrüche). SSR rendert breit.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width:560px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const m = variants[active];
  const ersparnis = m.totals.gas - m.totals.wpPv;

  const { chartRef, downloadPng, sharePng, shareWhatsApp, shareTwitter, isExporting, canNativeShare } = useChartExport({
    context: { title: `Gasheizung vs. Wärmepumpe — ${m.label}` },
    filename: "gasheizung-vs-waermepumpe-20-jahre",
    shareText: "Gasheizung oder Wärmepumpe? Die Rechnung über 20 Jahre – Solar Check",
    shareUrl: SHARE_URL,
    mode: "node",
  });

  // ── SVG: breit = Linien links + Balken rechts (geteilte Nulllinie); schmal =
  //    nur Linien über die volle Breite (Balken stehen dann als horizontale
  //    Balken unter dem Chart, siehe unten). Die viewBox-Breite ist bewusst nah
  //    an der gerenderten Pixelbreite (breit ~600, schmal ~320) — sonst würde die
  //    Fläche stark herunterskaliert und Linien/Schrift wirkten dünn und winzig. ──
  const W = narrow ? 320 : 640, H = narrow ? 200 : 280, P = { t: 14, r: 14, b: 28, l: 44 };
  const cH = H - P.t - P.b;
  const y0 = P.t + cH; // Nulllinie
  const linienW = narrow ? W - P.l - P.r : 348;
  const pts = m.series;
  const n = pts.length;
  const startYear = pts[0].year, endYear = pts[n - 1].year;
  const yMax = niceMax(Math.max(...pts.map(p => p.gas)));
  const xL = (i: number) => P.l + (i / (n - 1)) * linienW;
  const yL = (val: number) => y0 - (val / yMax) * cH;
  const yTicks: number[] = [];
  for (let val = 0; val <= yMax; val += yMax / 4) yTicks.push(val);
  const xYears = [startYear, Math.round((startYear + endYear) / 2), endYear];

  // Balken (nur breit): unterer Teil, oben Raum für den Bilanz-Block daneben.
  const barX0 = P.l + linienW + 40;
  const barMax = m.totals.gas;
  const barTop = P.t + cH * 0.52;
  const barMaxH = y0 - barTop;
  const barW = 13; // schmal
  const barZoneW = W - P.r - barX0;
  const slot = barZoneW / SERIES.length;
  const bx = (j: number) => barX0 + j * slot + (slot - barW) / 2;
  const barH = (val: number) => Math.max(3, (val / barMax) * barMaxH);

  const lblStyle: React.CSSProperties = { fontSize: v("--font-size-caption"), fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: v("--color-text-muted") };
  // Betrag mit kleiner, grauer Einheit (Zahl trägt, „T€" steht kleiner daneben).
  const amtHtml = (n: number, size: number, weight = 800) => (
    <span style={{ fontFamily: v("--font-mono"), color: v("--color-text-primary"), fontWeight: weight, whiteSpace: "nowrap" }}>
      <span style={{ fontSize: size }}>{Math.round(n / 1000).toLocaleString("de-DE")}</span>
      <span style={{ fontSize: Math.round(size * 0.62), color: v("--color-text-muted"), fontWeight: 700, marginLeft: 3 }}>T€</span>
    </span>
  );
  const plusBadge = (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 18, height: 18, padding: "0 4px", borderRadius: 6, border: `1px solid ${v("--color-positive")}`, background: `color-mix(in srgb, ${v("--color-positive")} 12%, transparent)`, color: v("--color-positive-text"), fontFamily: v("--font-mono"), fontSize: 14, fontWeight: 800, lineHeight: 1 }}>+</span>
  );
  const ersparnisTip = (
    <InfoTooltip title="Ersparnis über 20 Jahre" ariaLabel="Was bedeutet die Ersparnis?">
      Summe aller Heizkosten der Gasheizung minus der Wärmepumpe mit PV über 20 Jahre — inklusive Grüngas-Pflicht, steigender Strompreise und CO₂-Preis.
    </InfoTooltip>
  );
  const gesamtkostenTip = (
    <InfoTooltip title="Gesamtkosten über 20 Jahre" ariaLabel="Was bedeuten die Gesamtkosten?">
      Aufsummierte Heizkosten über 20 Jahre je Variante: Gasheizung, Wärmepumpe mit Netzstrom und Wärmepumpe mit rund {pvCoveragePct} % Solarstrom.
    </InfoTooltip>
  );
  // Bilanz-Block für die BREITE Ansicht (Overlay über der Balken-Zone).
  const bilanz = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={lblStyle}>Ersparnis 20 Jahre</span>
        <span style={{ pointerEvents: "auto" }}>{ersparnisTip}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
        {plusBadge}
        {amtHtml(ersparnis, 20)}
      </div>
      <div style={{ borderTop: `1px solid ${v("--color-border")}`, marginTop: 18, marginBottom: 8 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={lblStyle}>Gesamtkosten</span>
        <span style={{ pointerEvents: "auto" }}>{gesamtkostenTip}</span>
      </div>
    </>
  );

  return (
    <div ref={chartRef} style={{ position: "relative", background: v("--color-bg"), border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-lg"), padding: "16px 24px 14px 16px", marginBottom: 16 }}>
      {/* Kopf */}
      <div style={{ fontSize: 15, fontWeight: 700, color: v("--color-text-primary"), marginBottom: 2 }}>Die Rechnung über 20 Jahre</div>
      <div style={{ fontSize: 12.5, color: v("--color-text-muted"), lineHeight: 1.5, marginBottom: 12 }}>
        So entwickeln sich die jährlichen Heizkosten für ein typisches{" "}
        <span style={{ whiteSpace: "nowrap" }}>
          Einfamilienhaus{" "}
          <span style={{ verticalAlign: "middle" }}>
            <InfoTooltip title="Das Muster-Haus" ariaLabel="Angaben zum Muster-Haus">{m.sub}</InfoTooltip>
          </span>
        </span>
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
      <div style={{ fontSize: 11.5, color: v("--color-text-secondary"), lineHeight: 1.5, marginBottom: 8, padding: "0 2px" }}>
        {m.explain}
      </div>

      {/* Chart */}
      <div style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
          aria-label={`Jährliche Heizkosten und 20-Jahre-Summen ${m.label}: Gasheizung steigt, Wärmepumpe bleibt günstig`}
          onMouseLeave={() => setHoverLine(null)}>
          {/* Y-Grid + Labels (Linien) */}
          {yTicks.map(val => (
            <g key={val}>
              <line x1={P.l} x2={P.l + linienW} y1={yL(val)} y2={yL(val)} stroke="var(--color-chart-grid)" strokeWidth={0.5} />
              <text x={P.l - 6} y={yL(val)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{axisEur(val)}</text>
            </g>
          ))}
          {/* X-Beschriftung (Jahre): eine Linie, gleiche Größe wie Heizart */}
          {xYears.map(yr => <text key={yr} x={xL(yr - startYear)} y={y0 + 18} textAnchor="middle" fontSize={12} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{yr}</text>)}

          {/* gemeinsame Nulllinie */}
          <line x1={P.l} x2={narrow ? P.l + linienW : W - P.r} y1={y0} y2={y0} stroke="var(--color-chart-zero)" strokeWidth={1} />

          {/* Linien */}
          {SERIES.map(s => (
            <polyline key={s.key} points={pts.map(p => `${xL(p.year - startYear)},${yL(p[s.key] as number)}`).join(" ")}
              fill="none" stroke={s.color} strokeWidth={s.key === "gas" ? 3 : 2.5} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {hoverLine !== null && (
            <g>
              <line x1={xL(hoverLine)} x2={xL(hoverLine)} y1={P.t} y2={y0} stroke="var(--color-border)" strokeWidth={1} />
              {SERIES.map(s => <circle key={s.key} cx={xL(hoverLine)} cy={yL(pts[hoverLine][s.key] as number)} r={3.5} fill={s.color} stroke="var(--color-bg)" strokeWidth={1.5} />)}
            </g>
          )}
          {pts.map((_, i) => (
            <rect key={i} x={i === 0 ? P.l : xL(i) - linienW / (n - 1) / 2} y={P.t} width={linienW / (n - 1)} height={cH}
              fill="transparent" tabIndex={0} role="button" aria-label={`Jahr ${pts[i].year}`}
              onMouseEnter={() => setHoverLine(i)} onPointerDown={() => setHoverLine(i)} onFocus={() => setHoverLine(i)} style={{ outline: "none", cursor: "pointer" }} />
          ))}

          {/* Balken + vertikaler Betrag — nur in der breiten Ansicht (schmal:
              horizontale Balken unter dem Chart). Heizart-Label auf derselben
              Linie und in derselben Größe wie die Jahreszahlen. */}
          {!narrow && SERIES.map((s, j) => {
            const val = m.totals[s.key];
            const h = barH(val);
            const lx = bx(j) - 7; // vertikaler Betrag links vom Balken
            return (
              <g key={s.key}>
                {/* grauer Track (volle Höhe = Referenz Gas-Gesamtkosten) */}
                <rect x={bx(j)} y={barTop} width={barW} height={barMaxH} rx={3} fill={`color-mix(in srgb, ${v("--color-text-muted")} 14%, transparent)`} />
                <rect x={bx(j)} y={y0 - h} width={barW} height={h} rx={3} fill={s.color} />
                <g transform={`translate(${lx}, ${y0 - 2}) rotate(-90)`}>
                  <text x={0} y={0} textAnchor="start" dominantBaseline="central" fontWeight={700} fill="var(--color-text-secondary)" fontFamily="var(--font-mono)">
                    <tspan style={{ fontSize: v("--font-size-caption") }}>{Math.round(val / 1000).toLocaleString("de-DE")}</tspan>
                    <tspan dx="3" style={{ fontSize: "9px" }} fill="var(--color-text-muted)">T€</tspan>
                  </text>
                </g>
                <text x={bx(j) + barW / 2} y={y0 + 17} textAnchor="middle" fontSize={11} fill="var(--color-text-muted)">{s.short}</text>
              </g>
            );
          })}
        </svg>

        {/* Bilanz-Block als Overlay (nur breit). Unten an der Balken-Oberkante
            verankert → „Gesamtkosten" sitzt direkt über den Balken. */}
        {!narrow && (
          <div style={{ position: "absolute", bottom: `${((H - barTop) / H) * 100 + 1.5}%`, left: `${(barX0 / W) * 100}%`, maxWidth: "30%", pointerEvents: "none" }}>
            {bilanz}
          </div>
        )}

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

      {/* Schmal: unter dem Linienchart Ersparnis und Gesamtkosten NEBENEINANDER
          — links die Ersparnis, rechts die Gesamtkosten als horizontale Balken
          (Balken jeweils unter dem Label, damit die vollen Namen Platz haben). */}
      {narrow && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${v("--color-border")}`, display: "flex", gap: 16, alignItems: "flex-start" }}>
          {/* Ersparnis */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={lblStyle}>Ersparnis</span>
              {ersparnisTip}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              {plusBadge}
              {amtHtml(ersparnis, 19)}
            </div>
          </div>
          {/* Gesamtkosten: horizontale Balken, jeweils unter dem Label */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
              <span style={lblStyle}>Gesamtkosten</span>
              {gesamtkostenTip}
            </div>
            {SERIES.map(s => {
              const val = m.totals[s.key];
              return (
                <div key={s.key} style={{ marginTop: 7 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 11.5, color: v("--color-text-secondary") }}>{s.label}</span>
                    {amtHtml(val, 12, 700)}
                  </div>
                  <div style={{ height: 11, background: `color-mix(in srgb, ${v("--color-text-muted")} 14%, transparent)`, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${(val / barMax) * 100}%`, height: "100%", background: s.color, borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legende neben dem CTA (breit: eine Reihe; schmal: Legende kompakt in
          einer Zeile, CTA voll darunter — nebeneinander passt bei ~300 px nicht). */}
      <div style={{ display: "flex", flexDirection: narrow ? "column" : "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: narrow ? 10 : 12, marginTop: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: narrow ? 12 : 12, rowGap: 3, fontSize: 11.5 }}>
          {SERIES.map(s => (
            <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: v("--color-text-secondary") }}>
              <span style={{ width: 11, height: 3, borderRadius: 2, background: s.color }} /> {narrow ? s.short : s.label}
            </span>
          ))}
        </div>
        <a data-sc-export-ignore href="/waermepumpe-rechner" style={{ flexShrink: 0, alignSelf: narrow ? "stretch" : "auto", textAlign: "center", padding: "9px 16px", borderRadius: v("--radius-md"), background: v("--color-accent"), color: v("--color-text-on-accent"), fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
          Für dein Haus durchrechnen →
        </a>
      </div>

      {/* Aktionsleiste */}
      <div data-sc-export-ignore style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
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

      {/* Quelle: vertikal an der rechten Kante (Widget-Konvention) */}
      <div title={`Quelle: ${SOURCE}`} style={{ position: "absolute", top: 0, bottom: 0, right: 4, display: "flex", alignItems: "center", justifyContent: "center", writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 9, lineHeight: 1.4, letterSpacing: 0.2, color: v("--color-text-faint"), pointerEvents: "none" }}>
        {SOURCE}
      </div>
    </div>
  );
}
