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
    const { data, error } = await supabase.from("funding_programs").select("data");
    if (error || !data || data.length === 0) return seed;
    const programs = data.map((r) => r.data as FundingProgram);
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
