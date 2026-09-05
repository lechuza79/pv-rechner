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
import { v, fsPx, space, tokens } from "../../lib/theme";
import { fmtEuroVoll, formatDataAsOf } from "../../lib/atlas-format";
import { PERSONEN, FEED_IN_YEARS } from "../../lib/constants";
import type { Kostenrennen } from "../../lib/kostenrennen";
import { tagesverlauf, tagDatum } from "../../lib/kostenrennen-tage";
import { KostenrennenVideo, videoFormat, type VideoFrameDaten } from "../../lib/kostenrennen-video";
import { downloadBlob } from "../../lib/chart-export";
import { sourceLabel } from "../../lib/data-sources";
import { brandLabel } from "../../lib/widget-registry";

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
// auf einer Breite stehen. Die y-Achse ist eine KAMERA auf die PV-Linie: Sie
// zeigt deren Spanne plus anderthalb Spannen Luft nach unten (und oben) — der
// Haushalt ohne Anlage liegt anfangs unter dem Bild und wird am Rand als Marke
// mit Zahl geführt, steigt ins Bild, kreuzt, führt. Zum Ende hin ist die Spanne
// der PV-Linie so groß, dass beide Linien vollständig im Bild stehen. Nur so
// sind die Tage sichtbar: Ein Sonnen- gegen einen Regentag sind 3 €, und in
// einer Skala mit den 14.000 € Anschaffung dazwischen ist das kein Bildpunkt.
//
// Selbst-enthaltende Karte nach dem Muster von GruengasWidget: dasselbe Bauteil
// steht unter /embed/pv-kostenrennen und direkt gerendert im Ratgeber (onsite).
// Abspielen und Schieberegler tragen data-sc-export-ignore; das Bild zeigt den
// eingestellten Stand als Text.

// Das Tempo zieht an: Die ersten zwei Jahre laufen ruhig (je rund 8 Sekunden —
// man sieht Wochen, Monate, Winter gegen Sommer), danach beschleunigt die
// Wiedergabe stetig; das letzte Jahr dauert gut eine halbe Sekunde, alles
// zusammen rund 55 Sekunden. Am Anfang passiert das Interessante, gegen Ende bewegen
// sich nur noch zwei gerade Linien.
const RUHIGE_TAGE = 730;
// Anteil der Strecke, ab dem die Geldskala linear auf das Gesamtbild aufzieht.
const ZOOM_AB = 0.5;
const MS_JE_TAG_START = 22;
const MS_JE_TAG_ENDE = 1.5;
const msJeTag = (t: number, T: number) => {
  if (t < RUHIGE_TAGE) return MS_JE_TAG_START;
  const u = Math.min(1, (t - RUHIGE_TAGE) / (T - RUHIGE_TAGE));
  return MS_JE_TAG_START * Math.pow(MS_JE_TAG_ENDE / MS_JE_TAG_START, Math.sqrt(u));
};
const MIN_TAGE = 365; // das erste Jahr füllt das Bild
const SCHRITT_MS = 500; // bei reduzierter Bewegung: ein Jahr je Schritt

const MONATE_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

