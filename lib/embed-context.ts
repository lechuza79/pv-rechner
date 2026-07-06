// Detects whether the current page is rendered inside an embed widget (an
// <iframe src="/embed/..."> on a third-party site). Widgets must not write to
// the visitor's browser storage there (§ 25 TDDDG) — the site that embeds the
// widget is the one responsible for cookie/storage consent, and solar-check.io
// has no relationship with that visitor to justify writing to their device.
//
// Detection is path-based (not a build-time flag) because the same client
// bundles/hooks are shared between the full site pages and the embed routes.
export function isEmbedContext(): boolean {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/embed");
}

// ─── Embed-safe cache storage ────────────────────────────────────────────────
// Storage-shaped in-memory fallback used inside embed widgets: same
// getItem/setItem contract as Web Storage, so cache hooks can treat both
// backends identically. Capped so a long-lived embed tab (visitor cycling
// through ranges/years) can't grow the map without bound.

type CacheStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const MEMORY_MAX_ENTRIES = 50;

function createMemoryStorage(): CacheStorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      if (!map.has(key) && map.size >= MEMORY_MAX_ENTRIES) {
        const oldest = map.keys().next().value;
        if (oldest !== undefined) map.delete(oldest);
      }
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

// One shared instance per kind, mirroring the localStorage/sessionStorage split
// (both live for the tab's lifetime here — "local" just marks long-lived data).
const memoryStores = { local: createMemoryStorage(), session: createMemoryStorage() };

/**
 * The storage a cache hook should use: real Web Storage on the site, the
 * in-memory fallback inside embed widgets, null during SSR. All cache
 * reads/writes in client hooks go through this — new hooks must too, so the
 * "no browser storage on third-party pages" guarantee holds by default.
 */
export function cacheStorage(kind: "local" | "session"): CacheStorageLike | null {
  if (typeof window === "undefined") return null;
  if (isEmbedContext()) return memoryStores[kind];
  return kind === "local" ? window.localStorage : window.sessionStorage;
}
