// Das Stromkosten-Rennen als Video: Während die Animation läuft, malt dieses
// Modul jeden Bildschirm-Frame auf eine Leinwand und zeichnet die Leinwand mit
// dem Aufnahme-Baustein des Browsers auf. Heraus kommt eine Datei in dem Format,
// das der Browser hergibt (WebM in Chrome/Firefox, MP4 in Safari).
//
// Warum Echtzeit statt Offline-Rendern: Ein Video, das schneller als in
// Echtzeit entsteht, bräuchte den Video-Encoder samt Container-Schreiber im
// Browser — beides liegt in keinem Browser vollständig frei, ein Container-
// Schreiber wäre eine neue Abhängigkeit. Die Aufnahme dauert deshalb so lange
// wie die Animation (rund 40 Sekunden) und läuft sichtbar mit.
//
// Der Frame wird NICHT vom Bildschirm abfotografiert (das dauert je Bild
// hunderte Millisekunden), sondern aus zwei Teilen gezeichnet: Der Kopf, die
// Legende, der Satz und der Fuß kommen als Text auf die Leinwand; das Chart
// selbst wird als SVG aus dem Dokument gelesen und als Bild gemalt. Farben und
// Schriftgrößen kommen aus den Theme-Tokens, nie getippt.

import { fsPx, tokens, type TokenName } from "./theme";
import { resolveVars } from "./chart-export";
import { EXPORT_IGNORE_ATTR, EXPORT_ONLY_ATTR } from "./export-markers";

export interface VideoFrameDaten {
  titel: string;
  untertitel: string;
  jahr: string;
  svg: SVGSVGElement | null;
  legende: { farbe: string; label: string }[];
  status: string;
  /** Ereignis-Zeitleiste unter der Legende: Position in Prozent der Chartbreite, Farbe als Wert. */
  zeitleiste: { posPct: number; label: string; farbe: string; reihe: number }[];
  spur: { vonPct: number; bisPct: number };
  marke: string;
  quelle: string;
}

/** Das erste Aufnahmeformat, das der Browser beherrscht — oder null. */
export function videoFormat(): { mime: string; ext: string } | null {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return null;
  const kandidaten: [string, string][] = [
    ["video/webm;codecs=vp9", "webm"],
    ["video/webm;codecs=vp8", "webm"],
    ["video/webm", "webm"],
    ["video/mp4", "mp4"],
  ];
  for (const [mime, ext] of kandidaten) {
    if (MediaRecorder.isTypeSupported(mime)) return { mime, ext };
  }
  return null;
}

/** Eine Schriftfamilie, die eine Leinwand versteht: ohne die var()-Kette der Seite. */
function leinwandSchrift(token: TokenName): string {
  return tokens[token].replace(/var\([^)]*\),\s*/g, "");
}

const farbe = (token: TokenName) => tokens[token];

function zeilenUmbruch(ctx: CanvasRenderingContext2D, text: string, maxBreite: number): string[] {
  const woerter = text.split(" ");
  const zeilen: string[] = [];
  let zeile = "";
  for (const w of woerter) {
    const probe = zeile ? `${zeile} ${w}` : w;
    if (ctx.measureText(probe).width > maxBreite && zeile) { zeilen.push(zeile); zeile = w; } else zeile = probe;
  }
  if (zeile) zeilen.push(zeile);
  return zeilen;
}

/** Das SVG des Charts als Bild — CSS-Variablen aufgelöst, Einblend-Animationen
 *  entfernt (in einem Bild stünden sie sonst auf ihrem ersten Frame: unsichtbar). */
