"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cacheStorage } from "./embed-context";

// The visitor's location (a German postcode), remembered once and used
// everywhere: the calculators, the live simulation, and the page's colour
// scheme. Entering it in one place lights up the others — there is deliberately
// no second, feature-specific postcode store.
//
// Storage goes through cacheStorage(), so embedded widgets keep their
// no-browser-storage promise (§ 25 TDDDG) and fall back to memory.
//
// This is a setting the visitor asked for, not tracking: it never leaves the
// device except as the postcode parameter of our own weather/yield lookups, and
// it must never be attached to analytics events. Mentioned in /datenschutz.

const KEY = "sc-plz";

export function isValidPlz(plz: string): boolean {
  return /^\d{5}$/.test(plz);
}

export function readLocation(): string | null {
  const store = cacheStorage("local");
  const value = store?.getItem(KEY) ?? null;
  return value && isValidPlz(value) ? value : null;
}

export function writeLocation(plz: string | null): void {
  const store = cacheStorage("local");
  if (!store) return;
  try {
    if (plz && isValidPlz(plz)) store.setItem(KEY, plz);
    else store.removeItem(KEY);
  } catch {
    // Storage full or blocked — the location just won't survive the session.
  }
  // Same-tab listeners (the storage event only fires in *other* tabs).
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LOCATION_EVENT, { detail: plz }));
  }
}

const LOCATION_EVENT = "sc:location";

/**
 * The remembered location, kept in step across every component that uses it
 * (and across tabs). Returns null until mounted, so server and client agree.
 */
export function useLocation(): {
  plz: string | null;
  setPlz: (plz: string | null) => void;
  ready: boolean;
} {
  const [plz, setPlzState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPlzState(readLocation());
    setReady(true);

    const onLocal = (e: Event) => {
      const next = (e as CustomEvent<string | null>).detail;
      setPlzState(next && isValidPlz(next) ? next : null);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY || e.key === null) setPlzState(readLocation());
    };
    window.addEventListener(LOCATION_EVENT, onLocal);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(LOCATION_EVENT, onLocal);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setPlz = useCallback((next: string | null) => {
    writeLocation(next);
    setPlzState(next && isValidPlz(next) ? next : null);
  }, []);

  return { plz, setPlz, ready };
}

export type LocationLinkChange = { previous: string; next: string; undo: () => void };
let linkChange: LocationLinkChange | null = null;
const linkChangeListeners = new Set<() => void>();
const subscribeLinkChange = (listener: () => void) => {
  linkChangeListeners.add(listener);
  return () => { linkChangeListeners.delete(listener); };
};
export function dismissLocationLinkChange(): void {
  linkChange = null;
  linkChangeListeners.forEach(listener => listener());
}
export function useLocationLinkChange(): LocationLinkChange | null {
  return useSyncExternalStore(subscribeLinkChange, () => linkChange, () => null);
}

/**
 * Join a screen's own postcode field to the shared location: adopt the
 * remembered one when the field starts empty, and remember whatever the visitor
 * types. Lets every calculator share one postcode without owning the storage.
 *
 * `onAdopt` applies a remembered postcode, initially or after Undo — not
 * while typing. Screens use it to fill the field *and* apply the location
 * (fetch the yield, etc.), so a remembered postcode behaves as if it had just
 * been entered. A postcode already on screen (e.g. from a shared link) wins.
 *
 * Adoption happens in an effect (not a state initialiser) so the server and the
 * first client render agree — storage is not readable during SSR.
 */
export function useSharedPlz(plz: string, onAdopt: (plz: string) => void): boolean {
  const [remembered, setRemembered] = useState<string | null>(null);
  const ownedChange = useRef<LocationLinkChange | null>(null);
  useEffect(() => () => { if (ownedChange.current && linkChange === ownedChange.current) dismissLocationLinkChange(); }, []);
  const adopted = useRef(false);
  const pendingChange = useRef<{ previous: string; next: string } | null>(null);
  const cb = useRef(onAdopt);
  cb.current = onAdopt;

  useEffect(() => {
    if (adopted.current) return;
    adopted.current = true;
    // URL state may be applied by another effect in this same render.
    // Reading the URL here prevents adopting storage before that state commits.
    const params = new URLSearchParams(window.location.search);
    const fromLink = params.get("plz");
    const stored = readLocation();
    if (fromLink && isValidPlz(fromLink) && stored && stored !== fromLink) {
      pendingChange.current = { previous: stored, next: fromLink };
    }
    if (plz || params.has("plz")) return;
    if (stored) { setRemembered(stored); cb.current(stored); }
  }, [plz]);

  useEffect(() => {
    if (isValidPlz(plz)) writeLocation(plz);
    const change = pendingChange.current;
    if (change && plz === change.next) {
      pendingChange.current = null;
      linkChange = { ...change, undo: () => {
        const url = new URL(window.location.href);
        url.searchParams.set("plz", change.previous);
        // Discard location-derived values belonging to the incoming link.
        for (const key of ["ags", "er", "ertrag"]) url.searchParams.delete(key);
        window.history.replaceState(window.history.state, "", url);
        dismissLocationLinkChange();
        writeLocation(change.previous);
        cb.current(change.previous);
      } };
      ownedChange.current = linkChange;
      linkChangeListeners.forEach(listener => listener());
    }
  }, [plz]);
  return remembered !== null && remembered === plz;
}
