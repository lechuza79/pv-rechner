import type { StoryConcept } from "./story-konzepte";

/** Preserve the existing order, variety and one-story-per-town selection. */
export function selectDistrictStories(rows: StoryConcept[][]) {
  // Like the homepage strip, alternate visual families and spread towns.
  // This is presentation selection, not publication or editorial scheduling.
  const pool = rows.flat().filter(story => story.kind !== "rank");
  const selected: StoryConcept[] = [];
  const kinds = new Map<string, number>();
  const labels = new Map<string, number>();
  const towns = new Set<string>();
  while (selected.length < 12) {
    const recent = selected.slice(-2);
    const candidates = pool.filter(story => !towns.has(story.town));
    const score = (story: StoryConcept) =>
      (recent.some(s => s.kind === story.kind) ? 100 : 0) +
      (recent.some(s => s.label === story.label) ? 100 : 0) +
      (kinds.get(story.kind) ?? 0) * 4 + (labels.get(story.label) ?? 0) * 8;
    candidates.sort((a, b) => score(a) - score(b));
    const next = candidates[0];
    if (!next) break;
    selected.push(next); towns.add(next.town);
    kinds.set(next.kind, (kinds.get(next.kind) ?? 0) + 1);
    labels.set(next.label, (labels.get(next.label) ?? 0) + 1);
  }
  return selected;
}
