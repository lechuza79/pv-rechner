import {widgetVariantFromQuery} from './widget-appearance';
import type {GalleryEntry} from './widget-gallery';

/** Derived browsing/audit inventory. The registry and gallery remain the owners. */
export function widgetInventory(entries: readonly GalleryEntry[], allVariants = true) {
  return entries.flatMap(entry => {
    const seen = new Set<string>();
    return entry.variants.flatMap((variant, index) => {
      const sources = allVariants ? [variant.src, variant.compactSrc, variant.heroSrc] : index === 0 ? [variant.src] : [];
      return sources.flatMap((src, representation) => {
        if (!src) return [];
        const url = new URL(src, 'https://solar-check.io');
        url.searchParams.sort();
        const key = url.pathname + url.search;
        if (seen.has(key)) return [];
        seen.add(key);
        return [{id: `${entry.id}-${index}-${representation}`, widgetId: entry.id, src,
          label: entry.title, variantLabel: variant.label, group: entry.group,
          presentation: widgetVariantFromQuery(entry.id, url.searchParams),
          detail: url.searchParams.get('detail') ?? 'full',
          controls: url.searchParams.get('controls') !== 'off' && url.searchParams.get('switchable') !== '0'}];
      });
    });
  });
}
