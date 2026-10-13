import type {CSSProperties} from 'react';
import {ENERGY_COLORS_HEX,CATEGORY_COLORS,RENEWABLE_KEYS,FOSSIL_KEYS,SONSTIGE_KEYS} from './chart-utils';
import {donutNeutralColor} from './donut-style';
/** Shared widget tokens keep plot, tooltip and legend identical across hosts. */
export const ENERGY_WIDGET_CATEGORIES = {
 renewable:'var(--widget-accent)', fossil:donutNeutralColor(0), other:donutNeutralColor(2),
 nuclear:donutNeutralColor(1), nuclearImport:'var(--widget-ink)',
};
const shades=(keys:readonly string[],color:string)=>Object.fromEntries(keys.map((key,index)=>[
 key,`color-mix(in srgb, ${color} ${100-index/Math.max(1,keys.length-1)*55}%, var(--widget-surface))`,
]));
export const ENERGY_WIDGET_COLORS:Record<string,string>={
 ...shades(RENEWABLE_KEYS,ENERGY_WIDGET_CATEGORIES.renewable),
 ...shades(FOSSIL_KEYS,ENERGY_WIDGET_CATEGORIES.fossil),
 ...shades(SONSTIGE_KEYS,ENERGY_WIDGET_CATEGORIES.other),
 nuclear:ENERGY_WIDGET_CATEGORIES.nuclear,
};

// Legacy page consumers keep their existing palette until they adopt a widget
// frame. Both plot and tooltip resolve the same inherited widget colors.
export const ENERGY_CHART_COLORS:Record<string,string>=Object.fromEntries(
 Object.entries(ENERGY_COLORS_HEX).map(([key,color])=>[key,`var(--energy-widget-${key}, ${color})`]),
);
export const ENERGY_CHART_CATEGORIES=Object.fromEntries(
 Object.entries(CATEGORY_COLORS).map(([key,color])=>[key,`var(--energy-category-${key}, ${color})`]),
) as Record<keyof typeof CATEGORY_COLORS,string>;
export const ENERGY_WIDGET_STYLE={
 ...Object.fromEntries(Object.entries(ENERGY_WIDGET_COLORS).map(([key,color])=>[`--energy-widget-${key}`,color])),
 ...Object.fromEntries(Object.entries(ENERGY_WIDGET_CATEGORIES).map(([key,color])=>[`--energy-category-${key}`,color])),
 '--color-energy-cat-renewable':ENERGY_WIDGET_CATEGORIES.renewable,
 '--color-energy-nuclear':ENERGY_WIDGET_CATEGORIES.nuclear,
} as CSSProperties;
