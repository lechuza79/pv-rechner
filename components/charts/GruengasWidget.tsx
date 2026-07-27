"use client";

import { useEffect, useState } from "react";
import InfoTooltip from "../InfoTooltip";
import {
  ExportBox,
  ExportNotesProvider,
  WidgetFooter,
  WidgetSourceEdge,
  ExportOnly,
  ExportOnlyG,
  WidgetExportFooter,
  type ExportLegendEntry,
} from "../WidgetExport";
import { useChartExport } from "../../lib/useChartExport";
import { EXPORT_IGNORE_ATTR } from "../../lib/chart-export";
import { WIDGETS } from "../../lib/widget-registry";
import { v } from "../../lib/theme";
import type { MusterVariant } from "../../lib/greengas-muster";

// Grüngas-Widget: Gasheizung mit GModG-Grüngas-Pflicht vs. Wärmepumpe über 20
// Jahre. Selbst-enthaltendes Kombi-Widget (Graph + Ersparnis + Kosten) — dasselbe
// Bauteil steht unter /embed/gruengas-heizkosten und (per Embed) im Ratgeber.
// `view` wählt, welche Teile gezeigt werden: "full" (alles), "bars" (nur die
// Gesamtkosten-Balken, für die Kurzantwort) oder "lines" (nur der Verlauf).
// `onsite` = First-Party-Embed auf unseren Seiten: kein Powered-by, keine
// dauerhafte In-Widget-Quelle (die Seite kreditiert zentral), Aktionen bleiben.
// Theming über --color-* (im Embed auf --widget-* gemappt).
//
// Drei Zustände, EIN Bauteil — die Fußzeile ist in allen gleich aufgebaut:
//   • Seite (onsite): Quelle + Marke erscheinen beim Überfahren, sonst ruhig.
//   • Embed: Quelle + Marke dauerhaft sichtbar (Attributionspflicht).
//   • Bild (Download/Teilen): alles Interaktive fliegt raus, dafür kommen
//     Skala, Legende, die Texte hinter den „?" sowie Quelle + Marke fest hinein
//     (Mechanik: components/WidgetExport.tsx).

export type GruengasView = "full" | "bars" | "lines";

type Key = "gas" | "wp" | "wpPv";
const SERIES: { key: Key; color: string; label: string; short: string }[] = [
  { key: "gas", color: "var(--color-text-primary)", label: "Gasheizung", short: "Gas" },
  { key: "wp", color: "var(--color-accent)", label: "Wärmepumpe", short: "WP" },
  { key: "wpPv", color: "var(--color-accent-light)", label: "Wärmepumpe + PV", short: "WP+PV" },
];

const eur = (n: number) => `${Math.round(n).toLocaleString("de-DE")} €`;

// 2 Nachkommastellen: hält Server-/Client-Render exakt gleich (kein Hydration-
// Mismatch durch Float-Abweichungen); sub-Pixel, visuell egal.
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

interface Props {
  variants: MusterVariant[];
  pvCoveragePct: number;
  view?: GruengasView;
  onsite?: boolean;
  branding?: boolean;
  showEmbed?: boolean;
}

export default function GruengasWidget(props: Props) {
  // Der Sammler für die „?"-Texte muss die ganze Karte umschließen — inklusive
  // des Bild-Fußes, der sie ausgibt.
  return (
    <ExportNotesProvider>
      <GruengasCard {...props} />
    </ExportNotesProvider>
  );
}

