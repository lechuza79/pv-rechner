import { ANLAGEN } from "./constants";

// Preserve legacy preset links, but never round a recommendation to a preset.
// The custom marker is required by result, share, saved-calculation and OG readers.
export function pvCapacityParams(kwp: number): URLSearchParams {
  const preset = ANLAGEN.findIndex(anlage => anlage.kwp === kwp);
  return new URLSearchParams(preset >= 0
    ? { a: String(preset) }
    : { a: "4", ck: String(kwp) });
}
