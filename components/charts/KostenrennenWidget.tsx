"use client";

import { useEffect, useRef, useState } from "react";
import InfoTooltip from "../InfoTooltip";
import {
  ExportBox,
  ExportNotesProvider,
  ExportOnly,
  WidgetFooter,
  WidgetSourceEdge,
  WidgetExportFooter,
  type ExportLegendEntry,
} from "../WidgetExport";
import { IconPause, IconPlay, IconRefresh } from "../Icons";
import { useChartExport } from "../../lib/useChartExport";
import { EXPORT_IGNORE_ATTR } from "../../lib/export-markers";
import { WIDGETS } from "../../lib/widget-registry";
import { v, fsPx, space } from "../../lib/theme";
import { fmtEuroVoll, formatDataAsOf } from "../../lib/atlas-format";
import { PERSONEN } from "../../lib/constants";
import type { RennLaeufer } from "../../lib/kostenrennen";
import type { RennVariante } from "../../lib/kostenrennen-varianten";

// Das Amortisations-Rennen: eine Linie je Anlage, die zeichnet, was die Anlage
// bis dahin EINGEBRACHT hat (Ersparnis plus Vergütung, minus Akku-Tausch) —
// ab null, wie ein Depot, in das jeden Monat eingezahlt wird. Eine gestrichelte
// Marke je Anlage zeigt ihre Anschaffung; wo die Linie sie erreicht, ist die
// Anlage bezahlt. Dieser Monat IST die Amortisation des Rechners
// (lib/kostenrennen.ts rechnet mit denselben Funktionen).
//
// Warum der Nutzen und nicht die Kosten: In den kumulierten Stromkosten startet
// der PV-Haushalt 14.000 € über dem anderen, und jede Achse, die beide zeigt,
// macht aus dem Winter ein halbes Prozent. Ab null gezeichnet und mit einer
// Achse, die mitwächst (wie bei einem Bar-Chart-Race), füllt das erste Jahr das
// Bild: Der Sommer wird zur steilen Treppe, der Winter zur flachen, ein
// Wetterjahr oder ein Preissprung verbiegt die Linie sichtbar.
//
// Selbst-enthaltende Karte nach dem Muster von GruengasWidget: dasselbe Bauteil
// steht unter /embed/pv-kostenrennen und direkt gerendert im Ratgeber (onsite).
// Alles Interaktive (Abspielen, Schieberegler, Aufstellungs-Reiter) trägt
// data-sc-export-ignore; das Bild zeigt den eingestellten Stand als Text.
//
// Die Zeit läuft als Gleitkommazahl `t` (in MONATEN) über requestAnimationFrame;
// zwischen zwei Monaten wird nur für die Bewegung interpoliert, angezeigt werden
// immer die gerechneten Monatswerte.

const MS_JE_MONAT = 34; // 25 Jahre in rund zehn Sekunden
const SCHRITT_MS = 380; // bei reduzierter Bewegung: ein Jahr je Schritt

const MONATE_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

/** Kalenderbeschriftung eines Monatsindex (1..12·N): Monat m des Betriebsjahrs
 *  i, benannt wie im Rechner-Chart (Startjahr + i). */
function monatLabel(startJahr: number, k: number, kurz = false): string {
  const i = Math.ceil(k / 12);
  const m = (k - 1) % 12;
  return `${(kurz ? MONATE_KURZ : MONATE)[m]} ${startJahr + i}`;
}

// Farben der Anlagen im Rennen; der Haushalt ohne Anlage erscheint nur im
// Monatsstreifen und bleibt dort neutral grau. Semantisch, nicht themebar.
const PV_FARBEN = ["var(--color-accent)", "var(--color-text-primary)", "var(--color-accent-light)", "var(--color-positive)"];
const OHNE_FARBE = "var(--color-text-muted)";

// 2 Nachkommastellen: hält Server-/Client-Render exakt gleich.
const r2 = (n: number) => Math.round(n * 100) / 100;

