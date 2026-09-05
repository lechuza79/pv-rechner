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
import type { Kostenrennen, RennLaeufer } from "../../lib/kostenrennen";

// Das Amortisations-Rennen: EIN Haushalt, ohne und mit Anlage, 25 Jahre. Die
// PV-Linie zeichnet Monat für Monat, was die Anlage eingebracht hat (Ersparnis
// plus Vergütung) — ab null, wie ein Depot, in das jeden Monat eingezahlt
// wird; der Haushalt ohne Anlage bleibt auf null liegen. Eine gestrichelte
// Marke zeigt die Anschaffung; wo die Linie sie erreicht, ist die Anlage
// bezahlt. Dieser Monat IST die Amortisation des Rechners (lib/kostenrennen.ts
// rechnet mit denselben Funktionen).
//
// Die Bewegung kommt aus dem echten Wetter: Jeder Monat trägt die Strahlung
// des wiederholten Kalenderjahrs (DWD-Monatsraster), kein Jahr gleicht dem
// anderen — ein trüber Mai bremst, ein Rekordsommer treibt. Die Achsen laufen
// mit (x bis heute, y bis knapp über den bisherigen Höchststand), damit das
// erste Jahr das Bild füllt und die Treppe aus Sommer und Winter sichtbar ist.
//
// Selbst-enthaltende Karte nach dem Muster von GruengasWidget: dasselbe Bauteil
// steht unter /embed/pv-kostenrennen und direkt gerendert im Ratgeber (onsite).
// Abspielen und Schieberegler tragen data-sc-export-ignore; das Bild zeigt den
// eingestellten Stand als Text.

const MS_JE_MONAT = 80; // 25 Jahre in rund 24 Sekunden
const SCHRITT_MS = 500; // bei reduzierter Bewegung: ein Jahr je Schritt

const MONATE_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

/** Kalenderbeschriftung eines Monatsindex (1..12·N): Monat m des Betriebsjahrs
 *  i, benannt wie im Rechner-Chart (Startjahr + i). */
function monatLabel(startJahr: number, k: number, kurz = false): string {
  const i = Math.ceil(k / 12);
  const m = (k - 1) % 12;
  return `${(kurz ? MONATE_KURZ : MONATE)[m]} ${startJahr + i}`;
}

// Semantisch, nicht themebar: die Anlage im Akzent, der Haushalt ohne Anlage neutral.
const FARBE_PV = "var(--color-accent)";
const FARBE_OHNE = "var(--color-text-primary)";

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
  rennen: Kostenrennen;
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

