import { createHash } from "node:crypto";
import type { OrtsBeitrag } from "./orts-posts";

export type StoryEdition = {
  id: string;
  regionId: string;
  sourceDate: string;
  createdAt: string;
  beitrag: OrtsBeitrag;
};

/** Immutable content identity; clocks must not create duplicate editions. */
export function storyEdition(regionId: string, sourceDate: string, beitrag: OrtsBeitrag, createdAt: string): StoryEdition {
  if (!/^\d{8}$/.test(regionId)) throw new Error("Ungültige Gemeinde");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sourceDate) || !Number.isFinite(Date.parse(sourceDate))) throw new Error("Datenstand fehlt");
  if (!beitrag.post.id.startsWith(`ort-${regionId}-`)) throw new Error("Beitrag gehört zu einer anderen Gemeinde");
  const copy = JSON.parse(JSON.stringify(beitrag)) as OrtsBeitrag;
  const hash = createHash("sha256").update(JSON.stringify({ regionId, sourceDate, beitrag: copy })).digest("hex");
  const id = `${beitrag.storyKennung}-${sourceDate}-${hash.slice(0, 16)}`;
  copy.storyKennung = id;
  return { id, regionId, sourceDate, createdAt, beitrag: copy };
}

export type RankObservation = {
  sourceDate: string;
  rules: string;
  group: string;
  members: string[];
  ranks: { regionId: string; rank: number; value: number }[];
};

/** A change of peer group or rules must not masquerade as a rank movement. */
export function rankMovement(before: RankObservation, after: RankObservation, regionId: string): number | null {
  if (before.sourceDate >= after.sourceDate || before.rules !== after.rules || before.group !== after.group) return null;
  if ([...before.members].sort().join("|") !== [...after.members].sort().join("|")) return null;
  const old = before.ranks.find(r => r.regionId === regionId);
  const current = after.ranks.find(r => r.regionId === regionId);
  return old && current ? old.rank - current.rank : null;
}
