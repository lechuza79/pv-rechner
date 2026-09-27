import "server-only";
import { withDbTimeout } from "./db-timeout";
import { supabase } from "./supabase-server";
import { getRegionById } from "./atlas";
import { storyVergleich, type OrtsStory } from "./orts-stories";
import { AWARD_CATEGORY_BY_KEY, formatAwardValue } from "./awards";
import { rankStory } from "./orts-rang-stories";
import { GROESSENKLASSE_BY_SLUG } from "./gemeindegroesse";
import type { RankObservation } from "./orts-story-feed";

type Manifest = { source_date: string; rules_version: string; payload: { complete: boolean; groups: string[] } };
type StoredRank = { regionId: string; rank: number; value: number; total: number; spike: boolean; duenn: boolean };

export async function retainedRankStories(regionId: string, name: string, sourceDate: string): Promise<OrtsStory[]> {
  if (!supabase) throw new Error("Datenbank nicht konfiguriert");
  const { data, error } = await withDbTimeout(supabase.from("municipality_rank_observations")
    .select("source_date,rules_version,payload->complete,payload->groups")
    .eq("group_key", "all").eq("payload->>complete", "true")
    .order("source_date", { ascending: false }).limit(2), "rang-stories/staende");
  if (error) throw new Error(`Rangstände nicht lesbar: ${error.message}`);
  if (!data || data.length < 2) return [];
  const rows = data as unknown as (Omit<Manifest, "payload"> & Manifest["payload"])[];
  const [after, before] = rows;
  if (after.source_date !== sourceDate.slice(0, 10)) return [];
  if (after.rules_version !== before.rules_version) return [];
  const keys = after.groups.filter(key => {
    const [, level, scope] = key.split("|");
    return level === "kreis" && regionId.startsWith(scope) && before.groups.includes(key);
  });
  const stories: OrtsStory[] = [];
  for (const key of keys) {
    const { data: groups, error: groupError } = await withDbTimeout(supabase.from("municipality_rank_observations")
      .select("source_date,payload").eq("group_key", key).eq("rules_version", after.rules_version)
      .in("source_date", [before.source_date, after.source_date]), "rang-stories/gruppe");
    if (groupError) throw new Error(groupError.message);
    const get = (date: string) => groups?.find(g => g.source_date === date)?.payload.ranks as StoredRank[] | undefined;
    const old = get(before.source_date), current = get(after.source_date);
    if (!old || !current) continue;
    const own = current.find(r => r.regionId === regionId), prior = old.find(r => r.regionId === regionId);
    if (!own || !prior || own.spike || own.duenn || prior.spike || prior.duenn || current.length < 10) continue;
    const [category, level, scope, klass] = key.split("|");
    const cat = AWARD_CATEGORY_BY_KEY[category];
    const size = GROESSENKLASSE_BY_SLUG[klass];
    if (!cat || !size) continue;
    const region = await getRegionById(scope);
    if (!region) continue;
    const area = `im ${region.name}`;
    const base = storyVergleich({ name }, {
      kategorie: category, ebene: level, klasseSlug: klass, klasseLabel: size.label,
      gruppe: `${size.label} ${area}`, gebiet: area, messgroesse: cat.themaDativ,
      rang: own.rank, ausN: own.total, wert: formatAwardValue(own.value, cat.format), rohwert: own.value, einheit: "",
    });
    const observation = (date: string, ranks: StoredRank[]): RankObservation => ({
      sourceDate: date, rules: after.rules_version, group: key, members: ranks.map(r => r.regionId), ranks,
    });
    const story = rankStory(base, name, regionId, observation(before.source_date, old), observation(after.source_date, current));
    if (story) stories.push(story);
  }
  return stories;
}