// Semantisch, nicht themebar: die Anlage im Akzent, der Haushalt ohne Anlage neutral.
const FARBE_PV = "var(--color-accent)";
const FARBE_OHNE = "var(--color-text-primary)";
// Auf der Video-Leinwand gibt es keine CSS-Variablen — dieselben Tokens als Wert.
const FARBE_PV_HEX = tokens["--color-accent"];
const FARBE_OHNE_HEX = tokens["--color-text-primary"];

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
  const svgRef = useRef<SVGSVGElement>(null);
  // Video-Aufnahme: läuft in Echtzeit mit der Animation (siehe lib/kostenrennen-video.ts).
  const [aufnahme, setAufnahme] = useState<KostenrennenVideo | null>(null);
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
      // Der erste rAF-Zeitstempel kann VOR dem performance.now() des Effekts
      // liegen — ein negatives dt machte aus Tag 0 den Tag −1 (NaN im Chart).
      const dt = Math.max(0, now - last);
      last = now;
      setT((prev) => {
        const n = Math.min(Math.max(0, prev + dt / msJeTag(prev, T)), T);
        if (n >= T) setSpielt(false);
        return n;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [spielt, ruhig, T, verlauf]);

  // Kumulierte Abspielzeit je Tag — die Zeitachse der Zeitleiste (siehe unten).
  const abspielMs = useMemo(() => {
    const a = new Float64Array(T + 1);
    for (let d = 1; d <= T; d++) a[d] = a[d - 1] + msJeTag(d - 1, T);
    return a;
  }, [T]);
  const tag = Math.min(T, Math.floor(t));
  const datum = tagDatum(verlauf, rennen.startJahr, tag);
  const stand = tag === 0 ? `${rennen.startJahr} · Start` : `${datum.tag}. ${MONATE[datum.monat]} ${datum.jahr}`;
  const zeitraum = (bis: number) => `${rennen.startJahr} – ${bis}`;

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
  // Zwei Erklär-Marken im ersten Jahr: Wo die PV-Linie am Ende des Winters am
  // höchsten steht und am Ende des Sommers am tiefsten. Sie erscheinen, wenn
  // die Spitze den Punkt passiert, und verschwinden im Herbst des zweiten
  // Jahres — bevor der zweite Winter die Kurve über die Beschriftung schiebt.
  const jahreszeiten = useMemo(() => {
    const ende = Math.min(T, 365);
    let hoch = 1, tief = 1;
    for (let d = 1; d <= ende; d++) {
      if (kPv[d] > kPv[hoch]) hoch = d;
    }
    for (let d = hoch; d <= ende; d++) {
      if (kPv[d] < kPv[tief] || tief < hoch) tief = d;
    }
    if (hoch < 30 || tief <= hoch || kPv[hoch] - kPv[tief] < 50) return [];
    return [
      { tag: hoch, text: "Winter: wenig Sonne", erklaerung: "Die Anlage liefert wenig, der Haushalt kauft fast alles zu — die Rechnung wächst beinahe so schnell wie ohne Anlage.", oben: true },
      { tag: tief, text: "Sommer: die Anlage spart", erklaerung: "Eigenverbrauch und Einspeisung bringen mehr, als der Reststrom kostet — die Linie fällt sogar.", oben: false },
    ];
  }, [kPv, T]);
  // Das zweite Ereignis nach der Kreuzung: Nach FEED_IN_YEARS endet die
  // EEG-Vergütung (derselbe Schnitt wie im Rechner), ab da steigt die PV-Linie
  // sichtbar steiler — ohne Marke liest sich der Knick als Fehler.
  const einspeiseEndeTag = FEED_IN_YEARS < verlauf.jahre ? verlauf.ersterTag[12 * FEED_IN_YEARS + 1] : null;

  const xEnd = Math.max(MIN_TAGE, t);
  const xStart = 0;
  const iStart = 0;
  const iEnd = Math.min(T, Math.ceil(t));
  // Kamera auf die PV-Linie: ihre Spanne im Bild, dazu LUFT Luft-Spannen nach
  // unten und oben — genug, dass der Haushalt ohne Anlage hereinwachsen kann,
  // ohne dass die Skala springt. Sein aktueller Wert wird eingeschlossen, sobald
  // er innerhalb dieser Luft liegt; davor steht er als Marke am Rand.
  let pvLo = Infinity, pvHi = -Infinity;
  for (let d = iStart; d <= iEnd; d++) {
    pvLo = Math.min(pvLo, kPv[d]);
    pvHi = Math.max(pvHi, kPv[d]);
  }
  if (!Number.isFinite(pvLo)) { pvLo = 0; pvHi = 1; }
  const LUFT = 0.9;
  const spanne = Math.max(120, pvHi - pvLo);
  const ohneTip = kOhne[tag];
  const lo = Math.min(pvLo, Math.max(ohneTip, pvLo - LUFT * spanne));
  const hi = Math.max(pvHi, Math.min(ohneTip, pvHi + LUFT * spanne));
  // Ab der Hälfte der Strecke öffnet sich die Kamera linear auf das ganze
  // Bild (0 € bis zum Endstand des teureren Haushalts), sodass am letzten Tag
  // beide Linien vollständig im Bild stehen — unabhängig davon, wie weit sie
  // auseinanderliegen.
  const pad = Math.max(20, (hi - lo) * 0.06);
  const vollHi = Math.max(kPv[T], kOhne[T]) * 1.04;
  const w = Math.min(1, Math.max(0, (t - T * ZOOM_AB) / (T * (1 - ZOOM_AB))));
  const yMin = Math.max(0, (lo - pad) * (1 - w)), yMax = (hi + pad) * (1 - w) + vollHi * w;
  const ohneImBild = ohneTip >= yMin && ohneTip <= yMax;
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
    ...(ohneImBild ? [{ key: ohne.key, farbe: FARBE_OHNE, wert: wertBei(kOhne, t), zahl: kOhne[tag] }] : []),
  ].map((s) => ({ ...s, y: yL(s.wert) })).sort((a, b) => a.y - b.y);
  const spitzeDy = (i: number) => (spitzen.length > 1 && Math.abs(spitzen[0].y - spitzen[1].y) < 16 ? (i === 0 ? -6 : 13) : 4);
  // Liegt der Haushalt ohne Anlage außerhalb des Bildes, zeigt eine Marke am
  // Rand, wo er steht — unten, solange er hinten liegt, oben, wenn er führt.
  const ohneUnten = !ohneImBild && ohneTip < yMin;
  const clipId = `kr-clip-${rennen.startJahr}`;

  const haushalt = PERSONEN[2];
  const fenster = rennen.wetterFenster;
  // Sekundär, nur Icon — dieselbe Form wie die Aktionsknöpfe in der Fußzeile.
  const knopf: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 32, height: 32, padding: 0, borderRadius: v("--radius-md"), flexShrink: 0,
    border: `1px solid ${v("--color-border-accent")}`, background: v("--color-bg"), color: v("--color-accent"),
    cursor: "pointer",
  };
  const legend: ExportLegendEntry[] = [
    { color: FARBE_OHNE, label: ohne.label, shape: "line" },
    { color: FARBE_PV, label: pv.label, shape: "line" },
  ];
  const amEnde = t >= T;

  // Die Ereignisse an der Zeitleiste unter dem Chart (Muster: die
  // Weichenstellungen im Zubau-Chart): ein Punkt auf der Spur, die Beschreibung
  // darüber, die gestrichelte Linie bleibt im Chart. Sie erscheinen, wenn die
  // Wiedergabe sie erreicht; am Ende steht dort die Gesamtersparnis. Jedes
  // Ereignis hat seine eigene Textzeile — nebeneinander passen sie nicht.
  const ersparnis = kOhne[T] - kPv[T];
  // Immer EIN Ereignis ist aktiv — das zuletzt erreichte; es wird unter der
  // Spur erklärt, das vorige blendet aus (Muster: Weichenstellungen im Zubau-Chart).
  type Ereignis = { tag: number; jahr: number; label: string; text: string };
  const jahrVon = (d: number) => tagDatum(verlauf, rennen.startJahr, d).jahr;
  const ereignisse: Ereignis[] = [
    { tag: 0, jahr: rennen.startJahr, label: `Anlage gekauft · ${fmtEuroVoll(pv.investition)}`,
      text: `Der PV-Haushalt startet mit der Anschaffung, der andere bei null. Ab jetzt zählt jeder Tag Strom.` },
    // Die beiden Jahreszeiten-Hinweise des ersten Jahres. Ihre Punkte bleiben —
    // die Achse schiebt sie später zusammen, aber ein Punkt, der plötzlich
    // verschwindet, sieht aus wie ein Fehler.
    ...jahreszeiten.map((m) => ({ tag: m.tag, jahr: jahrVon(m.tag), label: m.text, text: m.erklaerung })),
  ];
  if (bezahltTag !== null) {
    const d = tagDatum(verlauf, rennen.startJahr, bezahltTag);
    ereignisse.push({ tag: bezahltTag, jahr: d.jahr, label: `Anlage bezahlt · ${MONATE_KURZ[d.monat]} ${d.jahr}`,
      text: `Die Linien kreuzen sich: Was die Anlage gekostet hat, ist über die gesparte Stromrechnung zurück. Ab hier liegt der PV-Haushalt vorn.` });
  }
  if (einspeiseEndeTag != null) {
    ereignisse.push({ tag: einspeiseEndeTag, jahr: jahrVon(einspeiseEndeTag), label: `Einspeisevergütung endet`,
      text: `Nach ${FEED_IN_YEARS} Jahren gibt es für eingespeisten Strom nichts mehr. Die Anlage spart weiter den eigenen Verbrauch, die Linie steigt steiler.` });
  }
  ereignisse.push({
    tag: T, jahr: jahrVon(T),
    label: ersparnis >= 0 ? `Ersparnis nach ${rennen.jahre} Jahren: ${fmtEuroVoll(ersparnis)}` : `Mehrkosten nach ${rennen.jahre} Jahren: ${fmtEuroVoll(-ersparnis)}`,
    text: `Endstand: ${fmtEuroVoll(kOhne[T])} ohne Anlage gegen ${fmtEuroVoll(kPv[T])} mit Anlage, Anschaffung eingerechnet.`,
  });
  const sichtbareEreignisse = ereignisse.filter((e) => t >= e.tag);
  const aktivesEreignis = sichtbareEreignisse.length ? sichtbareEreignisse[sichtbareEreignisse.length - 1] : null;
  // Die Zeitleiste ist zugleich der Regler und läuft in ABSPIELZEIT, nicht in
  // Kalendertagen: Der Fortschritt bewegt sich damit gleichmäßig wie bei einem
  // Video, und die ersten zwei Jahre — ein Drittel der Wiedergabe — bekommen
  // ein Drittel der Spur, sodass Kauf, Winter und Sommer nicht auf einem Fleck
  // liegen. In Kalendertagen wären sie zusammen 2,5 % der Strecke.
  const posPct = (d: number) => (abspielMs[Math.min(T, Math.max(0, Math.round(d)))] / abspielMs[T]) * 100;
  const tagZuAbspielMs = (ms: number) => {
    if (ms >= abspielMs[T] - 1) return T; // die Endposition des Reglers trifft den letzten Tag exakt
    let lo = 0, hi = T;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (abspielMs[mid] < ms) lo = mid + 1; else hi = mid; }
    return lo;
  };

  // Der Video-Frame: was die Leinwand in diesem Render zeichnen soll. Als Ref,
  // damit die Aufnahme-Schleife immer den jüngsten Stand malt.
  const frameDaten: VideoFrameDaten = {
    titel: WIDGETS.kostenrennen.title,
    jahr: zeitraum(tag === 0 ? rennen.startJahr : datum.jahr),
    svg: svgRef.current,
    legende: [{ farbe: FARBE_OHNE_HEX, label: ohne.label }, { farbe: FARBE_PV_HEX, label: pv.label }],
    zeitleiste: sichtbareEreignisse.map((e) => ({ posPct: posPct(e.tag), aktiv: e === aktivesEreignis })),
    ereignis: aktivesEreignis ? { jahr: String(aktivesEreignis.jahr), label: aktivesEreignis.label, text: aktivesEreignis.text } : null,
    fortschrittPct: posPct(t),
    marke: `${brandLabel(WIDGETS.kostenrennen.kind)} solar-check.io`,
    quelle: WIDGETS.kostenrennen.sources.map((q) => sourceLabel(q, { kurz: true })).join(" · "),
  };
  frameRef.current = () => (aufnahme ? aufnahme.frame(frameDaten) : Promise.resolve());

  // Aufnahme starten: von vorn, in Echtzeit; die Schleife malt, solange sie läuft.
  const downloadVideo = () => {
    const format = videoFormat();
    if (!format || aufnahme) return;
    const video = new KostenrennenVideo(format);
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
      if (blob.size > 0) downloadBlob(blob, `stromkosten-mit-und-ohne-solaranlage.${aufnahme.format.ext}`);
    }, 1500);
    return () => clearTimeout(timer);
  }, [aufnahme, spielt, t, T]);

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
      {/* Titel groß; das „?" hängt am letzten Wort, auch wenn der Titel umbricht. */}
      <div style={{ fontSize: v("--font-size-h2"), fontWeight: 800, lineHeight: 1.2, color: v("--color-text-primary"), marginBottom: space.md }}>
        {WIDGETS.kostenrennen.title}{" "}
        <span style={{ display: "inline-block", verticalAlign: "middle", fontSize: v("--font-size-body"), fontWeight: 400 }}>
        <InfoTooltip title="Der Beispielhaushalt" ariaLabel="Angaben zum Beispielhaushalt">
          Ein Haushalt, {rennen.jahre} Jahre, {fenster ? `das Wetter der Jahre ${fenster.von}–${fenster.bis}` : "ein Referenzjahr"}: Wer hat wann mehr für Strom bezahlt?{" "}
          {haushalt.label} Personen mit {haushalt.verbrauch.toLocaleString("de-DE")} kWh Jahresverbrauch, teils im Homeoffice.
          Die Anlage: {pv.kwp} kWp{pv.speicherKwh > 0 ? ` mit ${pv.speicherKwh} kWh Speicher` : " ohne Speicher"} für {fmtEuroVoll(pv.investition)},
          Ertrag {rennen.annahmen.ertragKwp.toLocaleString("de-DE")} kWh je kWp (deutscher Schnitt bei optimaler Ausrichtung), Teileinspeisung zu{" "}
          {rennen.annahmen.einspeisungCt.toLocaleString("de-DE")} ct/kWh über {FEED_IN_YEARS} Jahre, danach nichts mehr für eingespeisten Strom. Strompreis {rennen.annahmen.strompreisCt.toLocaleString("de-DE")} ct/kWh,
          Anstieg {rennen.annahmen.steigerungPct.toLocaleString("de-DE")} % pro Jahr. Wetter: {rennen.annahmen.wetter}; innerhalb des Monats nach der
          Tagesstrahlung der DWD-Stationen verteilt — Näherungswerte ohne Gewähr.
        </InfoTooltip>
        </span>
      </div>

      {/* Das Jahr, groß — und daneben das „?", das erklärt, was die Linien
          zählen. Datum und „nach n Jahren" stehen nicht mehr daneben: Das Jahr
          trägt die Geschichte, der Rest stand im Weg (Betreiber, 05.09.2026). */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: `${space.xs}px ${space.md}px`, marginBottom: space.md }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: space.sm }}>
          {/* Zeitraum „Start – jetzt", in fester Breite (Tabellenziffern + Platz für
              das letzte Jahr), damit die Zeile beim Hochzählen nicht springt. */}
          <span style={{ fontFamily: v("--font-mono"), fontSize: v("--font-size-body"), fontWeight: 700, color: v("--color-text-primary"), lineHeight: 1.3, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", minWidth: `${zeitraum(rennen.startJahr + rennen.jahre).length}ch`, display: "inline-block" }}>
            {zeitraum(tag === 0 ? rennen.startJahr : datum.jahr)}
          </span>
          <InfoTooltip title="Was hier zählt" ariaLabel="Was als Stromkosten zählt">
          Alles, was der Haushalt bis zu diesem Tag für Strom ausgegeben hat: die Stromrechnung mit steigendem Preis, beim
          PV-Haushalt dazu die Anschaffung der Anlage, abzüglich der Einspeisevergütung. Wo sich die Linien kreuzen, ist die
          Anlage bezahlt. Die Zeitachse wächst vom ersten Jahr bis zum ganzen Zeitraum; die Geldskala folgt der PV-Linie —
          der Haushalt ohne Anlage liegt anfangs unter dem Bild und wird am Rand mit seiner Zahl geführt, bis er hereinwächst.
          </InfoTooltip>
        </span>
        {/* Legende neben dem Zeitraum: die Spitzen tragen nur Zahlen, die Zuordnung
            braucht einen Namen. Im Bild kommt sie aus dem Bild-Fuß. */}
        <div {...{ [EXPORT_IGNORE_ATTR]: "" }} style={{ display: "flex", flexWrap: "wrap", gap: `${space.xxs}px ${space.lg}px`, marginLeft: space.sm }}>
          {[{ l: ohne, f: FARBE_OHNE }, { l: pv, f: FARBE_PV }].map(({ l, f }) => (
            <span key={l.key} style={{ display: "inline-flex", alignItems: "center", gap: space.sm, fontSize: v("--font-size-small"), color: v("--color-text-secondary"), whiteSpace: "nowrap", lineHeight: 1.3 }}>
              <span style={{ width: 14, height: 3, borderRadius: 2, background: f }} />
              {narrow ? l.kurz : l.label}
            </span>
          ))}
        </div>
      </div>

      <ExportBox>

        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
          aria-label={`Stromkosten ${rennen.startJahr} bis ${stand}: ${ohne.label} ${fmtEuroVoll(kOhne[tag])}, ${pv.label} ${fmtEuroVoll(kPv[tag])}`}>
          {/* Achsenzahlen blenden ein, wenn sie erscheinen: Jede Marke ist per key ein
              eigenes Element und wird beim Auftauchen neu gemountet — die Animation
              läuft genau dann. Bei reduzierter Bewegung steht sie sofort. */}
          <style>{`.kr-neu{animation:kr-fade-in 600ms ease-out both}@keyframes kr-fade-in{from{opacity:0}to{opacity:1}}@media (prefers-reduced-motion:reduce){.kr-neu{animation:none}}`}</style>
          {/* Raster + Skala. Die Skala steht dauerhaft: Ohne Überfahren (Bild,
              Telefon) gäbe es sonst keine Größenordnung. */}
          {yTicks.map((val) => (
            <g key={val} className="kr-neu">
              <line x1={P.l} x2={P.l + cW} y1={yL(val)} y2={yL(val)} stroke="var(--color-chart-grid)" strokeWidth={0.5} />
              <text x={P.l - 6} y={yL(val) + 3} textAnchor="end" fontSize={fsPx("--font-size-micro")} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">
                {narrow ? `${(val / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} T€` : fmtEuroVoll(val)}
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

          {/* Die Linien bis heute — auf die Zeichenfläche beschnitten, weil der
              Haushalt ohne Anlage anfangs unter dem Bild verläuft. */}
          <defs><clipPath id={clipId}><rect x={P.l} y={P.t} width={cW} height={cH} /></clipPath></defs>
          <g clipPath={`url(#${clipId})`}>
            <polyline points={pfad(kOhne)} fill="none" stroke={FARBE_OHNE} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            <polyline points={pfad(kPv)} fill="none" stroke={FARBE_PV} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          </g>
          {!ohneImBild && (
            <g>
              <path d={ohneUnten ? `M${r2(xL(t) - 5)},${y0 - 8} L${r2(xL(t) + 5)},${y0 - 8} L${r2(xL(t))},${y0 - 1} Z` : `M${r2(xL(t) - 5)},${P.t + 8} L${r2(xL(t) + 5)},${P.t + 8} L${r2(xL(t))},${P.t + 1} Z`} fill={FARBE_OHNE} />
              <text x={xL(t) + 8} y={ohneUnten ? y0 - 3 : P.t + 12} textAnchor="start" fontSize={fsPx("--font-size-small")} fontWeight={800} fill={FARBE_OHNE} fontFamily="var(--font-mono)" style={{ fontVariantNumeric: "tabular-nums" }}>
                {narrow ? `${(ohneTip / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} T€` : fmtEuroVoll(ohneTip)}
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

        {/* Zeitleiste unter dem Chart, zugleich die Steuerung (Betreiber, 05.09.2026):
            Play links, die Spur linear über alle Jahre mit Fortschritt, darauf die
            Ereignis-Punkte im Stil der Weichenstellungen des Zubau-Charts — der
            zuletzt erreichte groß, darunter erklärt, das vorige blendet aus. Der
            Schieberegler liegt unsichtbar auf der Spur und trägt Tastatur und
            Vorlesen. Im Bild bleiben Spur und Erklärung, Knopf und Regler nicht. */}
        <div style={{ display: "flex", alignItems: "center", gap: space.lg, marginTop: space.lg }}>
          <span {...{ [EXPORT_IGNORE_ATTR]: "" }} style={{ display: "inline-flex" }}>
            <button
              type="button"
              onClick={() => {
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
          </span>
          <div style={{ position: "relative", flex: 1, height: 26 }}>
            <div style={{ position: "absolute", top: 12, left: 0, right: 0, height: 2, background: v("--color-border") }} />
            <div style={{ position: "absolute", top: 12, left: 0, width: `${posPct(t)}%`, height: 2, background: v("--color-accent") }} />
            {sichtbareEreignisse.map((e) => {
              const aktiv = e === aktivesEreignis;
              const d = aktiv ? 22 : 13;
              return (
                <span key={e.tag} className="kr-neu" title={e.label} style={{ position: "absolute", left: `${posPct(e.tag)}%`, top: 13 - d / 2, width: d, height: d, transform: "translateX(-50%)", borderRadius: "50%", background: v("--color-accent"), border: `2px solid ${v("--color-bg")}`, boxSizing: "border-box", boxShadow: aktiv ? "0 2px 6px rgba(19,101,234,0.35)" : "none", transition: "width .2s ease, height .2s ease, top .2s ease", zIndex: aktiv ? 2 : 1 }} />
              );
            })}
            <input
              {...{ [EXPORT_IGNORE_ATTR]: "" }}
              type="range"
              min={0}
              max={Math.ceil(abspielMs[T])}
              step={1}
              value={Math.round(abspielMs[tag])}
              onChange={(e) => { setSpielt(false); gestartet.current = true; setT(tagZuAbspielMs(Number(e.target.value))); }}
              aria-label="Jahr wählen"
              aria-valuetext={stand}
              style={{ position: "absolute", left: 0, top: 0, width: "100%", height: 26, margin: 0, opacity: 0, cursor: "pointer", zIndex: 3 }}
            />
          </div>
        </div>
        <div style={{ minHeight: 64, marginTop: space.sm }}>
          {aktivesEreignis && (
            <div key={aktivesEreignis.tag} className="kr-neu">
              <div style={{ fontSize: v("--font-size-small"), fontWeight: 800, color: v("--color-text-primary"), marginBottom: space.xxs }}>
                <span style={{ fontFamily: v("--font-mono") }}>{aktivesEreignis.jahr}</span>
                {"  ·  "}
                {aktivesEreignis.label}
              </div>
              <div style={{ fontSize: v("--font-size-small"), lineHeight: 1.5, color: v("--color-text-secondary") }}>{aktivesEreignis.text}</div>
            </div>
          )}
        </div>
      </ExportBox>

      {/* Im Bild: der eingestellte Stand steht schon im Kopf (Datum); hier nur der
          Hinweis, dass das Bild einen Zwischenstand und ein Zeitfenster zeigt. */}
      <ExportOnly style={{ marginTop: space.md }}>
        <span style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
          {tag < T ? `Zwischenstand am ${stand} von ${rennen.jahre} Jahren` : `Endstand nach ${rennen.jahre} Jahren`}
        </span>
      </ExportOnly>

      <WidgetFooter
        widget={WIDGETS.kostenrennen}
        chartExport={{ downloadPng, sharePng, shareWhatsApp, shareTwitter, isExporting, canNativeShare, downloadVideo: videoKann ? downloadVideo : undefined, isRecording: aufnahme !== null }}
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
