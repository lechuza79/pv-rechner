"use client";

import { useEffect, useState } from "react";
import InfoTooltip from "../InfoTooltip";
import { v } from "../../lib/theme";
import type { MusterVariant } from "../../lib/greengas-muster";

// Grüngas-Widget-Kern (reines Chart, ohne Hülle): Gasheizung mit GModG-Grüngas-
// Pflicht vs. Wärmepumpe über 20 Jahre. Umschaltbar zwischen unsaniertem (Default,
// der stärkere Fall) und teilsaniertem Muster-EFH. Drei Ansichten (`view`):
//   • "full"  — Linien-Verlauf + 20-Jahres-Balken (Desktop nebeneinander, mobil
//               gestapelt). Das ganze Kombi-Widget.
//   • "bars"  — nur Ersparnis + Gesamtkosten-Balken (die Kurzantwort).
//   • "lines" — nur der Linien-Verlauf.
// Chrome (Titel, Quelle, Powered-by, Aktionen, CTA) liefert die einbettende Hülle
// (Embed-Client bzw. Artikel). Theming über --color-*, im Embed auf --widget-*
// gemappt — dieselbe Komponente themt in beiden Kontexten mit.

export type GruengasView = "full" | "bars" | "lines";

type Key = "gas" | "wp" | "wpPv";
const SERIES: { key: Key; color: string; label: string; short: string }[] = [
  { key: "gas", color: "var(--color-text-primary)", label: "Gasheizung", short: "Gas" },
  { key: "wp", color: "var(--color-accent)", label: "Wärmepumpe", short: "WP" },
  { key: "wpPv", color: "var(--color-accent-light)", label: "Wärmepumpe + PV", short: "WP+PV" },
];

const eur = (n: number) => `${Math.round(n).toLocaleString("de-DE")} €`;
// Y-Achse (jährliche €-Beträge): akkurat, ohne verlustbehaftetes k-Runden.
const axisEur = (n: number) => n.toLocaleString("de-DE");

// Rechteck mit nur oben abgerundeten Ecken (unten eckig, sitzt bündig auf der
// Nulllinie). SVG rx würde alle vier Ecken runden.
// 2 Nachkommastellen: hält Server- und Client-Render exakt gleich (sonst
// Hydration-Mismatch durch minimale Float-Abweichungen); sub-Pixel, visuell egal.
const r2 = (n: number) => Math.round(n * 100) / 100;

function roundedTopRect(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return `M${r2(x)},${r2(y + h)} L${r2(x)},${r2(y + rr)} Q${r2(x)},${r2(y)} ${r2(x + rr)},${r2(y)} L${r2(x + w - rr)},${r2(y)} Q${r2(x + w)},${r2(y)} ${r2(x + w)},${r2(y + rr)} L${r2(x + w)},${r2(y + h)} Z`;
}

function niceMax(max: number): number {
  const step = Math.pow(10, Math.floor(Math.log10(max / 4)));
  const s = (max / 4 / step <= 2 ? 2 : max / 4 / step <= 5 ? 5 : 10) * step;
  return Math.ceil(max / s) * s;
}

