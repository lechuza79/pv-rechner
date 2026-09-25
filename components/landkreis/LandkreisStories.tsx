import { unstable_cache } from "next/cache";
import { ladeGemeindePaket } from "../../lib/gemeinde-paket-server";
import { paketFuer } from "../gemeinde/paket-teile";
import MunicipalStoryPreview from "../gemeinde/GemeindeInsights";
import type { StoryConcept } from "../../lib/story-konzepte";
import { ATLAS_DATEN_TAG } from "../../lib/atlas-revalidate-routen";

const loadStories = unstable_cache(async (ids: string[]) => {
  const rows: StoryConcept[][] = new Array(ids.length);
  let cursor = 0;
  await Promise.all(Array.from({length:4}, async () => {
    while(cursor < ids.length){
      const index=cursor++;
      const packet=await ladeGemeindePaket(ids[index]);
      rows[index]=packet ? paketFuer("geschichten",packet).stories as StoryConcept[] : [];
    }
  }));
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
}, ["district-story-preview-v4"], {revalidate:86400,tags:[ATLAS_DATEN_TAG]});

export default async function LandkreisStories({ids,name}:{ids:string[];name:string}) {
  try {
    const stories=await loadStories(ids);
    if(!stories.length)return <p>Für die Gemeinden liegen derzeit keine Geschichten vor.</p>;
    return <MunicipalStoryPreview stories={stories} name={name} showTown showDate={false} showHeader={false} surfaceScheme="dark"/>;
  } catch {
    return <p>Die Geschichten lassen sich gerade nicht laden.</p>;
  }
}