function KostenrennenCard({ rennen, onsite = false, branding = true, showEmbed = false, autoplay = true, preiseStandIso }: Props) {
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

  const pv = rennen.laeufer.find((l) => l.hatPv)!;
  const ohne = rennen.laeufer.find((l) => l.key === rennen.referenzKey)!;
  const bezahltMonat = rennen.ueberholMonat[pv.key];

  const { chartRef, downloadPng, sharePng, shareWhatsApp, shareTwitter, isExporting, canNativeShare } =
    useChartExport({
      context: { title: `${WIDGETS.kostenrennen.title} — ${stand}` },
      filename: "amortisations-rennen-pv",
      shareText: WIDGETS.kostenrennen.shareText,
      shareUrl: WIDGETS.kostenrennen.shareUrl,
      mode: "node",
    });

  // ── Chart-Geometrie: mitlaufende Achsen ──────────────────────────────────
  // x reicht bis heute (mindestens ein Jahr, damit der Start nicht leer ist),
  // y bis knapp über den höchsten Nutzen, der bis heute vorkam. Beide werden
  // je Bild neu bestimmt — deshalb keine CSS-Übergänge, alles folgt `t`.
  const W = narrow ? 320 : 640, H = narrow ? 260 : 340;
  const P = { t: 18, r: narrow ? 74 : 96, b: 28, l: narrow ? 46 : 58 };
  const cW = W - P.l - P.r, cH = H - P.t - P.b;
  const y0 = P.t + cH;
  const xEnd = Math.max(12, t);
  const bisIdx = Math.min(M, Math.ceil(t));
  const sichtbarMax = Math.max(100, ...pv.nutzen.slice(0, bisIdx + 1));
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
  const pvSpitzeY = yL(wertBei(pv.nutzen, t));
  const zielSichtbar = pv.investition <= yMax;

  // Der Satz unter dem Chart — mit den gerechneten Monatswerten, nicht mit Zwischenbildern.
  const n = pv.nutzen[k];
  const status = k === 0
    ? `Start: Die Anlage kostet ${fmtEuroVoll(pv.investition)} und hat noch nichts eingebracht. Der Haushalt ohne Anlage bleibt bei null.`
    : bezahltMonat !== null && k >= bezahltMonat
      ? k === bezahltMonat
        ? `${monatLabel(rennen.startJahr, k)}: Die Anlage ist bezahlt — ${fmtEuroVoll(n)} eingebracht, die Anschaffung von ${fmtEuroVoll(pv.investition)} ist zurück.`
        : `Bezahlt seit ${monatLabel(rennen.startJahr, bezahltMonat, true)}; seither ${fmtEuroVoll(n - pv.investition)} Gewinn gegenüber dem Haushalt ohne Anlage.`
      : `${fmtEuroVoll(n)} von ${fmtEuroVoll(pv.investition)} zurück (${Math.round((n / pv.investition) * 100)} %). Der Haushalt ohne Anlage hat in derselben Zeit ${fmtEuroVoll(ohne.monatlich[k])} für Strom bezahlt.`;

  const haushalt = PERSONEN[2];
  const lblStyle: React.CSSProperties = { fontSize: v("--font-size-caption"), fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: v("--color-text-muted") };
  const knopf: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: space.sm,
    height: 32, minWidth: 32, padding: `0 ${space.lg}px`, borderRadius: v("--radius-md"),
    border: "none", background: v("--color-accent"), color: v("--color-text-on-accent"),
    fontSize: v("--font-size-small"), fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
  };
  const legend: ExportLegendEntry[] = [
    { color: FARBE_PV, label: `${pv.label} — eingebracht`, shape: "line" },
    { color: FARBE_OHNE, label: ohne.label, shape: "line" },
  ];
  const amEnde = t >= M;
  const fenster = rennen.wetterFenster;

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
        Ein Haushalt, {N} Jahre, {fenster ? `mit dem Wetter der Jahre ${fenster.von}–${fenster.bis}` : "im Referenzjahr"}: Was bringt die
        Anlage ein, und wann ist sie bezahlt?{" "}
        <span style={{ verticalAlign: "middle" }}>
          <InfoTooltip title="Der Beispielhaushalt" ariaLabel="Angaben zum Beispielhaushalt">
            {haushalt.label} Personen mit {haushalt.verbrauch.toLocaleString("de-DE")} kWh Jahresverbrauch, teils im Homeoffice.
            Die Anlage: {pv.kwp} kWp{pv.speicherKwh > 0 ? ` mit ${pv.speicherKwh} kWh Speicher` : " ohne Speicher"} für {fmtEuroVoll(pv.investition)},
            Ertrag {rennen.annahmen.ertragKwp.toLocaleString("de-DE")} kWh je kWp (deutscher Schnitt bei optimaler Ausrichtung), Teileinspeisung zu{" "}
            {rennen.annahmen.einspeisungCt.toLocaleString("de-DE")} ct/kWh über 20 Jahre. Strompreis {rennen.annahmen.strompreisCt.toLocaleString("de-DE")} ct/kWh,
            Anstieg {rennen.annahmen.steigerungPct.toLocaleString("de-DE")} % pro Jahr. Wetter: {rennen.annahmen.wetter} — Näherungswerte ohne Gewähr.
          </InfoTooltip>
        </span>
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
            Was die Anlage dem Haushalt bis zu diesem Monat gebracht hat: die gesparte Stromrechnung plus die Einspeisevergütung.
            Die gestrichelte Linie ist die Anschaffung — wo die Kurve sie erreicht, ist die Anlage bezahlt. Der Haushalt ohne
            Anlage bleibt bei null. Die Sonne kommt Monat für Monat aus den Wetterjahren {fenster ? `${fenster.von}–${fenster.bis}` : "des Referenzjahrs"}:
            Im Sommer steigt die Kurve steil, im Winter flach, und kein Jahr gleicht dem anderen.
          </InfoTooltip>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
          aria-label={`Eingebracht ${rennen.startJahr} bis ${stand}: ${pv.label} ${fmtEuroVoll(pv.nutzen[k])} von ${fmtEuroVoll(pv.investition)}; ${ohne.label} 0 €`}>
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
          {xJahre.map((ji, i) => {
            const x = xL(ji * 12);
            const amRand = x > P.l + cW - 14;
            return (
              <text key={ji} x={x} y={y0 + 18} textAnchor={i === 0 ? "start" : amRand ? "end" : "middle"} fontSize={fsPx("--font-size-small")} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">
                {rennen.startJahr + ji}
              </text>
            );
          })}

          {/* Anschaffung als gestrichelte Ziellinie — erst, wenn sie in die
              Skala rückt; vorher wäre sie außerhalb des Bildes. */}
          {zielSichtbar && (
            <g>
              <line x1={P.l} x2={P.l + cW} y1={yL(pv.investition)} y2={yL(pv.investition)} stroke={FARBE_PV} strokeWidth={1} strokeDasharray="4 4" opacity={0.6} />
              {!narrow && (
                <text x={P.l + cW - 4} y={yL(pv.investition) - 4} textAnchor="end" fontSize={fsPx("--font-size-micro")} fontWeight={700} fill={FARBE_PV}>
                  Anschaffung · {fmtEuroVoll(pv.investition)}
                </text>
              )}
            </g>
          )}

          {/* Der Haushalt ohne Anlage: liegt auf null — die Linie am Boden, bis heute. */}
          <line x1={P.l} x2={xL(t)} y1={y0} y2={y0} stroke={FARBE_OHNE} strokeWidth={2.5} strokeLinecap="round" />
          {/* Die PV-Linie bis heute. */}
          <polyline points={pfad(pv)} fill="none" stroke={FARBE_PV} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

          {/* Bezahlt-Marke: der Punkt, an dem die Linie ihre Ziellinie erreicht hat. */}
          {bezahltMonat !== null && t >= bezahltMonat && (
            <g>
              <circle cx={xL(bezahltMonat)} cy={yL(pv.investition)} r={5} fill="var(--color-bg)" stroke={FARBE_PV} strokeWidth={2} />
              <text x={xL(bezahltMonat)} y={yL(pv.investition) + 19} textAnchor={xL(bezahltMonat) > P.l + cW * 0.75 ? "end" : "middle"} fontSize={fsPx(narrow ? "--font-size-micro" : "--font-size-caption")} fontWeight={700} fill="var(--color-positive)">
                bezahlt · {monatLabel(rennen.startJahr, bezahltMonat, true)}
              </text>
            </g>
          )}

          {/* Spitzen mit Betrag: PV oben (oder an der Linie), ohne Anlage am Boden. */}
          <circle cx={xL(t)} cy={pvSpitzeY} r={4} fill={FARBE_PV} stroke="var(--color-bg)" strokeWidth={1.5} />
          <text x={xL(t) + 8} y={Math.min(pvSpitzeY + 4, y0 - 14)} textAnchor="start" fontSize={fsPx("--font-size-small")} fontWeight={800} fill={FARBE_PV} fontFamily="var(--font-mono)" style={{ fontVariantNumeric: "tabular-nums" }}>
            {narrow ? `${(wertBei(pv.nutzen, t) / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} T€` : fmtEuroVoll(pv.nutzen[k])}
          </text>
          <circle cx={xL(t)} cy={y0} r={4} fill={FARBE_OHNE} stroke="var(--color-bg)" strokeWidth={1.5} />
          <text x={xL(t) + 8} y={y0 + 4} textAnchor="start" fontSize={fsPx("--font-size-small")} fontWeight={800} fill={FARBE_OHNE} fontFamily="var(--font-mono)">
            0 €
          </text>
        </svg>

        {/* Legende auf der Seite: die Spitzen tragen nur Zahlen, die Zuordnung
            braucht einen Namen. Im Bild kommt sie aus dem Bild-Fuß. */}
        <div {...{ [EXPORT_IGNORE_ATTR]: "" }} style={{ display: "flex", flexWrap: "wrap", gap: `${space.xs}px ${space.xl}px`, marginTop: space.xs }}>
          {[{ l: pv, f: FARBE_PV }, { l: ohne, f: FARBE_OHNE }].map(({ l, f }) => (
            <span key={l.key} style={{ display: "inline-flex", alignItems: "center", gap: space.sm, fontSize: v("--font-size-small"), color: v("--color-text-secondary") }}>
              <span style={{ width: 14, height: 3, borderRadius: 2, background: f }} />
              {narrow ? l.kurz : l.label}
            </span>
          ))}
        </div>

        <div style={{ marginTop: space.lg, fontSize: v("--font-size-small"), color: v("--color-text-secondary"), lineHeight: 1.5, minHeight: 36 }}>
          {status}
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
