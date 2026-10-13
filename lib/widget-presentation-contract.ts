import type {WidgetGridSize} from './widget-composition';
export type WidgetFamily = 'race' | 'ranked-bars' | 'cartesian' | 'radial' | 'composition' | 'metric' | 'map' | 'microchart' | 'indicator' | 'scene' | 'story';
/** A variant owns content and geometry; a host owns placement. */
export type WidgetVariantContract = {
  family?: WidgetFamily;
  /** Why this presentation grows with content instead of filling a rectangle. */
  contentSizing?: string;
  label: string;
  /** Supported dashboard slots; absent for independent hero/story teasers. */
  gridSizes?: readonly WidgetGridSize[];
  params: Readonly<Record<string, string>>;
  /** Some representations apply only to an individual visual, not its reader. */
  when?: {key:string;values:readonly string[]};
  minWidth: number;
  preferredWidth: number;
  maxWidth: number;
  height: 'content';
  /** Opt-in renderer support for a host-assigned rectangle. */
  supportsAllocation?: boolean;
  minAllocatedHeight?: number;
  /** Additional room when title and playback text wrap in narrow allocated cards. */
  allocatedHeightBreakpoints?: readonly {maxWidth: number; minHeight: number}[];
  plot: 'fixed-responsive' | 'intrinsic' | 'proportional';
  includes: readonly string[];
  omits: readonly string[];
};

/** Shared family defaults. Identity, data and meaningful variants stay in the registry. */
export function widgetVariant(family: WidgetFamily, options: Partial<WidgetVariantContract> = {}): WidgetVariantContract {
  const compact = family === 'microchart' || family === 'indicator';
  return {
    family, label: 'Vollständig', params: {}, minWidth: compact ? 240 : 320,
    preferredWidth: compact ? 320 : 480, maxWidth: compact ? 560 : 960,
    height: 'content', plot: family === 'radial' ? 'proportional' : 'intrinsic',
    includes: ['Complete existing content and controls'], omits: [],
    ...options,
  };
}
export type WidgetPresentationContract = {
  full: WidgetVariantContract;
  compact?: WidgetVariantContract;
  hero?: WidgetVariantContract;
};
