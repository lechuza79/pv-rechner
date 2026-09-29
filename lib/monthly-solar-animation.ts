/** Shared day timing for playback and deterministic video frames. */
export const SOLAR_DAY_MS = 650;
export const SOLAR_DRAW_MS = 600;
export const solarEase = (progress: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, progress)), 3);

export function solarAnimationFrame(values: number[], timeMs: number) {
  const time = Math.max(0, timeMs);
  const index = Math.min(values.length - 1, Math.floor(time / SOLAR_DAY_MS));
  const progress = solarEase((time - index * SOLAR_DAY_MS) / SOLAR_DRAW_MS);
  const previous = values[Math.max(0, index - 1)] ?? 0;
  return {index, progress, value: previous + ((values[index] ?? 0) - previous) * progress};
}
