/** Binds only to the supplied canvas; returns a complete listener teardown. */
export function bindTrackpadGestures(element: HTMLElement, options: {
  pan?: (deltaX: number, deltaY: number) => void;
  /** Multiplicative distance/scale factor: values below 1 zoom in. */
  zoom?: (factor: number) => void;
  /** pinch-only preserves normal page scrolling; mouse preserves native wheel controls. */
  mode?: () => 'trackpad' | 'mouse' | 'pinch-only';
  enabled?: () => boolean;
}): () => void;
