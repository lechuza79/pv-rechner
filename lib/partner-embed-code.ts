import {embedCode} from './embed-code';
import {widgetPartner, type WidgetHeaderMode} from './widget-brand';
import {MUNICIPAL_WIDGET_VIEWS} from './municipal-widget-views';
/** The regular embed generator, with attribution carried inside the partner frame. */
export function partnerEmbedCode(partner: string, widget: keyof typeof MUNICIPAL_WIDGET_VIEWS, header: WidgetHeaderMode = 'full', siteUrl = 'https://solar-check.io') {
  const preset = widgetPartner(partner);
  if (!preset) throw new Error('Unknown partner');
  return embedCode({src: `/embed/partner/${partner}/${widget}/${header}`, width: 960, height: 760,
    titel: `${preset.brand.label} – Solarenergie`, siteUrl, attribution: null, autoHeight: true});
}
