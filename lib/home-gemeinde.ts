"use client";

import { useCallback, useEffect, useState } from "react";
import { cacheStorage } from "./embed-context";

/**
 * The user's home Gemeinde, remembered across the whole site.
 *
 * Entered once as a postcode — anywhere — and from then on it highlights the
 * user's own place in every ranking and serves as the reference for
 * calculations. Deliberately global rather than per-page: nobody wants to type
 * their postcode again on the next table.
 *
 * Stored via cacheStorage, never window.localStorage directly: under /embed/*
 * that falls back to an in-memory map, which is what keeps the widgets free of
 * browser storage (§ 25 TDDDG). See lib/embed-context.ts.
 */

const KEY = "solarcheck.home-gemeinde.v1";

export type HomeGemeinde = {
  region_id: string;
  name: string;
  path: string;
  kreisName: string;
  bundeslandName: string;
  plz: string;
};

/** Cross-component sync: storage events only fire in *other* tabs. */
const listeners = new Set<(v: HomeGemeinde | null) => void>();

function read(): HomeGemeinde | null {
  const store = cacheStorage("local");
  if (!store) return null;
  try {
    const raw = store.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomeGemeinde;
    return parsed?.region_id && parsed?.path ? parsed : null;
  } catch {
    return null;
  }
}

function write(value: HomeGemeinde | null): void {
  const store = cacheStorage("local");
  if (store) {
    try {
      if (value) store.setItem(KEY, JSON.stringify(value));
      else store.removeItem(KEY);
    } catch {
      // Quota or a locked-down browser — the site works without it.
    }
  }
  for (const fn of Array.from(listeners)) fn(value);
}

export function useHomeGemeinde(): {
  home: HomeGemeinde | null;
  setHome: (v: HomeGemeinde | null) => void;
  /** False until the first client render — storage is not readable on the server. */
  ready: boolean;
} {
  const [home, setState] = useState<HomeGemeinde | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(read());
    setReady(true);
    const fn = (v: HomeGemeinde | null) => setState(v);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const setHome = useCallback((v: HomeGemeinde | null) => {
    write(v);
  }, []);

  return { home, setHome, ready };
}

export type GemeindeHit = Omit<HomeGemeinde, "plz">;

export async function lookupPlz(plz: string): Promise<GemeindeHit[]> {
  const res = await fetch(`/api/atlas/gemeinde?plz=${encodeURIComponent(plz)}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Die Postleitzahl konnte nicht aufgelöst werden");
  }
  const data = (await res.json()) as { hits: GemeindeHit[] };
  return data.hits;
}