function GruengasCard({
  variants,
  pvCoveragePct,
  view = "full",
  onsite = false,
  branding = true,
  showEmbed = false,
}: Props) {
  const [active, setActive] = useState(0);
  const [hoverLine, setHoverLine] = useState<number | null>(null);
  const [narrow, setNarrow] = useState(false);
  // Quelle + Marke auf der eigenen Seite: erscheinen beim Überfahren/Fokus.
  const [showCredit, setShowCredit] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width:560px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const m = variants[active];
  const ersparnis = m.totals.gas - m.totals.wpPv;

  const isBars = view === "bars";
  const showLines = !isBars;
  const showBarsInSvg = view === "full" && !narrow;
  const showBilanzOverlay = view === "full" && !narrow;
  const linesFullWidth = narrow || view === "lines";

  // Bild-Export: 1:1-Aufnahme der Karte. Alles Interaktive trägt
  // data-sc-export-ignore, alles Nur-im-Bild steckt in <ExportOnly>.
  const { chartRef, downloadPng, sharePng, shareWhatsApp, shareTwitter, isExporting, canNativeShare } =
    useChartExport({
      context: { title: `Gasheizung vs. Wärmepumpe — ${m.label}` },
      filename: "waermepumpe-vs-gasheizung-gruengas",
      shareText: WIDGETS.gruengasHeizkosten.shareText,
      shareUrl: WIDGETS.gruengasHeizkosten.shareUrl,
      mode: "node",
    });

  // ── Linien-SVG-Maße (viewBox nah an der Pixelbreite) ──
  const W = narrow ? 320 : 640, H = narrow ? 200 : 280, P = { t: 24, r: 14, b: 28, l: 12 };
  const cH = H - P.t - P.b;
  const y0 = P.t + cH;
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

  // Balken im Linien-SVG (nur view=full breit)
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
  // Betrag: Desktop volle Zahl (67.000 €), Mobil abgekürzt (67 T€). Zahl trägt,
  // Einheit klein/grau daneben.
  const amtHtml = (nn: number, size: number, full: boolean, weight = 800) => (
    <span style={{ fontFamily: v("--font-mono"), color: v("--color-text-primary"), fontWeight: weight, whiteSpace: "nowrap" }}>
      <span style={{ fontSize: size }}>{full ? Math.round(nn).toLocaleString("de-DE") : Math.round(nn / 1000).toLocaleString("de-DE")}</span>
      <span style={{ fontSize: Math.round(size * 0.62), color: v("--color-text-muted"), fontWeight: 700, marginLeft: 3 }}>{full ? "€" : "T€"}</span>
    </span>
  );
  const plusBadge = (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 18, height: 18, padding: "0 4px", borderRadius: 6, border: `1px solid ${v("--color-positive")}`, background: `color-mix(in srgb, ${v("--color-positive")} 12%, transparent)`, color: v("--color-positive-text"), fontFamily: v("--font-mono"), fontSize: 14, fontWeight: 800, lineHeight: 1 }}>+</span>
  );
  // Die „?"-Trigger nehmen sich selbst aus dem Bild und melden ihren Text an den
  // Bild-Fuß (components/WidgetExport.tsx) — nichts geht im PNG verloren.
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

  // Gedrehte (vertikale) Betrags-Summe für die Balken (Desktop volle Zahl).
  const barValueTspans = (val: number, full: boolean) => (
    <>
      <tspan style={{ fontSize: v("--font-size-caption") }}>{full ? Math.round(val).toLocaleString("de-DE") : Math.round(val / 1000).toLocaleString("de-DE")}</tspan>
      <tspan dx="3" style={{ fontSize: "9px" }} fill="var(--color-text-muted)">{full ? "€" : "T€"}</tspan>
    </>
  );

  // ── view="bars": eigenständige VERTIKALE Balken (feste Breite, Track, gedrehte
  //    volle Summe) — nur die Gesamtkosten, mit Label + Helptext. Immer vertikal. ──
  const BW = 300, BH = 176, BP = { t: 6, b: 26, l: 14 };
  const by0 = BH - BP.b;
  const bTop = BP.t + 4;
  const bMaxH = by0 - bTop;
  const bBarW = 26;
  const bGap = 52;
  const bGroupW = SERIES.length * bBarW + (SERIES.length - 1) * bGap;
  const bStartX = Math.max(BP.l + 28, (BW - bGroupW) / 2);
  const bbx = (j: number) => bStartX + j * (bBarW + bGap);
  const barsOnlyWidget = (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
        <span style={lblStyle}>Gesamtkosten</span>
        {gesamtkostenTip}
      </div>
      <svg viewBox={`0 0 ${BW} ${BH}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
        aria-label={`20-Jahres-Gesamtkosten ${m.label}: Gasheizung, Wärmepumpe, Wärmepumpe + PV`}>
        {/* Grundlinie unter den Balken */}
        <line x1={8} x2={BW - 8} y1={by0} y2={by0} stroke="var(--color-chart-zero)" strokeWidth={1} />
        {SERIES.map((s, j) => {
          const val = m.totals[s.key];
          const h = Math.max(3, (val / barMax) * bMaxH);
          const lx = bbx(j) - 8;
          return (
            <g key={s.key}>
              <path d={roundedTopRect(bbx(j), bTop, bBarW, bMaxH, 3)} fill={`color-mix(in srgb, ${v("--color-text-muted")} 14%, transparent)`} />
              <path d={roundedTopRect(bbx(j), by0 - h, bBarW, h, 3)} fill={s.color} />
              <g transform={`translate(${lx}, ${by0 - 8}) rotate(-90)`}>
                <text x={0} y={0} textAnchor="start" dominantBaseline="central" fontWeight={700} fill="var(--color-text-secondary)" fontFamily="var(--font-mono)">
                  {barValueTspans(val, true)}
                </text>
              </g>
              <text x={bbx(j) + bBarW / 2} y={by0 + 16} textAnchor="middle" fontSize={11} fill="var(--color-text-muted)">{s.short}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );

  // Horizontaler Balken-Block (nur view=full auf schmalen Screens).
  const barsBlockHorizontal = (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={lblStyle}>Ersparnis</span>{ersparnisTip}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
          {plusBadge}{amtHtml(ersparnis, 19, false)}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
          <span style={lblStyle}>Gesamtkosten</span>{gesamtkostenTip}
        </div>
        {SERIES.map(s => {
          const val = m.totals[s.key];
          return (
            <div key={s.key} style={{ marginTop: 7 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 11.5, color: v("--color-text-secondary") }}>{s.label}</span>
                {amtHtml(val, 12, false, 700)}
              </div>
              <div style={{ height: 11, background: `color-mix(in srgb, ${v("--color-text-muted")} 14%, transparent)`, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${(val / barMax) * 100}%`, height: "100%", background: s.color, borderRadius: 4 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Legende: online überflüssig (Überfahren/Tippen benennt jede Linie, die
  // Balken tragen Kürzel) — im Bild unverzichtbar, dort gibt es kein Hover.
  const legend: ExportLegendEntry[] = SERIES.map(s => ({
    color: s.color,
    label: s.label,
    shape: showLines ? "line" : "box",
  }));

  return (
    <div
      ref={chartRef}
      onMouseEnter={() => setShowCredit(true)}
      onMouseLeave={() => setShowCredit(false)}
      onFocusCapture={() => setShowCredit(true)}
      style={{
        position: "relative",
        // Solider Hintergrund überall AUSSER der reinen Balken-Ansicht onsite
        // (Kurzantwort, blendet in die Box). Solide = der Download-PNG hat einen
        // Hintergrund (transparenter Export ist ein Fehler).
        background: onsite && isBars ? "transparent" : v("--color-bg"),
        border: onsite && isBars ? "none" : `1px solid ${v("--color-border")}`,
        borderRadius: onsite && isBars ? 0 : v("--radius-lg"),
        padding: isBars ? 0 : "16px 24px 14px 16px",
        boxSizing: "border-box",
      }}>
      {/* Kopf (nicht in der reinen Balken-Ansicht) */}
      {!isBars && (
        <>
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
          <div {...{ [EXPORT_IGNORE_ATTR]: "" }} style={{ display: "flex", borderRadius: v("--radius-md"), border: `1px solid ${v("--color-border")}`, overflow: "hidden", marginBottom: 8 }} role="tablist" aria-label="Gebäudestand">
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
          {/* Im Bild ersetzt eine Zwischenüberschrift den Umschalter — sonst
              bliebe offen, welcher Gebäudestand abgebildet ist. */}
          <ExportOnly style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: v("--color-text-primary") }}>
              Gebäude: {m.label}
            </span>
          </ExportOnly>
          <div style={{ fontSize: 11.5, color: v("--color-text-secondary"), lineHeight: 1.5, marginBottom: 8, padding: "0 2px" }}>
            {m.explain}
          </div>
        </>
      )}

      {/* Nur Balken (Kurzantwort) */}
      {isBars && <ExportBox>{barsOnlyWidget}</ExportBox>}

      {/* Linien-Chart (full + lines) — im Bild in einer eigenen hellen Box,
          damit Chart und Fußnoten sichtbar getrennt sind. */}
      {showLines && (
        <ExportBox style={{ position: "relative" }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
            aria-label={`Jährliche Heizkosten ${m.label}: Gasheizung steigt, Wärmepumpe bleibt günstig`}
            onMouseLeave={() => setHoverLine(null)}>
            {yTicks.map(val => (
              <line key={val} x1={P.l} x2={P.l + linienW} y1={yL(val)} y2={yL(val)} stroke="var(--color-chart-grid)" strokeWidth={0.5} />
            ))}
            {/* Achsen-Label statt Zahlen (Hover zeigt exakte Werte) — gleiche
                Label-Typo wie „Gesamtkosten"/„Ersparnis": Caption, 700, Versalien. */}
            <text x={P.l} y={13} textAnchor="start" style={{ fontSize: v("--font-size-caption"), letterSpacing: "0.5px" }} fontWeight={700} fill="var(--color-text-muted)">HEIZKOSTEN PRO JAHR</text>
            {/* Skala nur im Bild: online liest man die Werte per Überfahren ab,
                im PNG gäbe es sonst keine Größenordnung. */}
            <ExportOnlyG>
              {/* Nur jede zweite Stufe beschriften: vier Zahlen übereinander
                  kollidieren mit den Kurven, zwei reichen für die Größenordnung. */}
              {yTicks.filter((val, i) => val > 0 && i % 2 === 0).map(val => (
                <text key={val} x={P.l + 2} y={yL(val) + 10} textAnchor="start" fontSize={9} fill="var(--color-text-secondary)" fontFamily="var(--font-mono)">
                  {eur(val)}
                </text>
              ))}
            </ExportOnlyG>
            {/* Rand-Jahre linksbündig/rechtsbündig, damit „2026" nicht abschneidet */}
            {xYears.map((yr, i) => {
              const last = i === xYears.length - 1;
              const anchor = i === 0 ? "start" : last ? "end" : "middle";
              const xpos = i === 0 ? P.l : last ? P.l + linienW : xL(yr - startYear);
              return <text key={yr} x={xpos} y={y0 + 18} textAnchor={anchor} fontSize={12} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{yr}</text>;
            })}

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
                      {barValueTspans(val, !narrow)}
                    </text>
                  </g>
                  <text x={bx(j) + barW / 2} y={y0 + 17} textAnchor="middle" fontSize={11} fill="var(--color-text-muted)">{s.short}</text>
                </g>
              );
            })}
          </svg>

          {showBilanzOverlay && (
            <div style={{ position: "absolute", bottom: `${((H - barTop) / H) * 100 + 1.5}%`, left: `${(barX0 / W) * 100}%`, maxWidth: "32%", pointerEvents: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={lblStyle}>Ersparnis 20 Jahre</span>
                <span style={{ pointerEvents: "auto" }}>{ersparnisTip}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                {plusBadge}{amtHtml(ersparnis, 20, !narrow)}
              </div>
              <div style={{ borderTop: `1px solid ${v("--color-border")}`, marginTop: 18, marginBottom: 8 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={lblStyle}>Gesamtkosten</span>
                <span style={{ pointerEvents: "auto" }}>{gesamtkostenTip}</span>
              </div>
            </div>
          )}

          {hoverLine !== null && (
            <div {...{ [EXPORT_IGNORE_ATTR]: "" }} style={{ position: "absolute", left: `${(xL(hoverLine) / W) * 100}%`, top: 0, transform: `translateX(${hoverLine > n / 2 ? "-105%" : "5%"})`, background: v("--color-bg"), border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-md"), padding: "7px 9px", pointerEvents: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.12)", zIndex: 2, minWidth: 138 }}>
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
        </ExportBox>
      )}

      {/* view=full, schmal: horizontale Balken unter dem Chart */}
      {view === "full" && narrow && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${v("--color-border")}` }}>
          {barsBlockHorizontal}
        </div>
      )}

      {/* Fußzeile + Quelle: geteilte Bausteine (components/WidgetExport).
          Ausnahme mit Grund: der reine Balken-Ausschnitt auf unserer eigenen
          Seite bleibt nackt — dort führt der Artikel. */}
      {!(onsite && isBars) && (
        <WidgetFooter
          widget={WIDGETS.gruengasHeizkosten}
          chartExport={{ downloadPng, sharePng, shareWhatsApp, shareTwitter, isExporting, canNativeShare }}
          onsite={onsite}
          branding={branding}
          showEmbed={showEmbed}
          narrow={narrow}
        />
      )}

      {!(onsite && isBars) && (
        <WidgetSourceEdge widget={WIDGETS.gruengasHeizkosten} visible={!onsite || showCredit} />
      )}

      {/* Nur im Bild: Legende, die Texte hinter den „?", Quelle + Marke. */}
      <WidgetExportFooter
        widget={WIDGETS.gruengasHeizkosten}
        legend={legend}
        note={`Muster-Einfamilienhaus, ${m.label.toLowerCase()} · Näherungswerte, ohne Gewähr`}
      />
    </div>
  );
}
