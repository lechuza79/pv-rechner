"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import type { Kostenrennen } from "../../lib/kostenrennen";
import { tagesverlauf, tagDatum } from "../../lib/kostenrennen-tage";

// Das Stromkosten-Rennen: EIN Haushalt, ohne und mit Anlage, 25 Jahre. Beide
// Linien zeichnen Tag für Tag, was der Haushalt bis dahin für Strom ausgegeben
// hat. Der PV-Haushalt startet mit der Anschaffung vorn; wo die Linie ohne
// Anlage seine kreuzt, ist die Anlage bezahlt — derselbe Monat wie die
// Amortisation des Rechners (lib/kostenrennen.ts rechnet mit denselben Funktionen).
//
// Die Bewegung kommt aus dem echten Wetter: Jeder Monat trägt die Strahlung des
// wiederholten Kalenderjahrs (DWD-Monatsraster), jeder Tag darin seinen Anteil
// nach der Tagesstrahlung der DWD-Stationen (lib/kostenrennen-tage.ts). Eine
// Regenwoche ist flach, eine Hochdrucklage steil, kein Jahr gleicht dem anderen.
//
// Die Achsen laufen mit, wie bei einem Race-Chart: Die x-Achse reicht vom
// Start bis heute (mindestens ein Jahr) und wächst, bis am Ende alle 25 Jahre
// auf einer Breite stehen; die y-Achse ist auf die Linien im Bild gepasst. In
// einer festen Skala 0–40.000 € wäre die Bewegung eines Monats von Anfang an
// ein Strich; so füllt das erste Jahr das Bild, und das Bild zoomt heraus.
//
// Selbst-enthaltende Karte nach dem Muster von GruengasWidget: dasselbe Bauteil
// steht unter /embed/pv-kostenrennen und direkt gerendert im Ratgeber (onsite).
// Abspielen und Schieberegler tragen data-sc-export-ignore; das Bild zeigt den
// eingestellten Stand als Text.

const MS_JE_TAG = 3.4; // 25 Jahre in rund 31 Sekunden
const MIN_TAGE = 365; // das erste Jahr füllt das Bild
const SCHRITT_MS = 500; // bei reduzierter Bewegung: ein Jahr je Schritt

const MONATE_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

// Semantisch, nicht themebar: die Anlage im Akzent, der Haushalt ohne Anlage neutral.
const FARBE_PV = "var(--color-accent)";
const FARBE_OHNE = "var(--color-text-primary)";

// 2 Nachkommastellen: hält Server-/Client-Render exakt gleich.
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Schöne Schrittweite für eine Achse mit rund vier Stufen. */
function niceStep(spanne: number): number {
  const roh = spanne / 4;
  const step = Math.pow(10, Math.floor(Math.log10(roh)));
  const f = roh / step;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * step;
}

