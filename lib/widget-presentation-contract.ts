import type {WidgetGridSize} from './widget-composition';
/** A variant owns content and geometry; a host owns placement. */
export type WidgetVariantContract = {
  label: string;
  /** Supported dashboard slots; absent for independent hero/story teasers. */
  gridSizes?: readonly WidgetGridSize[];
  params: Readonly<Record<string, string>>;
  minWidth: number;
  preferredWidth: number;
  maxWidth: number;
  height: 'content';
  /** Opt-in renderer support for a host-assigned rectangle. */
  supportsAllocation?: boolean;
  minAllocatedHeight?: number;
  plot: 'fixed-responsive' | 'intrinsic' | 'proportional';
  includes: readonly string[];
  omits: readonly string[];
};
export type WidgetPresentationContract = {
  full: WidgetVariantContract;
  compact?: WidgetVariantContract;
  hero?: WidgetVariantContract;
};
