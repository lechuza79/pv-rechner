// SVG → Canvas → PNG export pipeline with full context + branding.
// Builds a self-contained image: title, stats, chart, legend, "Powered by" footer.
//
// Two export paths live here:
//  • buildExportSvg/exportChart — the legacy re-composition path. Grabs the
//    inner chart <svg> and rebuilds title/stats/legend/footer from an
//    ExportContext. Used by the on-site dashboard/rechner/simulation, which
//    supply their surrounding numbers explicitly (they don't sit next to the
//    chart in the DOM).
//  • captureNode/exportNode — the 1:1 capture path (modern-screenshot). Snap-
//    shots the actual rendered card node, so the PNG matches the website
//    pixel-for-pixel (fonts, units, legends, donut center — all included).
//    Used by the self-contained embed widgets. Nodes marked with the
//    data-sc-export-ignore attribute (share/CTA buttons, switchers) are
//    dropped from the snapshot.

import { domToBlob } from 'modern-screenshot';
import { tokens, TokenName } from './theme';
import { brandLabel, type WidgetKind } from './widget-registry';

/** Marker attribute: elements carrying it are excluded from a node snapshot. */
export const EXPORT_IGNORE_ATTR = 'data-sc-export-ignore';
/** Marker attribute: elements hidden on the page but revealed in the snapshot;
 * the attribute value is the `display` to apply (e.g. "flex"). */
export const EXPORT_ONLY_ATTR = 'data-sc-export-only';
/** Marker attribute: extra CSS applied to the element in the snapshot only —
 * for framing that helps a still image but would double up on the page
 * (e.g. a box around the chart area). Value is plain CSS text. */
export const EXPORT_CSS_ATTR = 'data-sc-export-css';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExportStat {
  label: string;     // e.g. "Erneuerbare"
  value: string;     // e.g. "58"
  unit: string;      // e.g. "%"
}

export interface ExportLegendItem {
  color: string;     // hex color
  label: string;     // e.g. "Erneuerbare"
}

export interface ExportNoteItem {
  title?: string;    // e.g. "Das Muster-Haus"
  text: string;
}

export interface ExportContext {
  title: string;                    // e.g. "Stromerzeugung nach Energieträger in Deutschland"
  subtitle?: string;                // e.g. "Die letzten 30 Tage"
  /** Selected state (period, region, variant) — an image has no switcher, so
   * whatever a control decided has to be written out. */
  heading?: string;
  /** Decides the brand wording in the image: a tool invites you to compute,
   * a chart to explore. Defaults to "chart" — the safer claim. */
  kind?: WidgetKind;
  stats?: ExportStat[];             // summary widgets row
  legend?: ExportLegendItem[];      // colored legend items below chart
  /** Footnotes: what the page explains on hover / behind "?" plus assumptions.
   * Rendered in a grey box above the credit line. */
  notes?: ExportNoteItem[];
  source?: string;                  // data-source credit, e.g. "Energy-Charts (Fraunhofer ISE), CC BY 4.0"
}

/**
 * Applies the export markers to a detached clone: drop the interactive bits,
 * reveal the image-only ones, add image-only styling. Shared by BOTH export
 * paths — otherwise a chart marked up for one path silently ignores the markers
 * in the other (the on-site charts kept a second, tiny legend inside the chart
 * SVG because only the 1:1 path honoured data-sc-export-ignore).
 */
export function applyExportMarkers(root: Element): void {
  root.querySelectorAll(`[${EXPORT_IGNORE_ATTR}]`).forEach((el) => el.remove());
  root.querySelectorAll<HTMLElement>(`[${EXPORT_ONLY_ATTR}]`).forEach((el) => {
    el.style.display = el.getAttribute(EXPORT_ONLY_ATTR) || 'block';
  });
  root.querySelectorAll<HTMLElement>(`[${EXPORT_CSS_ATTR}]`).forEach((el) => {
    el.style.cssText += ';' + (el.getAttribute(EXPORT_CSS_ATTR) || '');
  });
}

