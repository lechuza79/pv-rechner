import {embedCode} from './embed-code';
import {widgetPartner, parsePartnerWidgetHeight, type PartnerWidgetHeight, type WidgetHeaderMode} from './widget-brand';
import {MUNICIPAL_WIDGET_VIEWS} from './municipal-widget-views';
export const PARTNER_EMBED_WIDTHS = [320, 480, 720, 960] as const;
export type PartnerEmbedWidth = typeof PARTNER_EMBED_WIDTHS[number];
/** The regular embed generator, with attribution carried inside the partner frame. */
export function partnerEmbedCode(partner: string, widget: keyof typeof MUNICIPAL_WIDGET_VIEWS, header: WidgetHeaderMode = 'full', siteUrl = 'https://solar-check.io', width: PartnerEmbedWidth = 960, widgetHeight: PartnerWidgetHeight = 720, renderedHeight: number = widgetHeight) {
  const preset = widgetPartner(partner);
  if (!preset) throw new Error('Unknown partner');
  if (!PARTNER_EMBED_WIDTHS.includes(width)) throw new Error('Unsupported embed width');
  if (!parsePartnerWidgetHeight(String(widgetHeight))) throw new Error('Unsupported plot height');
  if (!Number.isFinite(renderedHeight) || renderedHeight < 100 || renderedHeight > 2000) throw new Error('Invalid frame height');
  const heightPath = widgetHeight === 720 ? '' : '/' + widgetHeight;
  return embedCode({src: `/embed/partner/${partner}/${widget}/${header}${heightPath}`, width, height: Math.ceil(renderedHeight),
    titel: `${preset.brand.label} – Solarenergie`, siteUrl, attribution: null, autoHeight: true});
}
