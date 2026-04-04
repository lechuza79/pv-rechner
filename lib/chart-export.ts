// SVG → Canvas → PNG export pipeline with full context + branding.
// Builds a self-contained image: title, stats, chart, legend, "Powered by" footer.

import { tokens, TokenName } from './theme';

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

export interface ExportContext {
  title: string;                    // e.g. "Stromerzeugung nach Energieträger in Deutschland"
  subtitle?: string;                // e.g. "Die letzten 30 Tage"
  stats?: ExportStat[];             // summary widgets row
  legend?: ExportLegendItem[];      // colored legend items below chart
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

async function loadFonts(): Promise<void> {
  if (fontCssCache) return;
  try {
    const cssRes = await fetch(
      'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const cssText = await cssRes.text();
    const fontFaces: string[] = [];
    const blockRegex = /@font-face\s*\{[^}]+\}/g;
    let match: RegExpExecArray | null;
    while ((match = blockRegex.exec(cssText)) !== null) {
      const block = match[0];
      const urlMatch = block.match(/url\((https:\/\/[^)]+\.woff2)\)/);
      if (!urlMatch) { fontFaces.push(block); continue; }
      try {
        const fontRes = await fetch(urlMatch[1]);
        const fontBuf = await fontRes.arrayBuffer();
        const fontBytes = new Uint8Array(fontBuf);
        let fontBinary = '';
        for (let i = 0; i < fontBytes.length; i++) fontBinary += String.fromCharCode(fontBytes[i]);
        fontFaces.push(block.replace(urlMatch[0], `url(data:font/woff2;base64,${btoa(fontBinary)})`));
      } catch {
        fontFaces.push(block);
      }
    }
    fontCssCache = fontFaces.join('\n');
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
const STATS_H = 72;       // stat widgets row
const STATS_GAP = 8;      // gap between stat boxes
const LEGEND_H = 36;      // legend row
const FOOTER_H = 44;      // "Powered by" footer
const CARD_R = 20;        // card border radius
const INNER_R = 14;       // inner card radius
const FONT_TEXT = "'DM Sans',system-ui,sans-serif";
const FONT_MONO = "'JetBrains Mono',monospace";

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

  // Calculate vertical layout
  let y = PAD;
  const titleY = y; y += TITLE_H;
  const statsY = hasStats ? y : 0; if (hasStats) y += STATS_H + 8;
  const chartY = y;
  const chartBoxH = chartHeight + 16; // padding inside chart card
  y += chartBoxH;
  const legendY = hasLegend ? y + 4 : 0; if (hasLegend) y += LEGEND_H;
  y += 8; // gap before footer
  const footerY = y; y += FOOTER_H;
  const totalH = y + PAD;

  // Serialize chart SVG
  const serializer = new XMLSerializer();
  const cloned = chartSvg.cloneNode(true) as SVGSVGElement;
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
  // Separator
  p.push(`<line x1="${PAD}" x2="${totalW - PAD}" y1="${titleY + TITLE_H - 4}" y2="${titleY + TITLE_H - 4}" stroke="${tokens['--color-border']}" stroke-width="1"/>`);

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
      p.push(`<rect x="${lx}" y="${ly - 5}" width="10" height="10" rx="2" fill="${item.color}"/>`);
      p.push(`<text x="${lx + 14}" y="${ly + 3}" font-family="${FONT_TEXT}" font-size="11" fill="${tokens['--color-text-muted']}">${esc(item.label)}</text>`);
      lx += 14 + item.label.length * 6.5 + 16; // approximate text width + gap
    });
  }

  // ── Footer: "Powered by" + Logo ──
  p.push(`<rect x="${PAD}" y="${footerY}" width="${innerW}" height="${FOOTER_H}" rx="12" fill="${tokens['--color-bg-muted']}"/>`);

  const logoW = 90;
  const logoH = 90 * (62 / 263); // ≈ 21
  const footerCenterY = footerY + FOOTER_H / 2;

  // Right-aligned: "Powered by" text + logo
  const logoX = totalW - PAD - 10 - logoW;
  const textX = logoX - 15;

  p.push(`<text x="${textX}" y="${footerCenterY}" text-anchor="end" dominant-baseline="central" font-family="${FONT_TEXT}" font-size="11" fill="${tokens['--color-text-secondary']}">Powered by</text>`);
  if (logoBase64Cache) {
    p.push(`<image href="${logoBase64Cache}" x="${logoX}" y="${footerCenterY - logoH / 2}" width="${logoW}" height="${logoH}"/>`);
  }

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

// ─── Helpers ────────────────────────────────────────────────────────────────

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
