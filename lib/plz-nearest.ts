/**
 * The postcode whose centroid lies nearest to a coordinate.
 *
 * The weather snapshot is kept per postcode; callers that only know a point
 * (a municipality, a region) are answered from the nearest one. Postcode
 * centroids are a few kilometres apart, closer than any model cell we read.
 */
import plzCoords from "../public/plz.json";

const ENTRIES = Object.entries(plzCoords as unknown as Record<string, [number, number]>);

export function nearestPlz(latitude: number, longitude: number): string | null {
  const cos = Math.cos((latitude * Math.PI) / 180);
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const [plz, [lat, lon]] of ENTRIES) {
    const d = (lat - latitude) ** 2 + ((lon - longitude) * cos) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = plz;
    }
  }
  return best;
}
