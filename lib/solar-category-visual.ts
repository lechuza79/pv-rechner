/** One artwork mapping for municipality and district category tiles. */
export function solarCategoryVisual(label:string):string|undefined {
 if(/balkon|stecker/i.test(label))return '/shared-nav/illustrations/balcony-modern-neon.webp';
 if(/freifl/i.test(label))return '/brand/pv-modules-mono.svg';
 if(/gebäude|dach/i.test(label))return '/shared-nav/illustrations/house-neon.webp';
 return undefined;
}
