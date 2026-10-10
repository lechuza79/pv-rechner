import type {CSSProperties} from 'react';

/** A trusted presentation preset layered onto an existing registered widget. */
export type WidgetBrand = {
  id: string;
  label: string;
  headline: string;
  logo: {src: string; alt: string};
  colors: {accent: string; ink: string; muted: string; paper: string; surface: string};
  fonts: {body: string; display: string};
};

/** Verified on nidda.de, 29 September 2026; asset provenance in docs/nidda-widget.md. */
export const NIDDA_WIDGET_BRAND: WidgetBrand = {
  id: 'nidda', label: 'STADT NIDDA', headline: 'Solarenergie wächst vor Ort.',
  logo: {src: '/brands/nidda/logo.svg', alt: 'Nidda – Stadt am Fluss in Oberhessen'},
  colors: {accent: '#0079a8', ink: '#18323e', muted: '#52676b', paper: '#ffffff', surface: '#edf4f7'},
  fonts: {body: 'NiddaLato, Arial, sans-serif', display: 'NiddaOswald, Arial, sans-serif'},
};

export const PARTNER_WIDGET_HEIGHTS = [600, 720, 840] as const;
export type PartnerWidgetHeight = typeof PARTNER_WIDGET_HEIGHTS[number];
export function parsePartnerWidgetHeight(value: string | undefined): PartnerWidgetHeight | undefined {
  if (value === undefined) return 720;
  return PARTNER_WIDGET_HEIGHTS.find(height => String(height) === value);
}

export function widgetBrandStyle(brand: WidgetBrand, widgetHeight: PartnerWidgetHeight = 720): CSSProperties {
  const {colors: c, fonts: f} = brand;
  return {
    '--partner-widget-height': String(widgetHeight) + 'px',
    '--atlas-action': c.accent, '--atlas-action-ink': c.paper,
    '--atlas-text': c.ink, '--atlas-secondary': c.muted,
    '--atlas-card': c.paper, '--atlas-surface': c.surface,
    '--atlas-picker-bg': c.surface, '--atlas-body': f.body, '--atlas-display': f.display,
    '--font-text': f.body,
    '--brand-accent': c.accent, '--brand-paper': c.paper,
    '--chart-export-contrast': c.accent, '--chart-export-background': c.paper,
    '--chart-export-surface': c.surface, '--chart-export-secondary': c.muted,
  } as CSSProperties;
}

export type WidgetHeaderMode = 'full' | 'title' | 'none';
export function parseWidgetHeader(value: string | undefined): WidgetHeaderMode | undefined {
  return value === undefined ? 'full' : ['full', 'title', 'none'].includes(value) ? value as WidgetHeaderMode : undefined;
}
/** Partner presets select an existing municipality, never a second data source. */
const partners: Record<string, {brand: WidgetBrand; ags: string}> = {
  nidda: {brand: NIDDA_WIDGET_BRAND, ags: '06440016'},
};
export function widgetPartner(id: string) { return Object.hasOwn(partners, id) ? partners[id] : undefined; }