async function svgAlsBild(svg: SVGSVGElement, breite: number, hoehe: number): Promise<HTMLImageElement> {
  const klon = svg.cloneNode(true) as SVGSVGElement;
  klon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  klon.setAttribute("width", String(breite));
  klon.setAttribute("height", String(hoehe));
  klon.querySelectorAll("style").forEach((s) => s.remove());
  // Anders als im Bild bleiben die Marken-Texte hier AUS dem Chart: Im Video
  // trägt die Zeitleiste unter dem Chart die Beschriftung, wie auf der Seite.
  klon.querySelectorAll(`[${EXPORT_ONLY_ATTR}]`).forEach((el) => el.remove());
  klon.querySelectorAll(`[${EXPORT_IGNORE_ATTR}]`).forEach((el) => el.remove());
  // Im Dokument erbt das SVG die Seitenschrift; als eigenständiges Bild fiele
  // es auf die Serifen-Voreinstellung zurück.
  klon.setAttribute("font-family", leinwandSchrift("--font-text"));
  klon.querySelectorAll("[class]").forEach((el) => el.removeAttribute("class"));
  const text = resolveVars(new XMLSerializer().serializeToString(klon)).replace(/var\([^)]*\),\s*/g, "");
  const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "sync";
    await new Promise<void>((ok, nein) => { img.onload = () => ok(); img.onerror = () => nein(new Error("SVG-Frame nicht ladbar")); img.src = url; });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const VIDEO_BREITE = 560;
const PAD = 24;
const SKALA = 2;
// Die Karte liegt mit Rand und dem großen Eckradius des Themes auf dem
// gedämpften Seitenhintergrund — ein Video kennt keine Transparenz, also
// braucht die Karte einen Grund, auf dem ihre Ecken sichtbar rund sind.
const RAND = 16;
const REIHE_H = 15;
const ZEITLEISTE_H = 3 * REIHE_H + 24;
const ECKE = parseFloat(tokens["--radius-lg"]);

export class KostenrennenVideo {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private recorder: MediaRecorder | null = null;
  private teile: Blob[] = [];
  private beschaeftigt = false;
  private hoehe = 0;
  readonly format: { mime: string; ext: string };

  constructor(format: { mime: string; ext: string }) {
    this.format = format;
    this.canvas = document.createElement("canvas");
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Keine Zeichenfläche");
    this.ctx = ctx;
  }

  /** Höhe aus dem Chart-Seitenverhältnis; die Leinwand steht fest, bevor die Aufnahme beginnt. */
  vorbereiten(chartSeitenverhaeltnis: number) {
    const chartH = Math.round((VIDEO_BREITE - 2 * PAD) * chartSeitenverhaeltnis);
    this.hoehe = PAD + 22 + 20 + 54 + chartH + 16 + 22 + ZEITLEISTE_H + 40 + PAD;
    this.canvas.width = (VIDEO_BREITE + 2 * RAND) * SKALA;
    this.canvas.height = (this.hoehe + 2 * RAND) * SKALA;
  }

  start() {
    const stream = this.canvas.captureStream(30);
    this.recorder = new MediaRecorder(stream, { mimeType: this.format.mime, videoBitsPerSecond: 4_000_000 });
    this.teile = [];
    this.recorder.ondataavailable = (e) => { if (e.data.size > 0) this.teile.push(e.data); };
    this.recorder.start(250);
  }

  stop(): Promise<Blob> {
    return new Promise((ok) => {
      const r = this.recorder;
      if (!r) { ok(new Blob([], { type: this.format.mime })); return; }
      r.onstop = () => ok(new Blob(this.teile, { type: this.format.mime }));
      r.stop();
      r.stream.getTracks().forEach((t) => t.stop());
    });
  }

