"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import InfoTooltip from "../InfoTooltip";
import {
  ExportBox,
  ExportNotesProvider,
  ExportOnly,
  ExportOnlyG,
  WidgetFooter,
  WidgetSourceEdge,
  SOURCE_EDGE_WIDTH,
  WidgetExportFooter,
  type ExportLegendEntry,
} from "../WidgetExport";
import { IconPause, IconPlay, IconRefresh } from "../Icons";
import { useChartExport } from "../../lib/useChartExport";
import { EXPORT_IGNORE_ATTR } from "../../lib/export-markers";
import { brandLabel, type WidgetDef } from "../../lib/widget-registry";
import { v, fsPx, space, pad as abstand, tokens, type TokenName } from "../../lib/theme";
import { RaceVideo, videoFormat, type VideoFrameDaten } from "../../lib/race-video";
import { downloadBlob } from "../../lib/chart-export";
import { sourceLabel } from "../../lib/data-sources";

// Der Race-Chart: ZWEI Läufer über einen langen Zeitraum, Tag für Tag, als
// Linien, die sich selbst zeichnen — eine animierte Erzählung mit Ereignissen.
// Erster Aufrufer ist das Stromkosten-Rennen (KostenrennenWidget); weitere
// Rennen (andere Haushalte, Speicher ja/nein, Wärmepumpe ab Jahr x) reichen
// nur ihre zwei Reihen, ihre Ereignisse und ihre Texte herein.
//
// Was dieser Baustein entscheidet, und warum (alles am ersten Rennen am
// 05.09.2026 mit dem Betreiber ausgehandelt):
// - Die x-Achse reicht vom Start bis heute (mindestens ein Jahr) und wächst,
//   bis am Ende der ganze Zeitraum auf einer Breite steht.
// - Die y-Achse ist eine KAMERA auf den Läufer `kamera`: seine Spanne im Bild
//   plus Luft; der andere Läufer liegt anfangs außerhalb und wird am Rand als
//   Marke mit Zahl geführt, bis er hereinwächst. Ab der Hälfte öffnet sich die
//   Skala linear auf das Gesamtbild, sodass am letzten Tag beide Linien ganz
//   im Bild stehen. Nur so sind Tage sichtbar: Ein Sonnen- gegen einen
//   Regentag sind 3 € — in einer Skala mit 14.000 € Anschaffung kein Bildpunkt.
// - Das Tempo zieht an: zwei ruhige Jahre (je rund 8 s), dann stetig
//   schneller, das letzte Jahr gut eine halbe Sekunde, zusammen rund 55 s.
// - Ereignisse stehen als Punkte auf einer Spur unter dem Chart, auf derselben
//   Zeitachse (Punkt und gestrichelte Linie stehen übereinander); das zuletzt
//   erreichte ist groß und wird darunter erklärt. Kein Regler: Die Spur liegt
//   auf der wachsenden Achse, ein Regler darauf wechselte beim Ziehen die Skala.
// - Der Download ist ein Video (lib/race-video.ts), die Animation ist der Inhalt.
//
// Selbst-enthaltende Karte nach dem Muster von GruengasWidget: dasselbe Bauteil
// steht unter /embed/… und direkt gerendert im Ratgeber (onsite).

// Das Tempo zieht an: Die ersten zwei Jahre laufen ruhig (je rund 8 Sekunden —
// man sieht Wochen, Monate, Winter gegen Sommer), danach beschleunigt die
// Wiedergabe stetig; das letzte Jahr dauert gut eine halbe Sekunde, alles
// zusammen rund 55 Sekunden. Am Anfang passiert das Interessante, gegen Ende
// bewegen sich nur noch zwei gerade Linien.
//
// Tempo und Skala sind je Rennen einstellbar (Props `tempo`, `skala`); die
// Voreinstellungen sind die des Stromkosten-Rennens (25 Jahre, Tausende Euro).
export interface RaceTempo {
  /** Tage, die im ruhigen Anfangstempo laufen. */
  ruhigeTage: number;
  /** Millisekunden je Tag am Anfang und am Ende (dazwischen stetig anziehend). */
  msJeTagStart: number;
  msJeTagEnde: number;
}
export interface RaceSkala {
  /** Mindestbreite des Zeitfensters in Tagen (das erste Jahr füllt das Bild). */
  minTage: number;
  /** Luft unter und über dem Kamera-Läufer, in Vielfachen seiner Spanne. */
  luft: number;
  /** Kleinste Spanne der Kamera und kleinster Rand, in Werteinheiten — verhindert
   *  ein Bild, das am ersten Tag auf ein paar Cent zoomt. */
  minSpanne: number;
  minRand: number;
  /** Anteil der Strecke, ab dem die Skala linear auf das Gesamtbild aufzieht. */
  zoomAb: number;
}
export const TEMPO_STANDARD: RaceTempo = { ruhigeTage: 730, msJeTagStart: 22, msJeTagEnde: 1.5 };
export const SKALA_STANDARD: RaceSkala = { minTage: 365, luft: 0.9, minSpanne: 120, minRand: 20, zoomAb: 0.5 };
const msJeTag = (t: number, T: number, tempo: RaceTempo) => {
  if (t < tempo.ruhigeTage) return tempo.msJeTagStart;
  const u = Math.min(1, (t - tempo.ruhigeTage) / Math.max(1, T - tempo.ruhigeTage));
  return tempo.msJeTagStart * Math.pow(tempo.msJeTagEnde / tempo.msJeTagStart, Math.sqrt(u));
};
const SCHRITT_MS = 500; // bei reduzierter Bewegung: ein Jahr je Schritt