// ─── Asset Cache ────────────────────────────────────────────────────────────

let logoBase64Cache: string | null = null;
let fontCssCache: string | null = null;
let assetPromise: Promise<void> | null = null;

export function preloadAssets(): Promise<void> {
  if (assetPromise) return assetPromise;
  assetPromise = Promise.all([loadLogo(), loadFonts()]).then(() => {});
  return assetPromise;
}

async function loadLogo(): Promise<void> {
  if (logoBase64Cache) return;
  try {
    const res = await fetch('/logo.png');
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    logoBase64Cache = `data:image/png;base64,${btoa(binary)}`;
  } catch {
    logoBase64Cache = null;
  }
}

// Self-hosted variable fonts for the canvas export (GDPR: no runtime request to
// Google, mirrors the next/font self-hosting already used for page rendering).
// Each file covers the full weight range used above (DM Sans 400/700, JetBrains
// Mono 400/800) via its `wght` variation axis, so one file per family is enough.
const EXPORT_FONT_FACES: { family: string; weightRange: string; url: string }[] = [
  { family: 'DM Sans', weightRange: '100 1000', url: '/fonts/dm-sans-variable.woff2' },
  { family: 'JetBrains Mono', weightRange: '400 800', url: '/fonts/jetbrains-mono-variable.woff2' },
];

async function loadFonts(): Promise<void> {
  if (fontCssCache) return;
  try {
    const fontFaces = await Promise.all(EXPORT_FONT_FACES.map(async ({ family, weightRange, url }) => {
      try {
        const fontRes = await fetch(url);
        const fontBuf = await fontRes.arrayBuffer();
        const fontBytes = new Uint8Array(fontBuf);
        let fontBinary = '';
        for (let i = 0; i < fontBytes.length; i++) fontBinary += String.fromCharCode(fontBytes[i]);
        const dataUrl = `data:font/woff2;base64,${btoa(fontBinary)}`;
        return `@font-face { font-family: '${family}'; font-style: normal; font-weight: ${weightRange}; src: url(${dataUrl}) format('woff2'); }`;
      } catch {
        return '';
      }
    }));
    fontCssCache = fontFaces.filter(Boolean).join('\n');
  } catch {
    fontCssCache = '';
  }
}

// ─── CSS Variable Resolution ────────────────────────────────────────────────

export function resolveVars(svgString: string): string {
  return svgString.replace(/var\(([^)]+)\)/g, (original, name: string) => {
    const trimmed = name.trim() as TokenName;
    return tokens[trimmed] ?? original;
  });
}

// ─── Layout Constants ───────────────────────────────────────────────────────

const PAD = 16;           // outer padding
const TITLE_H = 44;       // title + subtitle row
const HEADING_H = 22;     // selected-state heading
const STATS_H = 72;       // stat widgets row
const STATS_GAP = 8;      // gap between stat boxes
const LEGEND_H = 36;      // legend row
const NOTE_LINE_H = 15;   // one wrapped footnote line
const NOTE_PAD = 10;      // padding inside the grey footnote box
const FOOTER_H = 34;      // credit line: data source left, brand right
const CARD_R = 20;        // card border radius
const INNER_R = 14;       // inner card radius
const FONT_TEXT = "'DM Sans',system-ui,sans-serif";
const FONT_MONO = "'JetBrains Mono',monospace";

/** Rough character width of DM Sans at a given size — SVG has no text wrapping,
 * so footnotes have to be broken into lines by hand. */
function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const perChar = fontSize * 0.52;
  const maxChars = Math.max(20, Math.floor(maxWidth / perChar));
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ─── SVG Composition ────────────────────────────────────────────────────────

