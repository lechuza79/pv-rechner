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
    // Pull the provenance columns alongside the program json so pages can show
    // "Zuletzt geprüft" and the sitemap can emit a real <lastmod>. last_verified
    // is set by the verification routine; updated_at is the resync fallback.
    const { data, error } = await supabase
      .from("funding_programs")
      .select("data, last_verified, updated_at");
    if (error || !data || data.length === 0) return seed;
    const programs = data.map((r) => {
      const lastVerified = (r.last_verified ?? r.updated_at) as string | null;
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
