// Server-only read/write for the admin theming overlay (see lib/theme-overrides.ts).
//
// The read is wrapped in unstable_cache so the site layout can inject the
// overrides on every request without hitting the DB every time: one read per
// cache window, refreshed instantly on save via revalidateTag. Overrides change
// rarely (an admin nudging a shade), so this keeps the live DB untouched under
// normal traffic.

import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { supabase } from "./supabase-server";
import { sanitizeOverrides, type ThemeOverrides } from "./theme-overrides";

const CACHE_TAG = "theme-overrides";
const TABLE = "theme_overrides";

async function readOverrides(): Promise<ThemeOverrides> {
  if (!supabase) return {};
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("overrides")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return {};
    return sanitizeOverrides(data.overrides);
  } catch {
    return {};
  }
}

/**
 * Cached theming overrides for injection in the site layout. Safe fallback: {}
 * (no overrides) whenever the DB is unreachable or the table is missing, so a
 * theming hiccup never blocks page render.
 */
export const getSavedThemeOverrides = unstable_cache(readOverrides, ["theme-overrides"], {
  tags: [CACHE_TAG],
  revalidate: 300, // safety net; save() also revalidates immediately
});

/** Upsert the single overrides row (admin-guarded caller) and refresh the cache. */
export async function saveThemeOverrides(
  overrides: ThemeOverrides,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Database not configured" };
  const clean = sanitizeOverrides(overrides);
  const { error } = await supabase
    .from(TABLE)
    .upsert({ id: 1, overrides: clean, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) return { ok: false, error: error.message };
  revalidateTag(CACHE_TAG);
  return { ok: true };
}
