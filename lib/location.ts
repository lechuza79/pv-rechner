"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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

/**
 * Join a screen's own postcode field to the shared location: adopt the
 * remembered one when the field starts empty, and remember whatever the visitor
 * types. Lets every calculator share one postcode without owning the storage.
 *
 * `onAdopt` fires once, only when a remembered postcode is taken over — not
 * while typing. Screens use it to fill the field *and* apply the location
 * (fetch the yield, etc.), so a remembered postcode behaves as if it had just
 * been entered. A postcode already on screen (e.g. from a shared link) wins.
 *
 * Adoption happens in an effect (not a state initialiser) so the server and the
 * first client render agree — storage is not readable during SSR.
 */
export function useSharedPlz(plz: string, onAdopt: (plz: string) => void): void {
  const adopted = useRef(false);
  const cb = useRef(onAdopt);
  cb.current = onAdopt;

  useEffect(() => {
    if (adopted.current) return;
    adopted.current = true;
    if (plz) return;
    const stored = readLocation();
    if (stored) cb.current(stored);
  }, [plz]);

  useEffect(() => {
    if (isValidPlz(plz)) writeLocation(plz);
  }, [plz]);
}