export const MONATE_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
export const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

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

export interface RaceLaeufer {
  key: string;
  /** Voller Name (Legende, Vorlesen) und Kurzform für schmale Karten. */
  label: string;
  kurz: string;
  /** Farb-Token: semantisch, nicht themebar — z. B. Akzent für die Anlage, Text für den Vergleich. */
  farbe: TokenName;
  /** Kumulierter Wert je Tag, Index 0 = Start, Länge = Tage + 1. */
  werte: Float64Array;
}

export interface RaceEreignis {
  tag: number;
  jahr: number;
  /** Kurzer Titel („Anlage bezahlt · Sep 2038") und ein Erklärsatz für die Zeitleiste. */
  label: string;
  text: string;
  /** Gestrichelte Senkrechte im Chart an diesem Tag. */
  linie?: boolean;
  /** Text im Chart NUR im Bild (auf der Seite steht er an der Zeitleiste). */
  bild?: { text: string; position: "oben" | "unten"; farbe?: TokenName };
}

export interface RaceChartProps {
  widget: WidgetDef;
  /** Der Läufer, dem die Kamera am Anfang folgt (der, der vorn startet). */
  kamera: RaceLaeufer;
  /** Der Vergleichsläufer, der ins Bild hereinwächst. */
  anderer: RaceLaeufer;
  startJahr: number;
  jahre: number;
  /** Tagesindex des ersten Tags jedes Monats (Index 0 = Start, 1..12·jahre). */
  ersterTag: number[];
  datumVon: (tag: number) => { jahr: number; monat: number; tag: number };
  /** Aufsteigend nach Tag; das zuletzt erreichte ist aktiv. */
  ereignisse: RaceEreignis[];
  /** Voller Wert („14.226 €") und Kurzform („14,2 k€") — aus den geteilten Formatierern. */
  fmt: (wert: number) => string;
  fmtKurz: (wert: number) => string;
  /** „?" am Titel (was verglichen wird) und am Zeitraum (was die Linien zählen). */
  titelHilfe: { title: string; ariaLabel: string; inhalt: ReactNode };
  zeitraumHilfe: { title: string; ariaLabel: string; inhalt: ReactNode };
  /** Vorlesetext des Charts zum Stand. */
  ariaLabel: (stand: string, kameraWert: number, andererWert: number) => string;
  /** Fußnote im Bild. */
  exportNote: string;
  /** Dateinamen ohne Endung für Bild und Video. */
  dateiname: string;
  onsite?: boolean;
  branding?: boolean;
  showEmbed?: boolean;
  /** Läuft von selbst los, sobald die Karte im Bild ist (nicht bei reduzierter Bewegung). */
  autoplay?: boolean;
  /** Datenstand für die Quellen-Kante (formatiert). */
  stand?: string;
  /** Abweichendes Tempo / abweichende Skala für andere Zeiträume und Werteräume. */
  tempo?: Partial<RaceTempo>;
  skala?: Partial<RaceSkala>;
}

export default function RaceChart(props: RaceChartProps) {
  return (
    <ExportNotesProvider>
      <RaceCard {...props} />
    </ExportNotesProvider>
  );
}