export function buildExportSvg(
  chartSvg: SVGSVGElement,
  chartWidth: number,
  chartHeight: number,
  context: ExportContext,
): string {
  const hasStats = context.stats && context.stats.length > 0;
  const hasLegend = context.legend && context.legend.length > 0;

  const innerW = chartWidth;
  const totalW = innerW + PAD * 2;

  // Footnotes: wrap by hand, then the grey box knows its height.
  const noteWidth = innerW - 2 * NOTE_PAD - 8;
  const noteLines: { text: string; bold?: string }[] = [];
  (context.notes ?? []).forEach((n) => {
    const full = n.title ? `${n.title}: ${n.text}` : n.text;
    wrapText(full, noteWidth, 10).forEach((line, i) => {
      noteLines.push(i === 0 && n.title ? { text: line, bold: n.title } : { text: line });
    });
  });
  const hasNotes = noteLines.length > 0;
  const notesBoxH = hasNotes ? noteLines.length * NOTE_LINE_H + 2 * NOTE_PAD : 0;

  // Die Quellzeile teilt sich die Fußzeile mit der Markenzeile rechts — ohne
  // eigenen Umbruch läuft eine lange Quelle in die Marke hinein (SVG bricht
  // Text nicht um). Deshalb: umbrechen und den Fuß mitwachsen lassen.
  const BRAND_W = 250;
  const sourceLines = context.source
    ? wrapText(`Datenquelle: ${context.source}`, innerW - BRAND_W - 16, 10)
    : [];
  const footerH = Math.max(FOOTER_H, sourceLines.length * 13 + 16);

  // Calculate vertical layout
  let y = PAD;
  const titleY = y; y += TITLE_H;
  const headingY = context.heading ? y : 0; if (context.heading) y += HEADING_H;
  const statsY = hasStats ? y : 0; if (hasStats) y += STATS_H + 8;
  const chartY = y;
  const chartBoxH = chartHeight + 16; // padding inside chart card
  y += chartBoxH;
  const legendY = hasLegend ? y + 4 : 0; if (hasLegend) y += LEGEND_H;
  const notesY = hasNotes ? y + 4 : 0; if (hasNotes) y += notesBoxH + 4;
  y += 8; // gap before footer
  const footerY = y; y += footerH;
  const totalH = y + PAD;

  // Serialize chart SVG. Die Marker gelten hier genauso wie beim 1:1-Weg —
  // sonst bliebe z. B. eine zweite kleine Legende im Chart selbst stehen.
  const serializer = new XMLSerializer();
  const cloned = chartSvg.cloneNode(true) as SVGSVGElement;
  applyExportMarkers(cloned);
  let chartStr = resolveVars(serializer.serializeToString(cloned));
  const innerMatch = chartStr.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  const chartInner = innerMatch ? innerMatch[1] : chartStr;
  const vb = chartSvg.getAttribute('viewBox');
  const vbAttr = vb ? `viewBox="${vb}"` : '';

  const p: string[] = [];

  // Root SVG
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">`);

  // Fonts
  if (fontCssCache) {
    p.push(`<defs><style type="text/css">${fontCssCache}</style></defs>`);
  }

  // Outer card background
  p.push(`<rect width="${totalW}" height="${totalH}" rx="${CARD_R}" fill="${tokens['--color-bg']}" stroke="${tokens['--color-border']}" stroke-width="1"/>`);

  // ── Title Bar ──
  p.push(`<text x="${PAD + 8}" y="${titleY + 20}" font-family="${FONT_TEXT}" font-size="14" font-weight="700" fill="${tokens['--color-text-primary']}">${esc(context.title)}</text>`);
  if (context.subtitle) {
    // Measure title width approximately (14px bold ≈ 8px per char)
    const titleTextW = context.title.length * 8;
    p.push(`<text x="${PAD + 8 + titleTextW + 12}" y="${titleY + 20}" font-family="${FONT_TEXT}" font-size="13" font-weight="400" fill="${tokens['--color-text-secondary']}">${esc(context.subtitle)}</text>`);
  }

  // ── Zwischenüberschrift: der gewählte Zustand (Zeitraum, Region, Variante) ──
  if (context.heading) {
    p.push(`<text x="${PAD + 8}" y="${headingY + 14}" font-family="${FONT_TEXT}" font-size="13" font-weight="700" fill="${tokens['--color-text-primary']}">${esc(context.heading)}</text>`);
  }

  // ── Stats Widgets ──
  if (hasStats && context.stats) {
    const count = context.stats.length;
    const boxW = (innerW - (count - 1) * STATS_GAP) / count;
    context.stats.forEach((stat, i) => {
      const bx = PAD + i * (boxW + STATS_GAP);
      const by = statsY;
      // Box background
      p.push(`<rect x="${bx}" y="${by}" width="${boxW}" height="${STATS_H}" rx="12" fill="none" stroke="${tokens['--color-border']}" stroke-width="1"/>`);
      // Label
      p.push(`<text x="${bx + boxW / 2}" y="${by + 18}" text-anchor="middle" font-family="${FONT_TEXT}" font-size="10" fill="${tokens['--color-text-muted']}">${esc(stat.label)}</text>`);
      // Value + unit
      p.push(`<text x="${bx + boxW / 2}" y="${by + 50}" text-anchor="middle" font-family="${FONT_MONO}" font-weight="800" font-size="22" fill="${tokens['--color-text-primary']}">${esc(stat.value)}<tspan font-size="13" font-weight="400" fill="${tokens['--color-text-muted']}" dx="3">${esc(stat.unit)}</tspan></text>`);
    });
  }

  // ── Chart Card ──
  p.push(`<rect x="${PAD}" y="${chartY}" width="${innerW}" height="${chartBoxH}" rx="${INNER_R}" fill="none" stroke="${tokens['--color-border']}" stroke-width="1"/>`);
  // Chart SVG embedded
  p.push(`<svg x="${PAD}" y="${chartY + 8}" width="${innerW}" height="${chartHeight}" ${vbAttr}>`);
  p.push(chartInner);
  p.push(`</svg>`);

  // ── Legend ──
  if (hasLegend && context.legend) {
    let lx = PAD + 16;
    const ly = legendY + 16;
    context.legend.forEach(item => {
      // resolveVars, weil Serienfarben als CSS-Variable ankommen (SCENARIOS in
      // lib/constants.ts nutzen v("--color-…")). Ein var() in einem SVG-Attribut
      // ist ungültig und rendert SCHWARZ — die Legende zeigte damit für alle drei
      // Szenarien dasselbe Kästchen, während die Kurven farbig blieben.
      p.push(`<rect x="${lx}" y="${ly - 5}" width="10" height="10" rx="2" fill="${resolveVars(item.color)}"/>`);
      p.push(`<text x="${lx + 14}" y="${ly + 3}" font-family="${FONT_TEXT}" font-size="11" fill="${tokens['--color-text-muted']}">${esc(item.label)}</text>`);
      lx += 14 + item.label.length * 6.5 + 16; // approximate text width + gap
    });
  }

  // ── Fußnoten in einer grauen Box (wie im 1:1-Weg) ──
  if (hasNotes) {
    p.push(`<rect x="${PAD}" y="${notesY}" width="${innerW}" height="${notesBoxH}" rx="${INNER_R}" fill="${tokens['--color-bg-muted']}"/>`);
    noteLines.forEach((line, i) => {
      const ly = notesY + NOTE_PAD + 11 + i * NOTE_LINE_H;
      if (line.bold) {
        // Erste Zeile eines Eintrags: Stichwort fett, Rest normal.
        const rest = line.text.slice(line.bold.length + 1);
        p.push(`<text x="${PAD + NOTE_PAD}" y="${ly}" font-family="${FONT_TEXT}" font-size="10" fill="${tokens['--color-text-muted']}"><tspan font-weight="700" fill="${tokens['--color-text-secondary']}">${esc(line.bold)}:</tspan>${esc(rest)}</text>`);
      } else {
        p.push(`<text x="${PAD + NOTE_PAD}" y="${ly}" font-family="${FONT_TEXT}" font-size="10" fill="${tokens['--color-text-muted']}">${esc(line.text)}</text>`);
      }
    });
  }

  // ── Fußzeile: Datenquelle links, Marke rechts ──
  // Kein grauer Balken mehr: die Fußnoten-Box trägt jetzt die Fläche, zwei
  // graue Blöcke übereinander lesen sich als ein zerfallener Fuß.
  const logoW = 90;
  const logoH = 90 * (62 / 263); // ≈ 21
  const footerCenterY = footerY + footerH / 2;

  // Rechts: Einladung + Logo. Im Bild gibt es keinen Knopf mehr, der zum
  // Rechner führt — deshalb "Interaktiv selbst rechnen" statt "Powered by".
  const logoX = totalW - PAD - 8 - logoW;
  const textX = logoX - 10;

  p.push(`<text x="${textX}" y="${footerCenterY}" text-anchor="end" dominant-baseline="central" font-family="${FONT_TEXT}" font-size="10" fill="${tokens['--color-text-secondary']}">${esc(brandLabel(context.kind ?? 'chart'))}</text>`);
  if (logoBase64Cache) {
    p.push(`<image href="${logoBase64Cache}" x="${logoX}" y="${footerCenterY - logoH / 2}" width="${logoW}" height="${logoH}"/>`);
  }

  // Left-aligned: data-source credit (licence-required on shared images).
  sourceLines.forEach((line, i) => {
    const ly = footerCenterY - ((sourceLines.length - 1) * 13) / 2 + i * 13;
    p.push(`<text x="${PAD + 8}" y="${ly}" dominant-baseline="central" font-family="${FONT_TEXT}" font-size="10" fill="${tokens['--color-text-muted']}">${esc(line)}</text>`);
  });

  p.push(`</svg>`);
  return p.join('\n');
}

