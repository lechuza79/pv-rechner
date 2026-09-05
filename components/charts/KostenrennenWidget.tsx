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

// Das Stromkosten-Rennen: eine Linie je Haushalt, die sich Jahr für Jahr über
// die Zeitachse zeichnet — kumulierte Stromausgaben, am Ende jeder Linie der
// Betrag. Der PV-Haushalt startet mit der Anschaffung oben; wo die Linie des
// Haushalts ohne Anlage sie kreuzt, ist die Anlage bezahlt. Dieses Kreuzungs-
// jahr IST die Amortisation des Rechners (lib/kostenrennen.ts rechnet mit
// denselben Funktionen).
//
// Selbst-enthaltende Karte nach dem Muster von GruengasWidget: dasselbe Bauteil
// steht unter /embed/pv-kostenrennen und direkt gerendert im Ratgeber (onsite).
// Alles Interaktive (Abspielen, Schieberegler) trägt data-sc-export-ignore; das
// Bild zeigt den gerade eingestellten Stand.
//
// Die Achsen LAUFEN MIT (wie bei einem Bar-Chart-Race): Die x-Achse reicht
// immer genau bis heute, die y-Achse bis knapp über den höchsten sichtbaren
// Wert. Am Anfang füllt so das erste Jahr das ganze Bild und der Sägezahn der
// Monate ist groß, später zoomt das Bild heraus und die Kurven werden zu dem,
// was sie über 25 Jahre sind. Feste Achsen zeigten dieselben Daten, aber die
// Jahresbewegung war am Anfang ein Strich am Boden.
//
// Die Zeit läuft als Gleitkommazahl `t` (in MONATEN) über requestAnimationFrame:
// Die Kurve zeichnet sich gleichmäßig, und die Monatsauflösung zeigt den
// Sägezahn — im Winter steigt die PV-Kurve fast wie die andere, im Sommer
// fällt sie sogar (Einspeise-Erlös über der Restrechnung). Zwischen zwei
// Monaten wird nur für die Bewegung interpoliert; angezeigt werden immer die
// gerechneten Monatswerte.

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

// Farbfolge der Läufer: Referenz (ohne Anlage) neutral, Anlagen im Akzent.
// Semantisch, nicht themebar: dieselbe Zuordnung in jedem Farbschema.
const FARBEN = ["var(--color-text-primary)", "var(--color-accent)", "var(--color-accent-light)", "var(--color-positive)"];

// 2 Nachkommastellen: hält Server-/Client-Render exakt gleich.
const r2 = (n: number) => Math.round(n * 100) / 100;

function niceMax(max: number): number {
  const step = Math.pow(10, Math.floor(Math.log10(max / 4)));
  const s = (max / 4 / step <= 2 ? 2 : max / 4 / step <= 5 ? 5 : 10) * step;
  return Math.ceil(max / s) * s;
}

