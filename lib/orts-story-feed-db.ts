import "server-only";
import { supabase } from "./supabase-server";
import type { StoryEdition } from "./orts-story-feed";

export const STORY_FEED_DDL = `
CREATE TABLE IF NOT EXISTS municipality_story_editions (
  region_id text NOT NULL,
  id text NOT NULL,
  source_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL,
  PRIMARY KEY(region_id, id)
);
CREATE TABLE IF NOT EXISTS municipality_story_publications (
  region_id text NOT NULL,
  edition_id text NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(region_id, edition_id),
  FOREIGN KEY(region_id, edition_id) REFERENCES municipality_story_editions(region_id, id)
);
CREATE TABLE IF NOT EXISTS municipality_rank_observations (
  group_key text NOT NULL,
  source_date date NOT NULL,
  rules_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL,
  PRIMARY KEY(group_key, source_date, rules_version)
);
ALTER TABLE municipality_story_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipality_story_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipality_rank_observations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON municipality_story_editions, municipality_story_publications, municipality_rank_observations FROM anon, authenticated, PUBLIC;
CREATE OR REPLACE FUNCTION municipality_reject_rewrite() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Historical editions cannot be overwritten or deleted'; END;
$$;
DROP TRIGGER IF EXISTS immutable_story_edition ON municipality_story_editions;
CREATE TRIGGER immutable_story_edition BEFORE UPDATE OR DELETE ON municipality_story_editions
FOR EACH ROW EXECUTE FUNCTION municipality_reject_rewrite();
DROP TRIGGER IF EXISTS immutable_rank_observation ON municipality_rank_observations;
CREATE TRIGGER immutable_rank_observation BEFORE UPDATE OR DELETE ON municipality_rank_observations
FOR EACH ROW EXECUTE FUNCTION municipality_reject_rewrite();
CREATE INDEX IF NOT EXISTS municipality_story_publication_order ON municipality_story_publications(region_id, published_at DESC);
`;

export async function saveStoryEdition(edition: StoryEdition): Promise<void> {
  if (!supabase) throw new Error("Datenbank nicht konfiguriert");
  const { error } = await supabase.from("municipality_story_editions").upsert({
    region_id: edition.regionId, id: edition.id, source_date: edition.sourceDate,
    created_at: edition.createdAt, payload: edition,
  }, { onConflict: "region_id,id", ignoreDuplicates: true });
  if (error) throw new Error(`Story nicht gespeichert: ${error.message}`);
}

export async function readStoryFeed(regionId: string): Promise<StoryEdition[]> {
  if (!supabase) throw new Error("Datenbank nicht konfiguriert");
  const result: StoryEdition[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase.from("municipality_story_publications")
      .select("municipality_story_editions(payload)")
      .eq("region_id", regionId).order("published_at", { ascending: false })
      .order("edition_id").range(from, from + 499);
    if (error) throw new Error(`Story-Feed nicht lesbar: ${error.message}`);
    for (const row of data ?? []) {
      const joined = row.municipality_story_editions as unknown as { payload: StoryEdition };
      result.push(joined.payload);
    }
    if (!data || data.length < 500) return result;
  }
}

/** Only published editions enter the public feed. Draft generation stays separate. */
export async function publishedStoryContributions(regionId: string) {
  return (await readStoryFeed(regionId)).map(e => ({ ...e.beitrag, editionSourceDate: e.sourceDate }));
}

export async function withPublishedStories(regionId: string, drafts: import("./orts-posts").OrtsBeitrag[]) {
  // Rollout switch: never query unavailable tables before the storage migration.
  if (process.env.MUNICIPALITY_STORY_FEED !== "1") return drafts;
  return publishedStoryContributions(regionId);
}
