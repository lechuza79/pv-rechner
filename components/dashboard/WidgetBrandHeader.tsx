import type {WidgetBrand, WidgetHeaderMode} from '../../lib/widget-brand';
/** Optional partner introduction; the chart heading and attribution stay independent. */
export function WidgetBrandHeader({brand, mode}: {brand: WidgetBrand; mode: WidgetHeaderMode}) {
  if (mode === 'none') return null;
  return <div className="sc-widget-brand-head">
    <span>{brand.label}</span>
    <p>{brand.headline}</p>
    {mode === 'full' && <img src={brand.logo.src} alt={brand.logo.alt} width={144} height={56}/>}
  </div>;
}