function niceMax(max: number): number {
  const step = Math.pow(10, Math.floor(Math.log10(max / 4)));
  const s = (max / 4 / step <= 2 ? 2 : max / 4 / step <= 5 ? 5 : 10) * step;
  return Math.ceil(max / s) * s;
}

/** Wert einer Monatsreihe zur Gleitkomma-Zeit t (linear zwischen zwei Monaten). */
function wertBei(reihe: number[], t: number): number {
  const i = Math.floor(t);
  if (i >= reihe.length - 1) return reihe[reihe.length - 1];
  return reihe[i] + (reihe[i + 1] - reihe[i]) * (t - i);
}

interface Props {
  /** Die Aufstellungen (Modell, Wetterjahre, Preissprünge) — mindestens eine. */
  varianten: RennVariante[];
  onsite?: boolean;
  branding?: boolean;
  showEmbed?: boolean;
  /** Läuft von selbst los, sobald die Karte im Bild ist (nicht bei reduzierter Bewegung). */
  autoplay?: boolean;
  /** Stichtag der Preise (ISO), für die Quellen-Kante. */
  preiseStandIso?: string;
}

export default function KostenrennenWidget(props: Props) {
  return (
    <ExportNotesProvider>
      <KostenrennenCard {...props} />
    </ExportNotesProvider>
  );
}