// ─── PNG Export ──────────────────────────────────────────────────────────────

export async function exportToPngBlob(svgString: string, width: number, height: number, scale = 2): Promise<Blob> {
  const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/png');
    };
    img.onerror = () => reject(new Error('Failed to load SVG as image'));
    img.src = svgDataUrl;
  });
}

// ─── Download & Share Helpers ───────────────────────────────────────────────

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 100);
}

export async function shareImage(blob: Blob, title: string, text: string): Promise<boolean> {
  const file = new File([blob], 'solar-check-chart.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ title, text, files: [file] }); return true; }
    catch { return false; }
  }
  return false;
}

export function canNativeShareImages(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false;
  try {
    const file = new File([''], 'test.png', { type: 'image/png' });
    return navigator.canShare({ files: [file] });
  } catch { return false; }
}

// ─── Full Export Pipeline ───────────────────────────────────────────────────

export async function exportChart(
  chartContainer: HTMLElement,
  options: {
    context: ExportContext;
    filename?: string;
    mode: 'download' | 'share';
    shareText?: string;
  }
): Promise<Blob | null> {
  await preloadAssets();

  const svg = chartContainer.querySelector('svg');
  if (!svg) return null;

  const rect = svg.getBoundingClientRect();
  const chartWidth = Math.round(rect.width);
  const chartHeight = Math.round(rect.height);

  const svgString = buildExportSvg(svg, chartWidth, chartHeight, options.context);

  // Parse total dimensions from the generated SVG
  const wMatch = svgString.match(/width="(\d+)"/);
  const hMatch = svgString.match(/height="(\d+)"/);
  const totalW = wMatch ? parseInt(wMatch[1]) : chartWidth;
  const totalH = hMatch ? parseInt(hMatch[1]) : chartHeight;

  const blob = await exportToPngBlob(svgString, totalW, totalH);

  if (options.mode === 'download') {
    downloadBlob(blob, options.filename || 'solar-check-chart.png');
  } else {
    const shared = await shareImage(blob, options.context.title, options.shareText || '');
    if (!shared) downloadBlob(blob, options.filename || 'solar-check-chart.png');
  }

  return blob;
}

