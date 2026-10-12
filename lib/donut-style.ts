/** Shared attenuation for inactive segments across donut variants. */
export const DONUT_INACTIVE_OPACITY = 0.3;

/** Neutral segment tones. Accent color belongs to selection, never a category. */
export function donutNeutralColor(index:number):string {
  const ink=[100,75,50,85][index%4];
  return `color-mix(in srgb,var(--widget-ink) ${ink}%,var(--widget-surface))`;
}