function RaceCard({
  widget, kamera, anderer, startJahr, jahre, ersterTag, datumVon, ereignisse, fmt, fmtKurz,
  titelHilfe, zeitraumHilfe, ariaLabel, exportNote, dateiname,
  onsite = false, branding = true, showEmbed = false, autoplay = true, stand: quellenStand,
  tempo: tempoProp, skala: skalaProp,
}: RaceChartProps) {
  const tempo: RaceTempo = { ...TEMPO_STANDARD, ...tempoProp };
  const skala: RaceSkala = { ...SKALA_STANDARD, ...skalaProp };
  const kA = kamera.werte, kB = anderer.werte;
  const T = kA.length - 1;
  const FARBE_A = v(kamera.farbe), FARBE_B = v(anderer.farbe);
  const [t, setT] = useState(0);
  const [spielt, setSpielt] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [showCredit, setShowCredit] = useState(false);
  const [ruhig, setRuhig] = useState(false);
  const gestartet = useRef(false);
  // Sprung zu einem Ereignis: Das Chart gleitet in gut einer halben Sekunde
  // vom aktuellen Tag dorthin, statt umzuschalten — ein Sprung ohne Weg
  // sieht aus wie ein neues Bild. Bei reduzierter Bewegung wird gesetzt.
  const tRef = useRef(0);
  const gleitRaf = useRef(0);
  // Ziel-Ereignis eines laufenden Gleitflugs: Wer zweimal schnell „weiter"
  // drückt, meint zwei Ereignisse weiter — nicht zweimal dasselbe Ziel.
  const gleitZiel = useRef<number | null>(null);
  const gleiteZu = (ziel: number, zielIdx: number) => {
    cancelAnimationFrame(gleitRaf.current);
    setSpielt(false);
    gestartet.current = true;
    gleitZiel.current = zielIdx;
    if (ruhig) { setT(ziel); gleitZiel.current = null; return; }
    const von = tRef.current;
    const dauer = Math.min(900, 350 + Math.abs(ziel - von) / 20);
    const begin = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - begin) / dauer);
      const e = 1 - Math.pow(1 - p, 3);
      setT(von + (ziel - von) * e);
      if (p < 1) gleitRaf.current = requestAnimationFrame(step);
      else gleitZiel.current = null;
    };
    gleitRaf.current = requestAnimationFrame(step);
  };
  useEffect(() => () => cancelAnimationFrame(gleitRaf.current), []);
  const hostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  // Video-Aufnahme: läuft in Echtzeit mit der Animation (siehe lib/race-video.ts).
  const [aufnahme, setAufnahme] = useState<RaceVideo | null>(null);
  const frameRef = useRef<() => Promise<void>>(async () => {});
  const [videoKann, setVideoKann] = useState(false);
  useEffect(() => { setVideoKann(videoFormat() !== null); }, []);

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
    cancelAnimationFrame(gleitRaf.current);
    if (ruhig) {
      const iv = setInterval(() => {
        setT((prev) => {
          // Nächster Jahresanfang nach prev, sonst das Ende.
          let n = T;
          for (let m = 13; m <= 12 * jahre; m += 12) {
            if (ersterTag[m] - 1 > prev) { n = ersterTag[m] - 1; break; }
          }
          if (n >= T) setSpielt(false);
          return n;
        });
      }, SCHRITT_MS);
      return () => clearInterval(iv);
    }
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      // Der erste rAF-Zeitstempel kann VOR dem performance.now() des Effekts
      // liegen — ein negatives dt machte aus Tag 0 den Tag −1 (NaN im Chart).
      const dt = Math.max(0, now - last);
      last = now;
      setT((prev) => {
        const n = Math.min(Math.max(0, prev + dt / msJeTag(prev, T, tempo)), T);
        if (n >= T) setSpielt(false);
        return n;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [spielt, ruhig, T, jahre, ersterTag, tempo.ruhigeTage, tempo.msJeTagStart, tempo.msJeTagEnde]); // eslint-disable-line react-hooks/exhaustive-deps

  tRef.current = t;
  const tag = Math.min(T, Math.floor(t));
  const datum = datumVon(tag);
  const stand = tag === 0 ? `${startJahr} · Start` : `${datum.tag}. ${MONATE[datum.monat]} ${datum.jahr}`;
  const zeitraum = (bis: number) => `${startJahr} – ${bis}`;

  const { chartRef, downloadPng, sharePng, shareWhatsApp, shareTwitter, isExporting, canNativeShare } =
    useChartExport({
      context: { title: `${widget.title} — ${stand}` },
      filename: dateiname,
      shareText: widget.shareText,
      shareUrl: widget.shareUrl,
      mode: "node",
    });

  // ── Mitlaufende Achsen: x vom Start bis heute, y als Kamera auf Läufer A ──
  const W = narrow ? 320 : 640, H = narrow ? 260 : 340;
  const P = { t: 18, r: narrow ? 10 : 12, b: 28, l: narrow ? 58 : 56 };
  const cW = W - P.l - P.r, cH = H - P.t - P.b;
  const y0 = P.t + cH;

  const xEnd = Math.max(skala.minTage, t);
  const xStart = 0;
  const iStart = 0;
  const iEnd = Math.min(T, Math.ceil(t));
  // Kamera auf Läufer A: seine Spanne im Bild, dazu LUFT Luft-Spannen nach
  // unten und oben — genug, dass Läufer B hereinwachsen kann, ohne dass die
  // Skala springt. Sein aktueller Wert wird eingeschlossen, sobald er
  // innerhalb dieser Luft liegt; davor steht er als Marke am Rand.
  let aLo = Infinity, aHi = -Infinity;
  for (let d = iStart; d <= iEnd; d++) {
    aLo = Math.min(aLo, kA[d]);
    aHi = Math.max(aHi, kA[d]);
  }
  if (!Number.isFinite(aLo)) { aLo = 0; aHi = 1; }
  const spanne = Math.max(skala.minSpanne, aHi - aLo);
  const bTip = kB[tag];
  const lo = Math.min(aLo, Math.max(bTip, aLo - skala.luft * spanne));
  const hi = Math.max(aHi, Math.min(bTip, aHi + skala.luft * spanne));
  // Ab der Hälfte der Strecke öffnet sich die Kamera linear auf das ganze
  // Bild (0 bis zum Endstand des höheren Läufers), sodass am letzten Tag
  // beide Linien vollständig im Bild stehen.
  const pad = Math.max(skala.minRand, (hi - lo) * 0.06);
  const vollHi = Math.max(kA[T], kB[T]) * 1.04;
  const w = Math.min(1, Math.max(0, (t - T * skala.zoomAb) / (T * (1 - skala.zoomAb))));
  const yMin = Math.max(0, (lo - pad) * (1 - w)), yMax = (hi + pad) * (1 - w) + vollHi * w;
  const bImBild = bTip >= yMin && bTip <= yMax;
  const yStep = niceStep(yMax - yMin);
  const yTicks: number[] = [];
  for (let val = Math.ceil(yMin / yStep) * yStep; val <= yMax; val += yStep) yTicks.push(val);
  // Die kurze Form (k€) löst feine Schritte nicht auf — dann stünde dreimal
  // dieselbe Zahl an drei Linien. Sobald sich Beschriftungen doppeln, gilt die
  // volle Form (nur beim engen Zoom der ersten Tage).
  let yLabels = yTicks.map(fmtKurz);
  if (new Set(yLabels).size < yLabels.length) yLabels = yTicks.map(fmt);
  const xL = (tagIdx: number) => r2(P.l + ((Math.min(tagIdx, xEnd) - xStart) / (xEnd - xStart)) * cW);
  const yL = (wert: number) => r2(y0 - ((wert - yMin) / (yMax - yMin)) * cH);
  // Jahresmarken: jeder Januar im Bild, ausgedünnt, sobald es eng wird.
  const jahreImBild = xEnd / 365;
  const xSchritt = narrow
    ? (jahreImBild <= 3 ? 1 : jahreImBild <= 10 ? 3 : 10)
    : (jahreImBild <= 6 ? 1 : jahreImBild <= 13 ? 2 : 5);
  const xJahre: { x: number; jahr: number }[] = [];
  for (let m = 1, j = 1; m <= 12 * jahre; m += 12, j++) {
    const d = ersterTag[m];
    if (d <= xEnd && (j - 1) % xSchritt === 0) xJahre.push({ x: xL(d), jahr: datumVon(d).jahr });
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
  // Der Betrag steht immer ÜBER seinem Punkt — eine feste Position, die nicht
  // mit der Linienrichtung hin- und herspringt; gegen die Linie darunter trägt
  // die Zahl einen Halo in Hintergrundfarbe.
  const spitzen = [
    { key: kamera.key, farbe: FARBE_A, wert: wertBei(kA, t), zahl: kA[tag] },
    ...(bImBild ? [{ key: anderer.key, farbe: FARBE_B, wert: wertBei(kB, t), zahl: kB[tag] }] : []),
  ].map((s) => ({ ...s, y: yL(s.wert) })).sort((a, b) => a.y - b.y);
  // Liegen beide Spitzen nah beieinander (um die Kreuzung), rutscht die untere
  // unter ihren Punkt, damit sich die Zahlen nicht überlagern.
  const spitzeDy = (i: number) => (spitzen.length > 1 && Math.abs(spitzen[0].y - spitzen[1].y) < 28 && i === 1 ? 16 : -8);
  // Liegt Läufer B außerhalb des Bildes, zeigt eine Marke am Rand, wo er
  // steht — unten, solange er hinten liegt, oben, wenn er führt.
  const bUnten = !bImBild && bTip < yMin;
  const clipId = `race-clip-${widget.id}`;

  // Sekundär, nur Icon — dieselbe Form wie die Aktionsknöpfe in der Fußzeile.
  const knopf: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 32, height: 32, padding: 0, borderRadius: v("--radius-md"), flexShrink: 0,
    border: `1px solid ${v("--color-border-accent")}`, background: v("--color-bg"), color: v("--color-accent"),
    cursor: "pointer",
  };
  // Die Kante steht nur am Chart-Bereich (Chart, Spur, Ereignis-Box), nicht am
  // Player oder der Fußzeile. Zwei Quellen passen dort nur in zwei Spalten,
  // wenn die Schrift beim kleinsten Token bleiben soll.
  const kantenSpalten: 1 | 2 = widget.sources.length > 1 ? 2 : 1;
  const legend: ExportLegendEntry[] = [
    { color: FARBE_B, label: anderer.label, shape: "line" },
    { color: FARBE_A, label: kamera.label, shape: "line" },
  ];
  const amEnde = t >= T;

  // Immer EIN Ereignis ist aktiv — das zuletzt erreichte; es wird unter der
  // Spur erklärt, das vorige blendet aus (Muster: Weichenstellungen im Zubau-Chart).
  const sichtbareEreignisse = ereignisse.filter((e) => t >= e.tag);
  const aktivesEreignis = sichtbareEreignisse.length ? sichtbareEreignisse[sichtbareEreignisse.length - 1] : null;
  // Pfeile wie beim Zubau-Chart: zum vorigen/nächsten Ereignis springen — die
  // Wiedergabe hält dort an, damit man lesen kann; das Chart steht auf dem Tag
  // des Ereignisses.
  const idxAktiv = aktivesEreignis ? ereignisse.indexOf(aktivesEreignis) : -1;
  const springe = (i: number) => {
    const e = ereignisse[i];
    if (!e) return;
    gleiteZu(e.tag, i);
  };
  const pfeil = (richtung: -1 | 1) => {
    const ziel = (gleitZiel.current ?? idxAktiv) + richtung;
    const aus = ziel < 0 || ziel >= ereignisse.length;
    return (
      <button
        type="button"
        onClick={() => springe(ziel)}
        disabled={aus}
        aria-label={richtung < 0 ? "Vorheriges Ereignis" : "Nächstes Ereignis"}
        title={richtung < 0 ? "Vorheriges Ereignis" : "Nächstes Ereignis"}
        style={{
          flexShrink: 0, width: 32, height: 32, padding: 0, boxSizing: "border-box", borderRadius: "50%",
          border: `1px solid ${v("--color-border")}`, background: v("--color-bg"),
          color: aus ? v("--color-text-muted") : v("--color-accent"), fontSize: v("--font-size-h3"), lineHeight: 1,
          cursor: aus ? "default" : "pointer", opacity: aus ? 0.4 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {richtung < 0 ? "‹" : "›"}
      </button>
    );
  };
  // Zeitleiste auf derselben Achse wie das Chart: Punkt und gestrichelte Linie
  // stehen jederzeit übereinander.
  const posPct = (d: number) => (xL(d) / W) * 100;

  // Der Video-Frame: was die Leinwand in diesem Render zeichnen soll. Als Ref,
  // damit die Aufnahme-Schleife immer den jüngsten Stand malt.
  const frameDaten: VideoFrameDaten = {
    titel: widget.title,
    jahr: zeitraum(tag === 0 ? startJahr : datum.jahr),
    svg: svgRef.current,
    // Auf der Video-Leinwand gibt es keine CSS-Variablen — dieselben Tokens als Wert.
    legende: [{ farbe: tokens[anderer.farbe], label: anderer.label }, { farbe: tokens[kamera.farbe], label: kamera.label }],
    zeitleiste: sichtbareEreignisse.map((e) => ({ posPct: posPct(e.tag), aktiv: e === aktivesEreignis })),
    ereignis: aktivesEreignis ? { jahr: String(aktivesEreignis.jahr), label: aktivesEreignis.label, text: aktivesEreignis.text } : null,
    spur: { vonPct: (P.l / W) * 100, bisPct: ((P.l + cW) / W) * 100 },
    marke: `${brandLabel(widget.kind)} solar-check.io`,
    quelle: widget.sources.map((q) => sourceLabel(q, { kurz: true })).join(" · "),
  };
  frameRef.current = () => (aufnahme ? aufnahme.frame(frameDaten) : Promise.resolve());

  // Aufnahme starten: von vorn, in Echtzeit; die Schleife malt, solange sie läuft.
  const downloadVideo = () => {
    const format = videoFormat();
    if (!format || aufnahme) return;
    const video = new RaceVideo(format);
    video.vorbereiten(H / W);
    gestartet.current = true;
    setT(0);
    setAufnahme(video);
    setSpielt(true);
    video.start();
  };
  useEffect(() => {
    if (!aufnahme) return;
    let raf = 0, lebt = true;
    const tick = () => { if (!lebt) return; void frameRef.current().finally(() => { if (lebt) raf = requestAnimationFrame(tick); }); };
    raf = requestAnimationFrame(tick);
    return () => { lebt = false; cancelAnimationFrame(raf); };
  }, [aufnahme]);
  // Am Ende der Animation: den Endstand noch anderthalb Sekunden stehen lassen, dann speichern.
  useEffect(() => {
    if (!aufnahme || spielt || t < T) return;
    const timer = setTimeout(async () => {
      await frameRef.current();
      const blob = await aufnahme.stop();
      setAufnahme(null);
      if (blob.size > 0) downloadBlob(blob, `${dateiname}.${aufnahme.format.ext}`);
    }, 1500);
    return () => clearTimeout(timer);
  }, [aufnahme, spielt, t, T, dateiname]);

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
        padding: `${space.xl}px ${space.xl}px ${space.lg}px ${space.xl}px`,
        boxSizing: "border-box",
      }}
    >
      {/* Titel groß; das „?" hängt am letzten Wort, auch wenn der Titel umbricht. */}
      <div style={{ fontSize: v("--font-size-h2"), fontWeight: 800, lineHeight: 1.2, color: v("--color-text-primary"), marginBottom: space.md }}>
        {widget.title}{" "}
        <span style={{ display: "inline-block", verticalAlign: "middle", fontSize: v("--font-size-body"), fontWeight: 400 }}>
          <InfoTooltip title={titelHilfe.title} ariaLabel={titelHilfe.ariaLabel}>{titelHilfe.inhalt}</InfoTooltip>
        </span>
      </div>

      {/* Zeitraum „Start – jetzt" in fester Breite (Tabellenziffern + Platz für
          das letzte Jahr, damit die Zeile beim Hochzählen nicht springt), das „?"
          zu dem, was die Linien zählen, und die Legende daneben. */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: `${space.xs}px ${space.md}px`, marginBottom: space.xl }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: space.sm }}>
          <span style={{ fontFamily: v("--font-mono"), fontSize: v("--font-size-body"), fontWeight: 700, color: v("--color-text-primary"), lineHeight: 1.3, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", minWidth: `${zeitraum(datumVon(T).jahr).length}ch`, display: "inline-block" }}>
            {zeitraum(tag === 0 ? startJahr : datum.jahr)}
          </span>
          <InfoTooltip title={zeitraumHilfe.title} ariaLabel={zeitraumHilfe.ariaLabel}>{zeitraumHilfe.inhalt}</InfoTooltip>
        </span>
        {/* Legende: die Spitzen tragen nur Zahlen, die Zuordnung braucht einen
            Namen. Im Bild kommt sie aus dem Bild-Fuß. */}
        <div {...{ [EXPORT_IGNORE_ATTR]: "" }} style={{ display: "flex", flexWrap: "wrap", gap: `${space.xxs}px ${space.lg}px`, marginLeft: space.sm }}>
          {[{ l: anderer, f: FARBE_B }, { l: kamera, f: FARBE_A }].map(({ l, f }) => (
            <span key={l.key} style={{ display: "inline-flex", alignItems: "center", gap: space.sm, fontSize: v("--font-size-small"), color: v("--color-text-secondary"), whiteSpace: "nowrap", lineHeight: 1.3 }}>
              <span style={{ width: 14, height: 3, borderRadius: v("--radius-sm"), background: f }} />
              {narrow ? l.kurz : l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Die Quellen-Kante steht am Chart-Bereich, nicht über die Fußzeile
          hinaus: dieser Rahmen trägt sie und lässt ihr rechts Platz. */}
      <div style={{ position: "relative", paddingRight: SOURCE_EDGE_WIDTH * kantenSpalten + space.sm }}>
      <ExportBox>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
          aria-label={ariaLabel(stand, kA[tag], kB[tag])}>
          {/* Achsenzahlen blenden ein, wenn sie erscheinen: Jede Marke ist per key ein
              eigenes Element und wird beim Auftauchen neu gemountet — die Animation
              läuft genau dann. Bei reduzierter Bewegung steht sie sofort. */}
          <style>{`.kr-neu{animation:kr-fade-in 600ms ease-out both}@keyframes kr-fade-in{from{opacity:0}to{opacity:1}}@media (prefers-reduced-motion:reduce){.kr-neu{animation:none}}`}</style>
          {/* Raster + Skala. Die Skala steht dauerhaft: Ohne Überfahren (Bild,
              Telefon) gäbe es sonst keine Größenordnung. */}
          {yTicks.map((val, i) => (
            <g key={val} className="kr-neu">
              <line x1={P.l} x2={P.l + cW} y1={yL(val)} y2={yL(val)} stroke="var(--color-chart-grid)" strokeWidth={0.5} />
              <text x={P.l - 6} y={yL(val) + 3} textAnchor="end" fontSize={fsPx("--font-size-micro")} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">
                {yLabels[i]}
              </text>
            </g>
          ))}
          <line x1={P.l} x2={P.l + cW} y1={y0} y2={y0} stroke="var(--color-chart-zero)" strokeWidth={1} />
          {xJahre.map(({ x, jahr }) => (
            <g key={jahr} className="kr-neu">
              <line x1={x} x2={x} y1={P.t} y2={y0} stroke="var(--color-chart-grid)" strokeWidth={0.5} />
              <text x={x + 4} y={y0 + 18} textAnchor="start" fontSize={fsPx("--font-size-small")} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{x > P.l + cW - 40 ? "" : jahr}</text>
            </g>
          ))}

          {/* Die Linien bis heute — auf die Zeichenfläche beschnitten, weil
              Läufer B anfangs außerhalb des Bildes verläuft. */}
          <defs><clipPath id={clipId}><rect x={P.l} y={P.t} width={cW} height={cH} /></clipPath></defs>
          <g clipPath={`url(#${clipId})`}>
            <polyline points={pfad(kB)} fill="none" stroke={FARBE_B} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            <polyline points={pfad(kA)} fill="none" stroke={FARBE_A} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          </g>
          {!bImBild && (
            <g>
              <path d={bUnten ? `M${r2(xL(t) - 5)},${y0 - 8} L${r2(xL(t) + 5)},${y0 - 8} L${r2(xL(t))},${y0 - 1} Z` : `M${r2(xL(t) - 5)},${P.t + 8} L${r2(xL(t) + 5)},${P.t + 8} L${r2(xL(t))},${P.t + 1} Z`} fill={FARBE_B} />
              <text x={xL(t) < P.l + cW / 2 ? xL(t) + 8 : xL(t) - 8} y={bUnten ? y0 - 3 : P.t + 12} textAnchor={xL(t) < P.l + cW / 2 ? "start" : "end"} fontSize={fsPx("--font-size-small")} fontWeight={800} fill={FARBE_B} fontFamily="var(--font-mono)" style={{ fontVariantNumeric: "tabular-nums" }}>
                {narrow ? fmtKurz(bTip) : fmt(bTip)}
              </text>
            </g>
          )}

          {/* Ereignis-Linien: erscheinen, sobald die Wiedergabe sie erreicht hat.
              Auf der Seite steht der Text an der Zeitleiste unter dem Chart; im
              Bild gibt es die nicht, deshalb dort der Text im Chart. */}
          {ereignisse.filter((e) => e.linie && t >= e.tag).map((e) => (
            <g key={e.tag} className="kr-neu">
              <line x1={xL(e.tag)} x2={xL(e.tag)} y1={P.t} y2={y0} stroke="var(--color-text-muted)" strokeWidth={1} strokeDasharray="3 3" />
              {e.bild && (
                <ExportOnlyG>
                  <text
                    x={e.bild.position === "oben" ? xL(e.tag) : xL(e.tag) - 6}
                    y={e.bild.position === "oben" ? P.t - 6 : y0 - 8}
                    textAnchor={e.bild.position === "unten" || xL(e.tag) > P.l + cW * 0.75 ? "end" : "middle"}
                    fontSize={fsPx("--font-size-caption")} fontWeight={700} fill={v(e.bild.farbe ?? "--color-text-secondary")}
                  >
                    {e.bild.text}
                  </text>
                </ExportOnlyG>
              )}
            </g>
          ))}

          {/* Spitzen mit Betrag */}
          {spitzen.map((s, i) => (
            <g key={s.key}>
              <circle cx={xL(t)} cy={s.y} r={4} fill={s.farbe} stroke="var(--color-bg)" strokeWidth={1.5} />
              <text x={xL(t) + 4} y={Math.min(Math.max(s.y + spitzeDy(i), P.t + 8), y0 - 2)} textAnchor="end" fontSize={fsPx("--font-size-small")} fontWeight={800} fill={s.farbe} fontFamily="var(--font-mono)" stroke={v("--color-bg")} strokeWidth={3} strokeLinejoin="round" style={{ fontVariantNumeric: "tabular-nums", paintOrder: "stroke" }}>
                {narrow ? fmtKurz(s.zahl) : fmt(s.zahl)}
              </text>
            </g>
          ))}
        </svg>

        {/* Ereignis-Zeitleiste unter dem Chart im Stil der Weichenstellungen des
            Zubau-Charts: Punkte auf der Achse des Charts (Punkt und gestrichelte
            Linie stehen übereinander, auch während die Achse wächst), der
            zuletzt erreichte Punkt ist groß und wird darunter in einer Box
            erklärt, mit Pfeilen zum vorigen und nächsten Ereignis — ein Pfeil
            springt die Wiedergabe dorthin und hält an. Darunter der Abspielknopf.
            Nur auf der Seite — im Bild tragen die Marken ihren Text im Chart.
            Kein Regler: Die Spur liegt auf der wachsenden Chart-Achse, ein
            Regler darauf wechselte beim Ziehen die Skala (Betreiber, 05.09.2026). */}
        <div {...{ [EXPORT_IGNORE_ATTR]: "" }} style={{ marginTop: space.md }}>
          <div style={{ position: "relative", height: 32 }}>
            <div style={{ position: "absolute", top: 15, left: `${(P.l / W) * 100}%`, width: `${(cW / W) * 100}%`, height: 2, background: v("--color-border") }} />
            {sichtbareEreignisse.map((e) => {
              const aktiv = e === aktivesEreignis;
              const d = aktiv ? 22 : 13;
              return (
                <span key={e.tag} className="kr-neu" title={e.label} style={{ position: "absolute", left: `${posPct(e.tag)}%`, top: 16 - d / 2, width: d, height: d, transform: "translateX(-50%)", borderRadius: "50%", background: v("--color-accent"), border: `2px solid ${v("--color-bg")}`, boxSizing: "border-box", boxShadow: aktiv ? `0 2px 6px color-mix(in srgb, ${v("--color-accent")} 35%, transparent)` : "none", transition: "width .2s ease, height .2s ease, top .2s ease", zIndex: aktiv ? 2 : 1 }} />
              );
            })}
          </div>
          <div style={{ marginTop: space.sm, background: `color-mix(in srgb, ${v("--color-bg-muted")} 55%, ${v("--color-bg")})`, borderRadius: v("--radius-md"), padding: abstand("md", "lg"), display: "flex", flexDirection: narrow ? "column" : "row", alignItems: narrow ? "stretch" : "center", gap: space.lg }}>
            {!narrow && pfeil(-1)}
            <div style={{ flex: narrow ? undefined : 1, minWidth: 0, minHeight: 64 }}>
              {aktivesEreignis && (
                <div key={aktivesEreignis.tag} className="kr-neu">
                  <div style={{ fontSize: v("--font-size-small"), fontWeight: 800, color: v("--color-text-primary"), marginBottom: space.xxs }}>
                    <span style={{ fontFamily: v("--font-mono"), color: v("--color-accent") }}>{aktivesEreignis.jahr}</span>
                    {"  ·  "}
                    {aktivesEreignis.label}
                  </div>
                  <div style={{ fontSize: v("--font-size-small"), lineHeight: 1.5, color: v("--color-text-secondary") }}>{aktivesEreignis.text}</div>
                </div>
              )}
            </div>
            {!narrow && pfeil(1)}
            {narrow && (
              <div style={{ display: "flex", gap: space.md }}>
                {pfeil(-1)}
                {pfeil(1)}
              </div>
            )}
          </div>
        </div>
      </ExportBox>
      <WidgetSourceEdge widget={widget} visible={!onsite || showCredit} stand={quellenStand} spalten={kantenSpalten} />
      </div>

      {/* Player unter dem Chart-Bereich (außerhalb der Quellen-Kante, nur auf der
          Seite): Abspielen/Anhalten/noch einmal und ein Regler über die ganze
          Strecke — auf seiner eigenen, festen Skala, nicht auf der wachsenden
          Chart-Achse (dort scheiterte er zweimal). Darunter eine Linie, die den
          Chart-Block von der Fußzeile trennt. */}
      <div {...{ [EXPORT_IGNORE_ATTR]: "" }} style={{ display: "flex", alignItems: "center", gap: space.lg, marginTop: space.md }}>
        <button
          type="button"
          onClick={() => {
            cancelAnimationFrame(gleitRaf.current); gleitZiel.current = null;
            if (spielt) { setSpielt(false); return; }
            if (amEnde) setT(0);
            gestartet.current = true;
            setSpielt(true);
          }}
          aria-label={spielt ? "Anhalten" : amEnde ? "Noch einmal abspielen" : "Abspielen"}
          title={spielt ? "Anhalten" : amEnde ? "Noch einmal abspielen" : "Abspielen"}
          style={knopf}
        >
          {spielt ? <IconPause size={14} /> : amEnde ? <IconRefresh size={14} /> : <IconPlay size={14} />}
        </button>
        <input
          type="range"
          min={0}
          max={T}
          step={1}
          value={tag}
          onChange={(e) => { cancelAnimationFrame(gleitRaf.current); gleitZiel.current = null; setSpielt(false); gestartet.current = true; setT(Number(e.target.value)); }}
          aria-label="Tag wählen"
          aria-valuetext={stand}
          style={{ flex: 1, accentColor: v("--color-accent"), minWidth: 0 }}
        />
      </div>
      <div {...{ [EXPORT_IGNORE_ATTR]: "" }} style={{ borderTop: `1px solid ${v("--color-border")}`, marginTop: space.lg }} />

      {/* Im Bild: der eingestellte Stand steht schon im Kopf; hier nur der
          Hinweis, dass das Bild einen Zwischenstand und ein Zeitfenster zeigt. */}
      <ExportOnly style={{ marginTop: space.md }}>
        <span style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
          {tag < T ? `Zwischenstand am ${stand} von ${jahre} Jahren` : `Endstand nach ${jahre} Jahren`}
        </span>
      </ExportOnly>

      <WidgetFooter
        widget={widget}
        chartExport={{ downloadPng, sharePng, shareWhatsApp, shareTwitter, isExporting, canNativeShare, downloadVideo: videoKann ? downloadVideo : undefined, isRecording: aufnahme !== null }}
        onsite={onsite}
        branding={branding}
        showEmbed={showEmbed}
        narrow={narrow}
      />

      <WidgetExportFooter widget={widget} legend={legend} note={exportNote} />
    </div>
  );
}