export default function GruengasWidget({
  variants,
  pvCoveragePct,
  view = "full",
}: {
  variants: MusterVariant[];
  pvCoveragePct: number;
  view?: GruengasView;
}) {
  const [active, setActive] = useState(0);
  const [hoverLine, setHoverLine] = useState<number | null>(null);
  // Schmale Screens: Balken wandern unter das Chart, bekommen volle Höhe.
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

  // Ansichts-Flags
  const barsOnly = view === "bars";
  const linesOnly = view === "lines";
  const showLines = !barsOnly;
  const showBarsInSvg = view === "full" && !narrow;
  const showBilanzOverlay = view === "full" && !narrow;
  const linesFullWidth = narrow || linesOnly;

  // ── SVG-Maße: viewBox nah an der Pixelbreite (breit ~600, schmal ~320), sonst
  //    würde herunterskaliert und Linien/Schrift wirkten dünn/winzig. ──
  const W = narrow ? 320 : 640, H = narrow ? 200 : 280, P = { t: 14, r: 14, b: 28, l: 44 };
  const cH = H - P.t - P.b;
  const y0 = P.t + cH; // Nulllinie
  const linienW = linesFullWidth ? W - P.l - P.r : 348;
  const pts = m.series;
  const n = pts.length;
  const startYear = pts[0].year, endYear = pts[n - 1].year;
  const yMax = niceMax(Math.max(...pts.map(p => p.gas)));
  const xL = (i: number) => r2(P.l + (i / (n - 1)) * linienW);
  const yL = (val: number) => r2(y0 - (val / yMax) * cH);
  const yTicks: number[] = [];
  for (let val = 0; val <= yMax; val += yMax / 4) yTicks.push(val);
  const xYears = [startYear, Math.round((startYear + endYear) / 2), endYear];

  // Balken (im SVG, nur "full" breit): unterer Teil, oben Raum für den Bilanz-Block.
  const barX0 = P.l + linienW + 40;
  const barMax = m.totals.gas;
  const barTop = P.t + cH * 0.52;
  const barMaxH = y0 - barTop;
  const barW = 13;
  const barZoneW = W - P.r - barX0;
  const slot = barZoneW / SERIES.length;
  const bx = (j: number) => barX0 + j * slot + (slot - barW) / 2;
  const barH = (val: number) => Math.max(3, (val / barMax) * barMaxH);

  const lblStyle: React.CSSProperties = { fontSize: v("--font-size-caption"), fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: v("--color-text-muted") };
  // Betrag mit kleiner, grauer Einheit (Zahl trägt, „T€" steht kleiner daneben).
  const amtHtml = (nn: number, size: number, weight = 800) => (
    <span style={{ fontFamily: v("--font-mono"), color: v("--color-text-primary"), fontWeight: weight, whiteSpace: "nowrap" }}>
      <span style={{ fontSize: size }}>{Math.round(nn / 1000).toLocaleString("de-DE")}</span>
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
  // Bilanz-Block für die BREITE „full"-Ansicht (Overlay über der Balken-Zone).
  const bilanzOverlay = (
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

  const trackBg = `color-mix(in srgb, ${v("--color-text-muted")} 14%, transparent)`;
  const ersparnisRow = (size: number) => (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={lblStyle}>Ersparnis</span>
        {ersparnisTip}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
        {plusBadge}
        {amtHtml(ersparnis, size)}
      </div>
    </>
  );
  const gesamtkostenHeader = (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={lblStyle}>Gesamtkosten</span>
      {gesamtkostenTip}
    </div>
  );

  // Balken-Block. Schmal (mobil): Ersparnis links, Gesamtkosten als HORIZONTALE
  // Balken rechts. Breit (Desktop, neben dem Text): Ersparnis oben, darunter
  // Gesamtkosten als VERTIKALE Balken (Säulen).
  const barsBlockHorizontal = (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
      <div style={{ flexShrink: 0 }}>{ersparnisRow(19)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 6 }}>{gesamtkostenHeader}</div>
        {SERIES.map(s => {
          const val = m.totals[s.key];
          return (
            <div key={s.key} style={{ marginTop: 7 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 11.5, color: v("--color-text-secondary") }}>{s.label}</span>
                {amtHtml(val, 12, 700)}
              </div>
              <div style={{ height: 11, background: trackBg, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${(val / barMax) * 100}%`, height: "100%", background: s.color, borderRadius: 4 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
  // Eigenständige VERTIKALE Balken für view="bars" — im Stil des Gesamtwidgets:
  // feste Balkenbreite, grauer Track, oben rund, gedrehte (vertikale) T€-Summe
  // links am Balken, Kürzel darunter. Immer vertikal (auch mobil).
  const BW = 300, BH = 176, BP = { t: 6, b: 26, l: 14 };
  const by0 = BH - BP.b;
  const bTop = BP.t + 4;
  const bMaxH = by0 - bTop;
  const bBarW = 26; // feste Breite
  const bGap = 46;
  const bGroupW = SERIES.length * bBarW + (SERIES.length - 1) * bGap;
  const bStartX = Math.max(BP.l + 24, (BW - bGroupW) / 2);
  const bbx = (j: number) => bStartX + j * (bBarW + bGap);
  const barsVerticalSvg = (
    <div>
      {ersparnisRow(20)}
      <div style={{ borderTop: `1px solid ${v("--color-border")}`, marginTop: 14, marginBottom: 10 }} />
      <div style={{ marginBottom: 2 }}>{gesamtkostenHeader}</div>
      <svg viewBox={`0 0 ${BW} ${BH}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
        aria-label={`20-Jahres-Gesamtkosten ${m.label}: Gasheizung, Wärmepumpe, Wärmepumpe + PV`}>
        {SERIES.map((s, j) => {
          const val = m.totals[s.key];
          const h = Math.max(3, (val / barMax) * bMaxH);
          const lx = bbx(j) - 8;
          return (
            <g key={s.key}>
              <path d={roundedTopRect(bbx(j), bTop, bBarW, bMaxH, 3)} fill={trackBg} />
              <path d={roundedTopRect(bbx(j), by0 - h, bBarW, h, 3)} fill={s.color} />
              <g transform={`translate(${lx}, ${by0 - 8}) rotate(-90)`}>
                <text x={0} y={0} textAnchor="start" dominantBaseline="central" fontWeight={700} fill="var(--color-text-secondary)" fontFamily="var(--font-mono)">
                  <tspan style={{ fontSize: v("--font-size-caption") }}>{Math.round(val / 1000).toLocaleString("de-DE")}</tspan>
                  <tspan dx="3" style={{ fontSize: "9px" }} fill="var(--color-text-muted)">T€</tspan>
                </text>
              </g>
              <text x={bbx(j) + bBarW / 2} y={by0 + 16} textAnchor="middle" fontSize={11} fill="var(--color-text-muted)">{s.short}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );

  return (
    <div>
      {/* Umschalter Gebäudestand (beide Ansichten hängen am Muster) */}
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

      {/* Linien-Chart (full + lines) */}
      {showLines && (
        <div style={{ position: "relative" }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
            aria-label={`Jährliche Heizkosten ${m.label}: Gasheizung steigt, Wärmepumpe bleibt günstig`}
            onMouseLeave={() => setHoverLine(null)}>
            {yTicks.map(val => (
              <g key={val}>
                <line x1={P.l} x2={P.l + linienW} y1={yL(val)} y2={yL(val)} stroke="var(--color-chart-grid)" strokeWidth={0.5} />
                <text x={P.l - 6} y={yL(val)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{axisEur(val)}</text>
              </g>
            ))}
            {xYears.map(yr => <text key={yr} x={xL(yr - startYear)} y={y0 + 18} textAnchor="middle" fontSize={12} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{yr}</text>)}

            <line x1={P.l} x2={showBarsInSvg ? W - P.r : P.l + linienW} y1={y0} y2={y0} stroke="var(--color-chart-zero)" strokeWidth={1} />

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

            {/* Balken im SVG (nur full-breit) */}
            {showBarsInSvg && SERIES.map((s, j) => {
              const val = m.totals[s.key];
              const h = barH(val);
              const lx = bx(j) - 7;
              return (
                <g key={s.key}>
                  <path d={roundedTopRect(bx(j), barTop, barW, barMaxH, 3)} fill={`color-mix(in srgb, ${v("--color-text-muted")} 14%, transparent)`} />
                  <path d={roundedTopRect(bx(j), y0 - h, barW, h, 3)} fill={s.color} />
                  <g transform={`translate(${lx}, ${y0 - 9}) rotate(-90)`}>
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

          {showBilanzOverlay && (
            <div style={{ position: "absolute", bottom: `${((H - barTop) / H) * 100 + 1.5}%`, left: `${(barX0 / W) * 100}%`, maxWidth: "30%", pointerEvents: "none" }}>
              {bilanzOverlay}
            </div>
          )}

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
      )}

      {/* view="bars": eigenständige vertikale Balken (immer). */}
      {barsOnly && barsVerticalSvg}

      {/* view="full" auf schmalen Screens: horizontale Balken unter dem Chart. */}
      {view === "full" && narrow && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${v("--color-border")}` }}>
          {barsBlockHorizontal}
        </div>
      )}

      {/* Legende (nur wenn Linien sichtbar) */}
      {showLines && (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: 12, rowGap: 3, marginTop: 14, fontSize: 11.5 }}>
          {SERIES.map(s => (
            <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: v("--color-text-secondary") }}>
              <span style={{ width: 11, height: 3, borderRadius: 2, background: s.color }} /> {narrow ? s.short : s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
