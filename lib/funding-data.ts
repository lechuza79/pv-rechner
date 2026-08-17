import { supabase } from "./supabase-server";
import { FUNDING_PROGRAMS, type FundingProgram } from "./funding-programs";

// Server-side read of the funding dataset. Source of truth is Supabase
// (admin UI + quarterly verification routine write there); the code dataset
// in funding-programs.ts is the typed seed/fallback when the DB is empty or
// unreachable — same pattern as market prices (DEFAULT_PRICES).

let cache: { data: FundingProgram[]; ts: number } | null = null;
const TTL = 10 * 60 * 1000; // 10 min in-memory cache (warm function reuse)

export async function getFundingPrograms(): Promise<FundingProgram[]> {
  if (cache && Date.now() - cache.ts < TTL) return cache.data;

  const seed = Object.values(FUNDING_PROGRAMS);
  if (!supabase) return seed;

  try {
    // Pull the provenance column alongside the program json so pages can show
    // "Zuletzt geprüft" and the sitemap can emit a real <lastmod>.
    //
    // NUR `last_verified` — NIEMALS `updated_at` als Ersatz (korrigiert
    // 16.08.2026). `updated_at` ist der Zeitpunkt der letzten Schreibung, also
    // z. B. eines Resyncs, bei dem niemand irgendetwas geprüft hat. Über diesen
    // Fallback trugen 25 der 38 Programme ein "Zuletzt geprüft"-Datum, das eine
    // Prüfung behauptete, die nie stattgefunden hat — und das mit jedem Resync
    // frischer wurde (nur 13 hatten ein echtes Prüfdatum). Dieselbe Fehlerklasse wie am 28.07.2026, als ein Lauf allen
    // 36 Programmen das Datum des Tages aufstempelte (siehe Kopf von
    // scripts/set-funding-verified.mjs), nur auf dem stillen Weg.
    //
    // Ohne echtes Prüfdatum fällt fundingStandLabel auf den redaktionellen
    // `stand` zurück ("Stand: Juni 2026") — eine ehrliche, schwächere Aussage.
    const { data, error } = await supabase
      .from("funding_programs")
      .select("data, last_verified");
    if (error || !data || data.length === 0) return seed;
    const programs = data.map((r) => {
      const lastVerified = r.last_verified as string | null;
      return { ...(r.data as FundingProgram), ...(lastVerified ? { lastVerified } : {}) };
    });
    cache = { data: programs, ts: Date.now() };
    return programs;
  } catch {
    return seed;
  }
}

export async function getFundingProgramById(id: string): Promise<FundingProgram | undefined> {
  return (await getFundingPrograms()).find((p) => p.id === id);
}

export function invalidateFundingCache(): void {
  cache = null;
}