// ─── 1:1 Node Capture (modern-screenshot) ────────────────────────────────────

/**
 * Rasterize a DOM node exactly as it renders on screen, with two swaps:
 *  • elements marked data-sc-export-ignore (share buttons, switchers, and the
 *    on-screen footer) are dropped, and
 *  • elements marked data-sc-export-only (hidden on the page) are revealed.
 * This lets a widget show one footer on the web and a print-tuned one in the
 * image (source inline next to "Powered by", no underline) from the same card.
 */
export async function captureNodeToBlob(node: HTMLElement, scale = 2): Promise<Blob> {
  // Snapshot a detached CLONE of the card, not the live node. The live node is
  // owned by React, which re-renders the moment the caller flips its isExporting
  // flag on click — that reconciliation undoes any edit we make to the live tree
  // (display:none, node removal, modern-screenshot's own `filter` all lose this
  // race). A clone is inert: we mutate it once and React never touches it.
  // Rendered off-screen at the live width so layout matches 1:1.
  const rect = node.getBoundingClientRect();
  // Off-screen positioning goes on a WRAPPER, never on the captured node itself:
  // modern-screenshot renders the target node's own transform/offset into the
  // image, so a shifted clone would fall outside the frame (blank PNG). The
  // clone stays in normal flow at 0,0 inside the wrapper.
  const wrapper = document.createElement('div');
  wrapper.style.cssText =
    'position:fixed;top:0;left:-100000px;pointer-events:none;opacity:1;';
  const clone = node.cloneNode(true) as HTMLElement;
  applyExportMarkers(clone);
  // Links aren't clickable in a PNG — drop underlines so credits read as plain
  // text (matches the print footers that already use the plain DataSourceNote).
  clone
    .querySelectorAll<HTMLElement>('a')
    .forEach((a) => a.style.setProperty('text-decoration', 'none'));
  // Freeze animations/transitions on the clone so every element renders at its
  // RESTING style. Without this, intro animations restart on the fresh clone and
  // get captured mid-flight — e.g. the radial's bars use `sc-bar-grow` with
  // `animation-fill-mode: backwards` (opacity 0 before the run), so a freshly
  // cloned card snapshots them at opacity 0 → the whole chart is missing from the
  // PNG. `animation:none` reverts them to their base opacity (visible).
  const freeze = (el: HTMLElement | SVGElement) => {
    el.style.setProperty('animation', 'none', 'important');
    el.style.setProperty('transition', 'none', 'important');
  };
  freeze(clone);
  clone.querySelectorAll<HTMLElement | SVGElement>('*').forEach(freeze);
  clone.style.width = `${rect.width}px`;
  clone.style.margin = '0';
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    return await domToBlob(clone, {
      scale,
      // Transparent canvas → the card's rounded corners stay rounded.
      backgroundColor: undefined,
    });
  } finally {
    wrapper.remove();
  }
}

/**
 * Full node-capture pipeline: snapshot → download or native share (with
 * download fallback). Mirrors exportChart's signature so useChartExport can
 * pick a path without callers changing shape.
 */
export async function exportNode(
  node: HTMLElement,
  options: {
    filename?: string;
    mode: 'download' | 'share';
    shareTitle?: string;
    shareText?: string;
  },
): Promise<Blob | null> {
  const blob = await captureNodeToBlob(node);
  const filename = options.filename || 'solar-check-chart.png';

  if (options.mode === 'download') {
    downloadBlob(blob, filename);
  } else {
    const shared = await shareImage(blob, options.shareTitle || '', options.shareText || '');
    if (!shared) downloadBlob(blob, filename);
  }
  return blob;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