/** Wert einer Tagesreihe zur Gleitkomma-Zeit t (linear zwischen zwei Tagen). */
function wertBei(reihe: Float64Array, t: number): number {
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
  const verlauf = useMemo(() => tagesverlauf(rennen), [rennen]);
  const T = verlauf.tage;
  const [t, setT] = useState(0);
  const [spielt, setSpielt] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [showCredit, setShowCredit] = useState(false);
  const [ruhig, setRuhig] = useState(false);
  const gestartet = useRef(false);
  const hostRef = useRef<HTMLDivElement>(null);

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
  // Bei reduzierter Bewegung bleibt sie stehen; die Zeit wählt man dann selbst.
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
          const k = verlauf.monatVonTag[Math.min(T, Math.floor(prev))] || 0;
          const naechstesJahr = Math.min(12 * (Math.floor(k / 12) + 1), 12 * verlauf.jahre);
          const n = naechstesJahr >= 12 * verlauf.jahre ? T : verlauf.ersterTag[naechstesJahr + 1] - 1;
          if (n >= T) setSpielt(false);
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
        const n = Math.min(prev + dt / MS_JE_TAG, T);
        if (n >= T) setSpielt(false);
        return n;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [spielt, ruhig, T, verlauf]);

  const tag = Math.min(T, Math.floor(t));
  const k = verlauf.monatVonTag[tag] || 0; // Monatsindex 1..300, 0 am Start
  const datum = tagDatum(verlauf, rennen.startJahr, tag);
  const jahre = Math.floor(k / 12);
  const stand = tag === 0 ? `${rennen.startJahr} · Start` : `${datum.tag}. ${MONATE[datum.monat]} ${datum.jahr}`;

  const pv = rennen.laeufer.find((l) => l.hatPv)!;
  const ohne = rennen.laeufer.find((l) => l.key === rennen.referenzKey)!;
  const kPv = verlauf.kosten[pv.key];
  const kOhne = verlauf.kosten[ohne.key];
  const bezahltMonat = rennen.ueberholMonat[pv.key];
  // Der Tag der Kreuzung: erster Tag im Bezahlt-Monat, an dem ohne ≥ mit.
  const bezahltTag = useMemo(() => {
    if (bezahltMonat === null) return null;
    const von = verlauf.ersterTag[bezahltMonat];
    const bis = bezahltMonat < 12 * verlauf.jahre ? verlauf.ersterTag[bezahltMonat + 1] - 1 : T;
    for (let d = von; d <= bis; d++) if (kOhne[d] >= kPv[d]) return d;
    return bis;
  }, [bezahltMonat, verlauf, kOhne, kPv, T]);

  const { chartRef, downloadPng, sharePng, shareWhatsApp, shareTwitter, isExporting, canNativeShare } =
    useChartExport({
      context: { title: `${WIDGETS.kostenrennen.title} — ${stand}` },
      filename: "stromkosten-rennen-pv",
      shareText: WIDGETS.kostenrennen.shareText,
      shareUrl: WIDGETS.kostenrennen.shareUrl,
      mode: "node",
    });

  // ── Mitlaufende Achsen: x vom Start bis heute, y auf die Linien gepasst ──
  const W = narrow ? 320 : 640, H = narrow ? 260 : 340;
  const P = { t: 18, r: narrow ? 74 : 96, b: 28, l: narrow ? 50 : 62 };
  const cW = W - P.l - P.r, cH = H - P.t - P.b;
  const y0 = P.t + cH;
  const xEnd = Math.max(MIN_TAGE, t);
  const xStart = 0;
  const iStart = 0;
  const iEnd = Math.min(T, Math.ceil(t));
  let lo = Infinity, hi = -Infinity;
  for (let d = iStart; d <= iEnd; d++) {
    lo = Math.min(lo, kPv[d], kOhne[d]);
    hi = Math.max(hi, kPv[d], kOhne[d]);
  }
  if (!Number.isFinite(lo)) { lo = 0; hi = 1; }
  const pad = Math.max(50, (hi - lo) * 0.08);
  const yMin = Math.max(0, lo - pad), yMax = hi + pad;
  const yStep = niceStep(yMax - yMin);
  const yTicks: number[] = [];
  for (let val = Math.ceil(yMin / yStep) * yStep; val <= yMax; val += yStep) yTicks.push(val);
  const xL = (tagIdx: number) => r2(P.l + ((Math.min(tagIdx, xEnd) - xStart) / (xEnd - xStart)) * cW);
  const yL = (wert: number) => r2(y0 - ((wert - yMin) / (yMax - yMin)) * cH);
  // Jahresmarken: jeder Januar im Bild, ausgedünnt, sobald es eng wird.
  const jahreImBild = xEnd / 365;
  const xSchritt = narrow
    ? (jahreImBild <= 3 ? 1 : jahreImBild <= 10 ? 3 : 10)
    : (jahreImBild <= 6 ? 1 : jahreImBild <= 13 ? 2 : 5);
  const xJahre: { x: number; jahr: number }[] = [];
  for (let m = 1, j = 1; m <= 12 * verlauf.jahre; m += 12, j++) {
    const d = verlauf.ersterTag[m];
    if (d <= xEnd && (j - 1) % xSchritt === 0) xJahre.push({ x: xL(d), jahr: rennen.startJahr + Math.ceil(m / 12) });
  }
  // Linien: alle Tage bis heute plus die interpolierte Spitze. Bei vielen
  // Tagen nur jeden n-ten Punkt — mehr als ein Punkt je Pixel zeichnet nichts.
  const pfad = (reihe: Float64Array) => {
    const bis = Math.min(T, Math.floor(t));
    const schritt = Math.max(1, Math.floor((bis - iStart) / (cW * 2)));
    const pts: string[] = [];
    for (let d = iStart; d <= bis; d += schritt) pts.push(`${xL(d)},${yL(reihe[d])}`);
    if (bis % schritt !== 0) pts.push(`${xL(bis)},${yL(reihe[bis])}`);
    if (t > Math.floor(t) && t < T) pts.push(`${xL(t)},${yL(wertBei(reihe, t))}`);
    return pts.join(" ");
  };
  const spitzen = [
    { key: pv.key, farbe: FARBE_PV, wert: wertBei(kPv, t), zahl: kPv[tag] },
    { key: ohne.key, farbe: FARBE_OHNE, wert: wertBei(kOhne, t), zahl: kOhne[tag] },
  ].map((s) => ({ ...s, y: yL(s.wert) })).sort((a, b) => a.y - b.y);
  const spitzeDy = (i: number) => (Math.abs(spitzen[0].y - spitzen[1].y) < 16 ? (i === 0 ? -6 : 13) : 4);

  // Der Satz unter dem Chart — mit den gerechneten Tageswerten.
  const diff = kPv[tag] - kOhne[tag];
  const status = tag === 0
    ? `Start: Der PV-Haushalt hat ${fmtEuroVoll(pv.investition)} für die Anlage ausgegeben, der andere noch nichts.`
    : bezahltTag !== null && tag >= bezahltTag
      ? tag === bezahltTag
        ? `${stand}: Die Linien kreuzen sich — die Anlage hat sich bezahlt gemacht, ab jetzt liegt der PV-Haushalt vorn.`
        : `Der PV-Haushalt hat bis hier ${fmtEuroVoll(-diff)} weniger für Strom ausgegeben.`
      : `Der PV-Haushalt liegt noch ${fmtEuroVoll(diff)} hinten — die Anschaffung ist noch nicht zurück.`;

  const haushalt = PERSONEN[2];
  const fenster = rennen.wetterFenster;
  const lblStyle: React.CSSProperties = { fontSize: v("--font-size-caption"), fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: v("--color-text-muted") };
  const knopf: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: space.sm,
    height: 32, minWidth: 32, padding: `0 ${space.lg}px`, borderRadius: v("--radius-md"),
    border: "none", background: v("--color-accent"), color: v("--color-text-on-accent"),
    fontSize: v("--font-size-small"), fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
  };
  const legend: ExportLegendEntry[] = [
    { color: FARBE_OHNE, label: ohne.label, shape: "line" },
    { color: FARBE_PV, label: pv.label, shape: "line" },
  ];
  const amEnde = t >= T;

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
        Ein Haushalt, {rennen.jahre} Jahre, {fenster ? `das Wetter der Jahre ${fenster.von}–${fenster.bis}` : "ein Referenzjahr"}: Wer hat wann mehr für Strom bezahlt?{" "}
        <span style={{ verticalAlign: "middle" }}>
          <InfoTooltip title="Der Beispielhaushalt" ariaLabel="Angaben zum Beispielhaushalt">
            {haushalt.label} Personen mit {haushalt.verbrauch.toLocaleString("de-DE")} kWh Jahresverbrauch, teils im Homeoffice.
            Die Anlage: {pv.kwp} kWp{pv.speicherKwh > 0 ? ` mit ${pv.speicherKwh} kWh Speicher` : " ohne Speicher"} für {fmtEuroVoll(pv.investition)},
            Ertrag {rennen.annahmen.ertragKwp.toLocaleString("de-DE")} kWh je kWp (deutscher Schnitt bei optimaler Ausrichtung), Teileinspeisung zu{" "}
            {rennen.annahmen.einspeisungCt.toLocaleString("de-DE")} ct/kWh über 20 Jahre. Strompreis {rennen.annahmen.strompreisCt.toLocaleString("de-DE")} ct/kWh,
            Anstieg {rennen.annahmen.steigerungPct.toLocaleString("de-DE")} % pro Jahr. Wetter: {rennen.annahmen.wetter}; innerhalb des Monats nach der
            Tagesstrahlung der DWD-Stationen verteilt — Näherungswerte ohne Gewähr.
          </InfoTooltip>
        </span>
      </div>

      {/* Datum + Zustand */}
      <div style={{ display: "flex", alignItems: "baseline", gap: space.md, marginBottom: space.md }}>
        <span style={{ fontFamily: v("--font-mono"), fontSize: v("--font-size-display-md"), fontWeight: 800, color: v("--color-text-primary"), lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{tag === 0 ? rennen.startJahr : datum.jahr}</span>
        <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
          {tag === 0 ? "Start" : `${datum.tag}. ${MONATE_KURZ[datum.monat]} · ${jahre === 0 ? "erstes Jahr" : jahre === 1 ? "nach 1 Jahr" : `nach ${jahre} Jahren`}`}
        </span>
      </div>

      <ExportBox>
        <div style={{ display: "flex", alignItems: "center", gap: space.xs, marginBottom: space.xs }}>
          <span style={lblStyle}>Stromkosten seit {rennen.startJahr}</span>
          <InfoTooltip title="Was hier zählt" ariaLabel="Was als Stromkosten zählt">
            Alles, was der Haushalt bis zu diesem Tag für Strom ausgegeben hat: die Stromrechnung mit steigendem Preis, beim
            PV-Haushalt dazu die Anschaffung der Anlage, abzüglich der Einspeisevergütung. Wo sich die Linien kreuzen, ist die
            Anlage bezahlt. Die Zeitachse wächst vom ersten Jahr bis zum ganzen Zeitraum, die Geldskala passt sich den Linien an.
          </InfoTooltip>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
          aria-label={`Stromkosten ${rennen.startJahr} bis ${stand}: ${ohne.label} ${fmtEuroVoll(kOhne[tag])}, ${pv.label} ${fmtEuroVoll(kPv[tag])}`}>
          {/* Raster + Skala. Die Skala steht dauerhaft: Ohne Überfahren (Bild,
              Telefon) gäbe es sonst keine Größenordnung. */}
          {yTicks.map((val) => (
            <g key={val}>
              <line x1={P.l} x2={P.l + cW} y1={yL(val)} y2={yL(val)} stroke="var(--color-chart-grid)" strokeWidth={0.5} />
              <text x={P.l - 6} y={yL(val) + 3} textAnchor="end" fontSize={fsPx("--font-size-micro")} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">
                {narrow ? `${(val / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} T€` : fmtEuroVoll(val)}
              </text>
            </g>
          ))}
          <line x1={P.l} x2={P.l + cW} y1={y0} y2={y0} stroke="var(--color-chart-zero)" strokeWidth={1} />
          {xJahre.map(({ x, jahr }) => (
            <g key={jahr}>
              <line x1={x} x2={x} y1={P.t} y2={y0} stroke="var(--color-chart-grid)" strokeWidth={0.5} />
              <text x={x + 4} y={y0 + 18} textAnchor="start" fontSize={fsPx("--font-size-small")} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{x > P.l + cW - 40 ? "" : jahr}</text>
            </g>
          ))}

          {/* Die Linien im Fenster, bis heute. */}
          <polyline points={pfad(kOhne)} fill="none" stroke={FARBE_OHNE} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={pfad(kPv)} fill="none" stroke={FARBE_PV} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

          {/* Kreuzung: erscheint, sobald die Linien sie erreicht haben, und bleibt, solange sie im Fenster liegt. */}
          {bezahltTag !== null && t >= bezahltTag && (
            <g>
              <line x1={xL(bezahltTag)} x2={xL(bezahltTag)} y1={P.t} y2={y0} stroke="var(--color-positive)" strokeWidth={1} strokeDasharray="3 3" />
              <text x={xL(bezahltTag)} y={P.t - 6} textAnchor={xL(bezahltTag) > P.l + cW * 0.75 ? "end" : "middle"} fontSize={fsPx("--font-size-caption")} fontWeight={700} fill="var(--color-positive)">
                Anlage bezahlt · {MONATE_KURZ[tagDatum(verlauf, rennen.startJahr, bezahltTag).monat]} {tagDatum(verlauf, rennen.startJahr, bezahltTag).jahr}
              </text>
            </g>
          )}

          {/* Spitzen mit Betrag */}
          {spitzen.map((s, i) => (
            <g key={s.key}>
              <circle cx={xL(t)} cy={s.y} r={4} fill={s.farbe} stroke="var(--color-bg)" strokeWidth={1.5} />
              <text x={xL(t) + 8} y={Math.min(Math.max(s.y + spitzeDy(i), P.t + 8), y0 - 2)} textAnchor="start" fontSize={fsPx("--font-size-small")} fontWeight={800} fill={s.farbe} fontFamily="var(--font-mono)" style={{ fontVariantNumeric: "tabular-nums" }}>
                {narrow ? `${(s.wert / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} T€` : fmtEuroVoll(s.zahl)}
              </text>
            </g>
          ))}
        </svg>

        {/* Legende auf der Seite: die Spitzen tragen nur Zahlen, die Zuordnung
            braucht einen Namen. Im Bild kommt sie aus dem Bild-Fuß. */}
        <div {...{ [EXPORT_IGNORE_ATTR]: "" }} style={{ display: "flex", flexWrap: "wrap", gap: `${space.xs}px ${space.xl}px`, marginTop: space.xs }}>
          {[{ l: ohne, f: FARBE_OHNE }, { l: pv, f: FARBE_PV }].map(({ l, f }) => (
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
          max={T}
          step={1}
          value={tag}
          onChange={(e) => { setSpielt(false); gestartet.current = true; setT(Number(e.target.value)); }}
          aria-label="Jahr wählen"
          aria-valuetext={stand}
          style={{ flex: 1, accentColor: v("--color-accent"), minWidth: 0 }}
        />
      </div>

      {/* Im Bild: der eingestellte Stand steht schon im Kopf (Datum); hier nur der
          Hinweis, dass das Bild einen Zwischenstand und ein Zeitfenster zeigt. */}
      <ExportOnly style={{ marginTop: space.md }}>
        <span style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
          {tag < T ? `Zwischenstand am ${stand} von ${rennen.jahre} Jahren` : `Endstand nach ${rennen.jahre} Jahren`}
        </span>
      </ExportOnly>

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