function KostenrennenCard({ varianten, onsite = false, branding = true, showEmbed = false, autoplay = true, preiseStandIso }: Props) {
  const [aktiv, setAktiv] = useState(0);
  const variante = varianten[Math.min(aktiv, varianten.length - 1)];
  const rennen = variante.rennen;
  const [t, setT] = useState(0);
  const [spielt, setSpielt] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [showCredit, setShowCredit] = useState(false);
  const [ruhig, setRuhig] = useState(false);
  const gestartet = useRef(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const N = rennen.jahre;
  const M = 12 * N;

  useEffect(() => {
    const mq = window.matchMedia("(max-width:560px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onRm = () => setRuhig(rm.matches);
    onRm();
    rm.addEventListener("change", onRm);
    return () => { mq.removeEventListener("change", on); rm.removeEventListener("change", onRm); };
  }, []);

  // Von selbst loslaufen, wenn die Karte zum ersten Mal sichtbar wird — einmal.
  // Bei reduzierter Bewegung bleibt sie stehen; die Jahre wählt man dann selbst.
  useEffect(() => {
    if (!autoplay || ruhig || gestartet.current || !hostRef.current) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !gestartet.current) {
        gestartet.current = true;
        setSpielt(true);
        io.disconnect();
      }
    }, { threshold: 0.6 });
    io.observe(hostRef.current);
    return () => io.disconnect();
  }, [autoplay, ruhig]);

  // Abspielen: gleichmäßig über requestAnimationFrame; bei reduzierter
  // Bewegung in ganzen Jahresschritten (keine Zwischenbilder).
  useEffect(() => {
    if (!spielt) return;
    if (ruhig) {
      const iv = setInterval(() => {
        setT((prev) => {
          const n = Math.min(Math.floor(prev / 12) * 12 + 12, M);
          if (n >= M) setSpielt(false);
          return n;
        });
      }, SCHRITT_MS);
      return () => clearInterval(iv);
    }
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      setT((prev) => {
        const n = Math.min(prev + dt / MS_JE_MONAT, M);
        if (n >= M) setSpielt(false);
        return n;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [spielt, ruhig, M]);

  // k = ganzer Monatsindex (0 = Start), jahre = volle Betriebsjahre.
  const k = Math.min(M, Math.floor(t));
  const jahre = Math.floor(k / 12);
  const jahr = k === 0 ? rennen.startJahr : rennen.startJahr + Math.ceil(k / 12);
  const stand = k === 0 ? `${rennen.startJahr} · Start` : monatLabel(rennen.startJahr, k);

  const anlagen = rennen.laeufer.filter((l) => l.hatPv);
  const referenz = rennen.laeufer.find((l) => l.key === rennen.referenzKey)!;
  const farbe = (key: string) => {
    const i = anlagen.findIndex((l) => l.key === key);
    return i < 0 ? OHNE_FARBE : PV_FARBEN[i % PV_FARBEN.length];
  };

  const { chartRef, downloadPng, sharePng, shareWhatsApp, shareTwitter, isExporting, canNativeShare } =
    useChartExport({
      context: { title: `${WIDGETS.kostenrennen.title} — ${variante.label} — ${stand}` },
      filename: "amortisations-rennen-pv",
      shareText: WIDGETS.kostenrennen.shareText,
      shareUrl: WIDGETS.kostenrennen.shareUrl,
      mode: "node",
    });

  // ── Chart-Geometrie: mitlaufende Achsen ──────────────────────────────────
  // x reicht bis heute (mindestens ein Jahr, damit der Start nicht leer ist),
  // y bis knapp über den höchsten Nutzen, der bis heute vorkam. Beide werden
  // je Bild neu bestimmt — deshalb keine CSS-Übergänge, alles folgt `t`.
  const W = narrow ? 320 : 640, H = narrow ? 230 : 300;
  const P = { t: 18, r: narrow ? 74 : 96, b: 28, l: narrow ? 46 : 58 };
  const cW = W - P.l - P.r, cH = H - P.t - P.b;
  const y0 = P.t + cH;
  const xEnd = Math.max(12, t);
  const bisIdx = Math.min(M, Math.ceil(t));
  const sichtbarMax = Math.max(100, ...anlagen.map((l) => Math.max(...l.nutzen.slice(0, bisIdx + 1))));
  const yMax = niceMax(sichtbarMax * 1.12);
  const xL = (monatIdx: number) => r2(P.l + (Math.min(monatIdx, xEnd) / xEnd) * cW);
  const yL = (wert: number) => r2(y0 - (Math.max(0, wert) / yMax) * cH);
  const yTicks = [1, 2, 3, 4].map((q) => (yMax / 4) * q);
  // Jahresmarken: so viele, wie ohne Gedränge in die sichtbare Spanne passen.
  const jahreSichtbar = xEnd / 12;
  const xSchritt = narrow
    ? (jahreSichtbar <= 3 ? 1 : jahreSichtbar <= 10 ? 3 : 10)
    : (jahreSichtbar <= 6 ? 1 : jahreSichtbar <= 13 ? 2 : 5);
  const xJahre: number[] = [];
  for (let j = 0; j <= Math.floor(xEnd / 12); j += xSchritt) xJahre.push(j);
  // Die Linie bis heute: alle Monatspunkte bis zum letzten ganzen Monat plus
  // die interpolierte Spitze — nichts hinter „heute" wird gezeichnet.
  const pfad = (l: RennLaeufer) => {
    const pts = l.nutzen.slice(0, Math.floor(t) + 1).map((wert, i) => `${xL(i)},${yL(wert)}`);
    if (t > Math.floor(t)) pts.push(`${xL(t)},${yL(wertBei(l.nutzen, t))}`);
    return pts.join(" ");
  };

  // Spitzen (aktueller Punkt jeder Linie), von oben nach unten sortiert, damit
  // die Beschriftungen einander ausweichen: höhere Linie oben, tiefere unten.
  const spitzen = anlagen
    .map((l) => ({ l, wert: wertBei(l.nutzen, t), y: yL(wertBei(l.nutzen, t)) }))
    .sort((a, b) => a.y - b.y);
  const spitzeDy = (i: number) => (spitzen.length === 1 ? 4 : i === 0 ? -6 : 13);

  // ── Der Monatsstreifen: die Stromrechnung des jeweiligen Monats ──────────
  // Hier steht der Haushalt ohne Anlage neben den Anlagen: ohne 90–130 € im
  // Monat, mit Anlage im Winter rund 70 €, im Sommer unter null (Vergütung
  // über der Rechnung). Fenster: die letzten Monate, Balken je Haushalt.
  const FENSTER = narrow ? 24 : 36;
  const monatskosten = (l: RennLaeufer, kk: number) => l.monatlich[kk] - l.monatlich[kk - 1];
  const kEnde = Math.max(1, k);
  const kStart = Math.max(1, kEnde - FENSTER + 1);
  const fensterWerte = rennen.laeufer.flatMap((l) => Array.from({ length: kEnde - kStart + 1 }, (_, i) => monatskosten(l, kStart + i)));
  const sMax = niceMax(Math.max(100, ...fensterWerte));
  const sMin = Math.min(0, ...fensterWerte) < 0 ? -niceMax(Math.max(20, -Math.min(...fensterWerte))) : 0;
  const HS = narrow ? 120 : 130, PS = { t: 10, b: 18 };
  const sH = HS - PS.t - PS.b;
  const sY = (wert: number) => r2(PS.t + ((sMax - wert) / (sMax - sMin)) * sH);
  const sZero = sY(0);
  const slotW = cW / FENSTER;
  const barW = Math.max(1.5, (slotW - 2) / rennen.laeufer.length);
  const sX = (kk: number, li: number) => r2(P.l + (kk - (kEnde - FENSTER + 1)) * slotW + 1 + li * barW);

  // Der Satz unter dem Chart: je Anlage, wie viel der Anschaffung zurück ist —
  // mit den gerechneten Monatswerten, nicht mit Zwischenbildern.
  const statusZeilen = anlagen.map((l) => {
    const bezahlt = rennen.ueberholMonat[l.key];
    const n = l.nutzen[k];
    if (k === 0) return `${l.label}: Anschaffung ${fmtEuroVoll(l.investition)}, noch nichts eingebracht.`;
    if (bezahlt !== null && k >= bezahlt) {
      return k === bezahlt
        ? `${l.label}: bezahlt — ${fmtEuroVoll(n)} eingebracht, die Anschaffung von ${fmtEuroVoll(l.investition)} ist zurück.`
        : `${l.label}: bezahlt seit ${monatLabel(rennen.startJahr, bezahlt, true)}, seither ${fmtEuroVoll(n - l.investition)} Gewinn.`;
    }
    return `${l.label}: ${fmtEuroVoll(n)} von ${fmtEuroVoll(l.investition)} zurück (${Math.round((n / l.investition) * 100)} %).`;
  });

  const haushalt = PERSONEN[2];
  const lblStyle: React.CSSProperties = { fontSize: v("--font-size-caption"), fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: v("--color-text-muted") };
  const knopf: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: space.sm,
    height: 32, minWidth: 32, padding: `0 ${space.lg}px`, borderRadius: v("--radius-md"),
    border: "none", background: v("--color-accent"), color: v("--color-text-on-accent"),
    fontSize: v("--font-size-small"), fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
  };
  const legend: ExportLegendEntry[] = [
    ...anlagen.map((l) => ({ color: farbe(l.key), label: l.label, shape: "line" as const })),
    { color: OHNE_FARBE, label: `${referenz.label} (nur Monatsrechnung)`, shape: "box" as const },
  ];
  const amEnde = t >= M;

  return (
    <div
      ref={(el) => { (chartRef as { current: HTMLDivElement | null }).current = el; hostRef.current = el; }}
      onMouseEnter={() => setShowCredit(true)}
      onMouseLeave={() => setShowCredit(false)}
      onFocusCapture={() => setShowCredit(true)}
      style={{
        position: "relative",
        background: v("--color-bg"),
        border: `1px solid ${v("--color-border")}`,
        borderRadius: v("--radius-lg"),
        padding: `${space.xl}px ${space.xxl}px ${space.lg}px ${space.xl}px`,
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontSize: v("--font-size-body"), fontWeight: 700, color: v("--color-text-primary"), marginBottom: space.xxs }}>
        {WIDGETS.kostenrennen.title}
      </div>
      <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.5, marginBottom: space.lg }}>
        Zwei Anlagen auf demselben Haus, {N} Jahre: Was bringen sie ein, und wann sind sie bezahlt?{" "}
        <span style={{ verticalAlign: "middle" }}>
          <InfoTooltip title="Der Beispielhaushalt" ariaLabel="Angaben zum Beispielhaushalt">
            {haushalt.label} Personen mit {haushalt.verbrauch.toLocaleString("de-DE")} kWh Jahresverbrauch, teils im Homeoffice.
            Die Anlagen: {anlagen.map((l) => `${l.kwp} kWp${l.speicherKwh > 0 ? ` mit ${l.speicherKwh} kWh Speicher` : " ohne Speicher"} (${fmtEuroVoll(l.investition)})`).join(" und ")},
            Ertrag {rennen.annahmen.ertragKwp.toLocaleString("de-DE")} kWh je kWp (deutscher Schnitt bei optimaler Ausrichtung), Teileinspeisung zu{" "}
            {rennen.annahmen.einspeisungCt.toLocaleString("de-DE")} ct/kWh über 20 Jahre. Strompreis heute {rennen.annahmen.strompreisCt.toLocaleString("de-DE")} ct/kWh,
            {" "}{rennen.annahmen.preis}. Ertrag über die Jahre: {rennen.annahmen.wetter} — Näherungswerte ohne Gewähr.
          </InfoTooltip>
        </span>
      </div>

      {/* Aufstellung wählen — Umschalter nur auf der Seite; im Bild steht die
          gewählte Aufstellung als Zeile, sonst zeigte das Bild eine Wahl, die
          niemand kennt. */}
      {varianten.length > 1 && (
        <div {...{ [EXPORT_IGNORE_ATTR]: "" }} role="tablist" aria-label="Aufstellung" style={{ display: "flex", borderRadius: v("--radius-md"), border: `1px solid ${v("--color-border")}`, overflow: "hidden", marginBottom: space.md }}>
          {varianten.map((vr, i) => {
            const on = i === aktiv;
            return (
              <button key={vr.key} type="button" role="tab" aria-selected={on} onClick={() => setAktiv(i)}
                style={{ flex: 1, padding: `${space.md}px ${space.sm}px`, cursor: "pointer", textAlign: "center", background: on ? v("--color-accent-dim") : "transparent", border: "none", borderBottom: `2px solid ${on ? v("--color-accent") : "transparent"}` }}>
                <div style={{ fontSize: v("--font-size-small"), fontWeight: 700, color: on ? v("--color-accent") : v("--color-text-muted"), whiteSpace: "nowrap" }}>{narrow ? vr.kurz : vr.label}</div>
              </button>
            );
          })}
        </div>
      )}
      <ExportOnly style={{ marginBottom: space.xs }}>
        <span style={{ fontSize: v("--font-size-small"), fontWeight: 700, color: v("--color-text-primary") }}>Aufstellung: {variante.label}</span>
      </ExportOnly>
      <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-secondary"), lineHeight: 1.5, marginBottom: space.md }}>
        {variante.erklaerung}
      </div>

      {/* Jahr + Zustand */}
      <div style={{ display: "flex", alignItems: "baseline", gap: space.md, marginBottom: space.md }}>
        <span style={{ fontFamily: v("--font-mono"), fontSize: v("--font-size-display-md"), fontWeight: 800, color: v("--color-text-primary"), lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{jahr}</span>
        <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), whiteSpace: "nowrap" }}>
          {k === 0 ? "Start" : `${MONATE[(k - 1) % 12]} · ${jahre === 0 ? "erstes Jahr" : jahre === 1 ? "nach 1 Jahr" : `nach ${jahre} Jahren`}`}
        </span>
      </div>

      <ExportBox>
        <div style={{ display: "flex", alignItems: "center", gap: space.xs, marginBottom: space.xs }}>
          <span style={lblStyle}>Eingebracht seit {rennen.startJahr}</span>
          <InfoTooltip title="Was hier zählt" ariaLabel="Was als eingebracht zählt">
            Was die Anlage dem Haushalt bis zu diesem Monat gebracht hat: die gesparte Stromrechnung plus die Einspeisevergütung,
            beim Speicher abzüglich des Akku-Tauschs nach 15 Jahren. Die gestrichelte Linie ist die Anschaffung — wo die Kurve sie
            erreicht, ist die Anlage bezahlt. Im Sommer steigt die Kurve steil, im Winter flach.
          </InfoTooltip>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
          aria-label={`Eingebracht ${rennen.startJahr} bis ${stand}: ${anlagen.map((l) => `${l.label} ${fmtEuroVoll(l.nutzen[k])} von ${fmtEuroVoll(l.investition)}`).join(", ")}`}>
          {/* Raster + Skala. Die Skala steht dauerhaft: Ohne Überfahren (Bild,
              Telefon) gäbe es sonst keine Größenordnung. */}
          {yTicks.map((val) => (
            <g key={val}>
              <line x1={P.l} x2={P.l + cW} y1={yL(val)} y2={yL(val)} stroke="var(--color-chart-grid)" strokeWidth={0.5} />
              <text x={P.l - 6} y={yL(val) + 3} textAnchor="end" fontSize={fsPx("--font-size-micro")} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">
                {narrow ? `${Math.round(val / 1000)} T€` : fmtEuroVoll(val)}
              </text>
            </g>
          ))}
          <line x1={P.l} x2={P.l + cW} y1={y0} y2={y0} stroke="var(--color-chart-zero)" strokeWidth={1} />
          {xJahre.map((ji, i) => {
            const x = xL(ji * 12);
            const amRand = x > P.l + cW - 14;
            return (
              <text key={ji} x={x} y={y0 + 18} textAnchor={i === 0 ? "start" : amRand ? "end" : "middle"} fontSize={fsPx("--font-size-small")} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">
                {rennen.startJahr + ji}
              </text>
            );
          })}

          {/* Anschaffung je Anlage als gestrichelte Ziellinie — erst, wenn sie
              in die Skala rückt; vorher wäre sie außerhalb des Bildes. Die
              Beschriftung sitzt rechts, die Bezahlt-Marke an der Kreuzung —
              zwei Stellen, damit sie einander nicht überdecken. Liegen zwei
              Ziellinien dicht beieinander, steht die untere Beschriftung UNTER
              ihrer Linie und die obere darüber. */}
          {anlagen.filter((l) => l.investition <= yMax).map((l) => {
            const untere = anlagen.some((o) => o.investition > l.investition && o.investition <= yMax && yL(l.investition) - yL(o.investition) < 22);
            return (
              <g key={l.key}>
                <line x1={P.l} x2={P.l + cW} y1={yL(l.investition)} y2={yL(l.investition)} stroke={farbe(l.key)} strokeWidth={1} strokeDasharray="4 4" opacity={0.6} />
                {/* Schmal entfällt die Beschriftung — sie liefe in die Kurven; die
                    Statuszeilen nennen die Anschaffung. */}
                {!narrow && (
                  <text x={P.l + cW - 4} y={yL(l.investition) + (untere ? 11 : -4)} textAnchor="end" fontSize={fsPx("--font-size-micro")} fontWeight={700} fill={farbe(l.key)}>
                    Anschaffung {l.kurz} · {fmtEuroVoll(l.investition)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Die Linien bis heute. */}
          {anlagen.map((l) => (
            <polyline key={l.key} points={pfad(l)} fill="none" stroke={farbe(l.key)} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          ))}

          {/* Bezahlt-Marken: der Punkt, an dem eine Linie ihre Ziellinie erreicht hat. */}
          {anlagen.map((l) => {
            const bm = rennen.ueberholMonat[l.key];
            if (bm === null || t < bm) return null;
            // Dicht beieinander liegende Ziellinien: die Marke der unteren steht
            // unter dem Punkt, die der oberen darüber.
            const untere = anlagen.some((o) => o.investition > l.investition && yL(l.investition) - yL(o.investition) < 22);
            return (
              <g key={l.key}>
                <circle cx={xL(bm)} cy={yL(l.investition)} r={5} fill="var(--color-bg)" stroke={farbe(l.key)} strokeWidth={2} />
                <text x={xL(bm)} y={yL(l.investition) + (untere ? 19 : -10)} textAnchor={xL(bm) > P.l + cW * 0.75 ? "end" : "middle"} fontSize={fsPx(narrow ? "--font-size-micro" : "--font-size-caption")} fontWeight={700} fill="var(--color-positive)">
                  bezahlt · {monatLabel(rennen.startJahr, bm, true)}
                </text>
              </g>
            );
          })}

          {/* Spitzen mit Betrag */}
          {spitzen.map(({ l, wert, y }, i) => (
            <g key={l.key}>
              <circle cx={xL(t)} cy={y} r={4} fill={farbe(l.key)} stroke="var(--color-bg)" strokeWidth={1.5} />
              {/* Nie unter die Nulllinie: Bei 0 € säße der Betrag sonst auf dem Jahr der x-Achse. */}
              <text x={xL(t) + 8} y={Math.min(y + spitzeDy(i), y0 - 3)} textAnchor="start" fontSize={fsPx("--font-size-small")} fontWeight={800} fill={farbe(l.key)} fontFamily="var(--font-mono)" style={{ fontVariantNumeric: "tabular-nums" }}>
                {narrow ? `${(wert / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} T€` : fmtEuroVoll(l.nutzen[k])}
              </text>
            </g>
          ))}
        </svg>

        {/* Legende auf der Seite: die Spitzen tragen nur Zahlen, die Zuordnung
            braucht einen Namen. Im Bild kommt sie aus dem Bild-Fuß. */}
        <div {...{ [EXPORT_IGNORE_ATTR]: "" }} style={{ display: "flex", flexWrap: "wrap", gap: `${space.xs}px ${space.xl}px`, marginTop: space.xs }}>
          {anlagen.map((l) => (
            <span key={l.key} style={{ display: "inline-flex", alignItems: "center", gap: space.sm, fontSize: v("--font-size-small"), color: v("--color-text-secondary") }}>
              <span style={{ width: 14, height: 3, borderRadius: 2, background: farbe(l.key) }} />
              {narrow ? l.kurz : l.label}
            </span>
          ))}
        </div>

        {/* Monatsrechnung: derselbe Zeitläufer, andere Größe — hier steht der
            Haushalt ohne Anlage daneben und der Winter ist im Ausschlag. */}
        <div style={{ display: "flex", alignItems: "center", gap: space.xs, marginTop: space.lg, marginBottom: space.xxs }}>
          <span style={lblStyle}>Stromrechnung im Monat</span>
          <InfoTooltip title="Die Rechnung des Monats" ariaLabel="Was die Monatsrechnung zeigt">
            Was jeder Haushalt in diesem Monat für Strom zahlt — grau ohne Anlage, farbig die Anlagen: Restrechnung minus
            Einspeisevergütung. Ein Balken unter null heißt: Die Vergütung war höher als die Rechnung. Gezeigt werden die
            letzten {FENSTER} Monate.
          </InfoTooltip>
        </div>
        <svg viewBox={`0 0 ${W} ${HS}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
          aria-label={`Stromrechnung je Monat, letzte ${FENSTER} Monate bis ${stand}: ${k === 0 ? "noch keine" : rennen.laeufer.map((l) => `${l.kurz} ${fmtEuroVoll(monatskosten(l, kEnde))}`).join(", ")}`}>
          <text x={P.l - 6} y={sY(sMax) + 3} textAnchor="end" fontSize={fsPx("--font-size-micro")} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{fmtEuroVoll(sMax)}</text>
          {sMin < 0 && (
            <text x={P.l - 6} y={sY(sMin) + 3} textAnchor="end" fontSize={fsPx("--font-size-micro")} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{fmtEuroVoll(sMin)}</text>
          )}
          <line x1={P.l} x2={P.l + cW} y1={sZero} y2={sZero} stroke="var(--color-chart-zero)" strokeWidth={1} />
          {k > 0 && Array.from({ length: kEnde - kStart + 1 }, (_, i) => kStart + i).map((kk) => (
            <g key={kk}>
              {rennen.laeufer.map((l, li) => {
                const wert = monatskosten(l, kk);
                const y1 = sY(Math.max(0, wert)), y2 = sY(Math.min(0, wert));
                return <rect key={l.key} x={sX(kk, li)} y={y1} width={r2(barW - 0.6)} height={r2(Math.max(0.5, y2 - y1))} fill={farbe(l.key)} opacity={kk === kEnde ? 1 : 0.75} />;
              })}
              {(kk - 1) % 12 === 0 && (
                <text x={sX(kk, 0)} y={HS - 4} textAnchor="start" fontSize={fsPx("--font-size-micro")} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">
                  {rennen.startJahr + Math.ceil(kk / 12)}
                </text>
              )}
            </g>
          ))}
          {k > 0 && rennen.laeufer.map((l, li) => (
            <text key={l.key} x={P.l + cW + 8} y={PS.t + 10 + li * 14} textAnchor="start" fontSize={fsPx("--font-size-caption")} fontWeight={800} fill={farbe(l.key)} fontFamily="var(--font-mono)">
              {fmtEuroVoll(monatskosten(l, kEnde))}
            </text>
          ))}
        </svg>

        <div style={{ marginTop: space.lg, fontSize: v("--font-size-small"), color: v("--color-text-secondary"), lineHeight: 1.5, minHeight: 36 }}>
          {statusZeilen.map((z, i) => <div key={i}>{z}</div>)}
        </div>
      </ExportBox>

      {/* Steuerung — nur auf der Seite, nie im Bild */}
      <div {...{ [EXPORT_IGNORE_ATTR]: "" }} style={{ display: "flex", alignItems: "center", gap: space.lg, marginTop: space.lg }}>
        <button
          type="button"
          onClick={() => {
            if (spielt) { setSpielt(false); return; }
            if (amEnde) setT(0);
            gestartet.current = true;
            setSpielt(true);
          }}
          aria-label={spielt ? "Anhalten" : amEnde ? "Noch einmal abspielen" : "Abspielen"}
          style={knopf}
        >
          {spielt ? <IconPause size={14} /> : amEnde ? <IconRefresh size={14} /> : <IconPlay size={14} />}
          <span>{spielt ? "Pause" : amEnde ? "Noch einmal" : t === 0 ? "Rennen starten" : "Weiter"}</span>
        </button>
        <input
          type="range"
          min={0}
          max={M}
          step={1}
          value={k}
          onChange={(e) => { setSpielt(false); gestartet.current = true; setT(Number(e.target.value)); }}
          aria-label="Jahr wählen"
          aria-valuetext={stand}
          style={{ flex: 1, accentColor: v("--color-accent"), minWidth: 0 }}
        />
      </div>

      {/* Im Bild: der eingestellte Stand steht schon im Kopf (Jahr + Monat);
          hier nur der Hinweis, dass das Bild einen Zwischenstand zeigt. */}
      {k < M && (
        <ExportOnly style={{ marginTop: space.md }}>
          <span style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
            Zwischenstand {k === 0 ? "vor dem ersten Betriebsjahr" : `im ${monatLabel(rennen.startJahr, k)}`} von {N} Jahren
          </span>
        </ExportOnly>
      )}

      <WidgetFooter
        widget={WIDGETS.kostenrennen}
        chartExport={{ downloadPng, sharePng, shareWhatsApp, shareTwitter, isExporting, canNativeShare }}
        onsite={onsite}
        branding={branding}
        showEmbed={showEmbed}
        narrow={narrow}
      />

      <WidgetSourceEdge
        widget={WIDGETS.kostenrennen}
        visible={!onsite || showCredit}
        stand={preiseStandIso ? formatDataAsOf(preiseStandIso) : undefined}
      />

      <WidgetExportFooter
        widget={WIDGETS.kostenrennen}
        legend={legend}
        note="Beispielhaushalt, Modellrechnung von solar-check.io · Näherungswerte, ohne Gewähr"
      />
    </div>
  );
}