/** Kumulierter Wert zur Gleitkomma-Zeit t in Monaten (linear zwischen zwei Monaten). */
function wertBei(l: RennLaeufer, t: number): number {
  const i = Math.floor(t);
  if (i >= l.monatlich.length - 1) return l.monatlich[l.monatlich.length - 1];
  return l.monatlich[i] + (l.monatlich[i + 1] - l.monatlich[i]) * (t - i);
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
  const referenz = rennen.laeufer.find((l) => l.key === rennen.referenzKey)!;
  const farbe = (key: string) => FARBEN[rennen.laeufer.findIndex((l) => l.key === key) % FARBEN.length];

  const { chartRef, downloadPng, sharePng, shareWhatsApp, shareTwitter, isExporting, canNativeShare } =
    useChartExport({
      context: { title: `${WIDGETS.kostenrennen.title} — ${variante.label} — ${stand}` },
      filename: "stromkosten-rennen-pv",
      shareText: WIDGETS.kostenrennen.shareText,
      shareUrl: WIDGETS.kostenrennen.shareUrl,
      mode: "node",
    });

  // ── Chart-Geometrie: mitlaufende Achsen ──────────────────────────────────
  // x reicht bis heute (mindestens ein Jahr, damit der Start nicht leer ist),
  // y bis knapp über den höchsten Wert, der bis heute vorkam. Beide werden je
  // Bild neu bestimmt — deshalb keine CSS-Übergänge, alles folgt `t`.
  const W = narrow ? 320 : 640, H = narrow ? 230 : 300;
  const P = { t: 18, r: narrow ? 74 : 96, b: 28, l: narrow ? 46 : 58 };
  const cW = W - P.l - P.r, cH = H - P.t - P.b;
  const y0 = P.t + cH;
  const xEnd = Math.max(12, t);
  const bisIdx = Math.min(M, Math.ceil(t));
  const sichtbarMax = Math.max(1, ...rennen.laeufer.map((l) => Math.max(...l.monatlich.slice(0, bisIdx + 1))));
  const yMax = niceMax(sichtbarMax * 1.12);
  const xL = (monatIdx: number) => r2(P.l + (Math.min(monatIdx, xEnd) / xEnd) * cW);
  const yL = (wert: number) => r2(y0 - (Math.max(0, wert) / yMax) * cH);
  const yTicks = [1, 2, 3, 4].map((q) => (yMax / 4) * q);
  // Jahresmarken: so viele, wie ohne Gedränge in die sichtbare Spanne passen.
  const jahreSichtbar = xEnd / 12;
  // Schmal: weniger Marken — „2026 2028" stießen bei 320 px zusammen.
  const xSchritt = narrow
    ? (jahreSichtbar <= 3 ? 1 : jahreSichtbar <= 10 ? 3 : 5)
    : (jahreSichtbar <= 6 ? 1 : jahreSichtbar <= 13 ? 2 : 5);
  const xJahre: number[] = [];
  for (let j = 0; j <= Math.floor(xEnd / 12); j += xSchritt) xJahre.push(j);
  // Die Linie bis heute: alle Monatspunkte bis zum letzten ganzen Monat plus
  // die interpolierte Spitze — nichts hinter „heute" wird gezeichnet.
  const pfad = (l: RennLaeufer) => {
    const pts = l.monatlich.slice(0, Math.floor(t) + 1).map((wert, i) => `${xL(i)},${yL(wert)}`);
    if (t > Math.floor(t)) pts.push(`${xL(t)},${yL(wertBei(l, t))}`);
    return pts.join(" ");
  };

  // Spitzen (aktueller Punkt jeder Linie), von oben nach unten sortiert, damit
  // die Beschriftungen einander ausweichen: höhere Linie oben, tiefere unten.
  const spitzen = rennen.laeufer
    .map((l) => ({ l, wert: wertBei(l, t), y: yL(wertBei(l, t)) }))
    .sort((a, b) => a.y - b.y);
  const spitzeDy = (i: number) => (spitzen.length === 1 ? 4 : i === 0 ? -6 : 13);

  const pvLaeufer = rennen.laeufer.filter((l) => l.hatPv);
  const ueberholMonat = pvLaeufer.length === 1 ? rennen.ueberholMonat[pvLaeufer[0].key] : null;
  const kreuzungSichtbar = ueberholMonat !== null && t >= ueberholMonat;

  // Der Satz unter dem Chart: Stand des PV-Haushalts gegen die Referenz —
  // mit den gerechneten Monatswerten, nicht mit Zwischenbildern.
  const status = (() => {
    if (pvLaeufer.length !== 1) return null;
    const pv = pvLaeufer[0];
    const diff = pv.monatlich[k] - referenz.monatlich[k];
    if (k === 0) return `Start: Der PV-Haushalt hat ${fmtEuroVoll(pv.investition)} für die Anlage ausgegeben, der andere noch nichts.`;
    if (ueberholMonat !== null && k >= ueberholMonat) {
      return k === ueberholMonat
        ? `${monatLabel(rennen.startJahr, k)}: Die Linien kreuzen sich — die Anlage hat sich bezahlt gemacht, ab jetzt liegt der PV-Haushalt vorn.`
        : `Der PV-Haushalt hat bis hier ${fmtEuroVoll(-diff)} weniger für Strom ausgegeben.`;
    }
    return `Der PV-Haushalt liegt noch ${fmtEuroVoll(diff)} hinten — die Anschaffung ist noch nicht zurück.`;
  })();

  const haushalt = PERSONEN[2];
  const lblStyle: React.CSSProperties = { fontSize: v("--font-size-caption"), fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: v("--color-text-muted") };
  const knopf: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: space.sm,
    height: 32, minWidth: 32, padding: `0 ${space.lg}px`, borderRadius: v("--radius-md"),
    border: "none", background: v("--color-accent"), color: v("--color-text-on-accent"),
    fontSize: v("--font-size-small"), fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
  };
  const legend: ExportLegendEntry[] = rennen.laeufer.map((l) => ({ color: farbe(l.key), label: l.label, shape: "line" }));
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
        Zwei gleiche Haushalte, {N} Jahre: Wer hat am Ende mehr für Strom bezahlt?{" "}
        <span style={{ verticalAlign: "middle" }}>
          <InfoTooltip title="Der Beispielhaushalt" ariaLabel="Angaben zum Beispielhaushalt">
            {haushalt.label} Personen mit {haushalt.verbrauch.toLocaleString("de-DE")} kWh Jahresverbrauch, teils im Homeoffice.
            Die Anlage: {pvLaeufer.map((l) => `${l.kwp} kWp${l.speicherKwh > 0 ? ` mit ${l.speicherKwh} kWh Speicher` : " ohne Speicher"}`).join(", ")},
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
          <span style={lblStyle}>Stromkosten seit {rennen.startJahr}</span>
          <InfoTooltip title="Was hier zählt" ariaLabel="Was als Stromkosten zählt">
            Alles, was der Haushalt bis zu diesem Jahr für Strom ausgegeben hat: die Stromrechnung mit steigendem Preis, beim
            PV-Haushalt dazu die Anschaffung der Anlage, abzüglich der Einspeisevergütung. Wo sich die Linien kreuzen, ist die
            Anlage bezahlt.
          </InfoTooltip>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
          aria-label={`Kumulierte Stromkosten ${rennen.startJahr} bis ${stand}: ${rennen.laeufer.map((l) => `${l.label} ${fmtEuroVoll(l.monatlich[k])}`).join(", ")}`}>
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

          {/* Kreuzung: erscheint, sobald die Linien sie erreicht haben. */}
          {kreuzungSichtbar && ueberholMonat !== null && (
            <g>
              <line x1={xL(ueberholMonat)} x2={xL(ueberholMonat)} y1={P.t} y2={y0} stroke="var(--color-positive)" strokeWidth={1} strokeDasharray="3 3" />
              <text x={xL(ueberholMonat)} y={P.t - 6} textAnchor={ueberholMonat > M * 0.7 ? "end" : "middle"} fontSize={fsPx("--font-size-caption")} fontWeight={700} fill="var(--color-positive)">
                Anlage bezahlt · {monatLabel(rennen.startJahr, ueberholMonat, true)}
              </text>
            </g>
          )}

          {/* Die Linien bis heute. */}
          {rennen.laeufer.map((l) => (
            <polyline
              key={l.key}
              points={pfad(l)}
              fill="none"
              stroke={farbe(l.key)}
              strokeWidth={l.hatPv ? 3 : 2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {/* Spitzen mit Betrag */}
          {spitzen.map(({ l, wert, y }, i) => (
            <g key={l.key}>
              <circle cx={xL(t)} cy={y} r={4} fill={farbe(l.key)} stroke="var(--color-bg)" strokeWidth={1.5} />
              {/* Nie unter die Nulllinie: Bei 0 € säße der Betrag sonst auf dem Jahr der x-Achse. */}
              <text x={xL(t) + 8} y={Math.min(y + spitzeDy(i), y0 - 3)} textAnchor="start" fontSize={fsPx("--font-size-small")} fontWeight={800} fill={farbe(l.key)} fontFamily="var(--font-mono)" style={{ fontVariantNumeric: "tabular-nums" }}>
                {narrow ? `${Math.round(wert / 1000)} T€` : fmtEuroVoll(l.monatlich[k])}
              </text>
            </g>
          ))}
        </svg>

        {/* Legende auf der Seite: die Spitzen tragen nur Zahlen, die Zuordnung
            braucht einen Namen. Im Bild kommt sie aus dem Bild-Fuß. */}
        <div {...{ [EXPORT_IGNORE_ATTR]: "" }} style={{ display: "flex", flexWrap: "wrap", gap: `${space.xs}px ${space.xl}px`, marginTop: space.xs }}>
          {rennen.laeufer.map((l) => (
            <span key={l.key} style={{ display: "inline-flex", alignItems: "center", gap: space.sm, fontSize: v("--font-size-small"), color: v("--color-text-secondary") }}>
              <span style={{ width: 14, height: 3, borderRadius: 2, background: farbe(l.key) }} />
              {narrow ? l.kurz : l.label}
            </span>
          ))}
        </div>

        {status && (
          <div style={{ marginTop: space.lg, fontSize: v("--font-size-small"), color: v("--color-text-secondary"), lineHeight: 1.5, minHeight: 36 }}>
            {status}
          </div>
        )}
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

      {/* Im Bild: der eingestellte Stand steht schon im Kopf (Jahr + „nach n
          Jahren"); hier nur der Hinweis, dass das Bild einen Zwischenstand zeigt. */}
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