  /** Einen Frame zeichnen. Läuft gerade noch das Chart-Bild des vorigen Frames,
   *  wird dieser übersprungen — die Aufnahme nimmt, was auf der Leinwand steht. */
  async frame(d: VideoFrameDaten) {
    if (this.beschaeftigt) return;
    this.beschaeftigt = true;
    try {
      const chartW = VIDEO_BREITE - 2 * PAD;
      const vb = d.svg?.viewBox.baseVal;
      const chartH = vb && vb.width > 0 ? Math.round(chartW * (vb.height / vb.width)) : 0;
      const bild = d.svg ? await svgAlsBild(d.svg, chartW, chartH) : null;
      const c = this.ctx;
      c.setTransform(SKALA, 0, 0, SKALA, 0, 0);
      c.fillStyle = farbe("--color-bg-muted");
      c.fillRect(0, 0, VIDEO_BREITE + 2 * RAND, this.hoehe + 2 * RAND);
      c.beginPath();
      c.roundRect(RAND + 0.5, RAND + 0.5, VIDEO_BREITE - 1, this.hoehe - 1, ECKE);
      c.fillStyle = farbe("--color-bg");
      c.fill();
      c.strokeStyle = farbe("--color-border");
      c.lineWidth = 1;
      c.stroke();
      c.translate(RAND, RAND);
      const sans = leinwandSchrift("--font-text"), mono = leinwandSchrift("--font-mono");
      let y = PAD;
      c.textBaseline = "top";
      c.fillStyle = farbe("--color-text-primary");
      c.font = `700 ${fsPx("--font-size-lead")}px ${sans}`;
      c.fillText(d.titel, PAD, y); y += 22;
      c.fillStyle = farbe("--color-text-muted");
      c.font = `400 ${fsPx("--font-size-small")}px ${sans}`;
      c.fillText(d.untertitel, PAD, y); y += 20;
      c.fillStyle = farbe("--color-text-primary");
      c.font = `800 ${fsPx("--font-size-display-md")}px ${mono}`;
      c.fillText(d.jahr, PAD, y);
      // Der Satz zum Stand steht neben dem Jahr, wie auf der Seite.
      const jahrBreite = c.measureText(d.jahr).width;
      c.font = `400 ${fsPx("--font-size-small")}px ${sans}`;
      c.fillStyle = farbe("--color-text-secondary");
      const satzX = PAD + jahrBreite + 20;
      zeilenUmbruch(c, d.status, VIDEO_BREITE - PAD - satzX).slice(0, 3).forEach((z, i) => c.fillText(z, satzX, y + 4 + i * 17));
      y += 54;
      if (bild) c.drawImage(bild, PAD, y, chartW, chartH);
      y += chartH + 16;
      // Legende
      let x = PAD;
      c.font = `500 ${fsPx("--font-size-small")}px ${sans}`;
      for (const l of d.legende) {
        c.strokeStyle = l.farbe; c.lineWidth = 3; c.lineCap = "round";
        c.beginPath(); c.moveTo(x, y + 8); c.lineTo(x + 16, y + 8); c.stroke();
        c.fillStyle = farbe("--color-text-secondary");
        c.fillText(l.label, x + 22, y);
        x += 22 + c.measureText(l.label).width + 20;
      }
      y += 22;
      // Ereignis-Zeitleiste: Beschriftungen in drei Zeilen, darunter die Spur mit Punkten.
      c.font = `700 ${fsPx("--font-size-caption")}px ${sans}`;
      for (const e of d.zeitleiste) {
        const x = PAD + (e.posPct / 100) * chartW;
        c.fillStyle = e.farbe;
        c.textAlign = e.posPct > 70 ? "right" : e.posPct < 20 ? "left" : "center";
        c.fillText(e.label, x, y + e.reihe * REIHE_H);
      }
      c.textAlign = "left";
      const spurY = y + 3 * REIHE_H + 10;
      c.fillStyle = farbe("--color-border");
      c.fillRect(PAD + (d.spur.vonPct / 100) * chartW, spurY, ((d.spur.bisPct - d.spur.vonPct) / 100) * chartW, 2);
      for (const e of d.zeitleiste) {
        const x = PAD + (e.posPct / 100) * chartW;
        c.beginPath(); c.arc(x, spurY + 1, 5, 0, Math.PI * 2); c.fillStyle = farbe("--color-bg"); c.fill();
        c.beginPath(); c.arc(x, spurY + 1, 3.5, 0, Math.PI * 2); c.fillStyle = e.farbe; c.fill();
      }
      y += ZEITLEISTE_H;
      // Fuß: Marke, darunter die Quelle (Lizenzpflicht — auch im Video).
      const fussY = this.hoehe - PAD - 30;
      c.font = `600 ${fsPx("--font-size-small")}px ${sans}`;
      c.fillStyle = farbe("--color-accent");
      c.fillText(d.marke, PAD, fussY);
      c.font = `400 ${fsPx("--font-size-micro")}px ${sans}`;
      c.fillStyle = farbe("--color-text-muted");
      c.fillText(d.quelle, PAD, fussY + 18);
    } finally {
      this.beschaeftigt = false;
    }
  }
}
