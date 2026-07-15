"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { resolveTheme, type ThemePref, type ThemeMode } from "../lib/theme-schedule";
import { useCachedFetch } from "../lib/use-cached-fetch";
import { useLocation } from "../lib/location";
import SunControl from "./SunControl";
import type { SolarNowResponse } from "../lib/solar-now";

// Owns how bright the page is. The sun decides by default: "auto" tracks how
// much of the sky's potential is actually arriving right now — nation-wide, or
// at the visitor's location once they set one.
//
// A compact boot script in app/(site)/layout.tsx has already applied a theme
// before first paint (from the sun's position alone — no network needed, so no
// flash). This component owns the runtime: the live reading, the manual choice,
// and the cross-fade between them.
//
// Persistence uses localStorage directly — this control only ever renders in the
// (site) layout, never in the storage-free embed context.

const STORAGE_KEY = "sc-theme-pref";

function readPref(): ThemePref {
  if (typeof document === "undefined") return "auto";
  const fromAttr = document.documentElement.getAttribute("data-theme-pref");
  // Anything else (including a stale "dusk" from an earlier build) heals to auto.
  return fromAttr === "light" || fromAttr === "dark" ? fromAttr : "auto";
}

// Keep the mobile browser-chrome colour in step with the surface background.
const THEME_COLOR: Record<ThemeMode, string> = {
  light: "#FFFFFF",
  dusk: "#26202B",
  dark: "#12161C",
};

function apply(pref: ThemePref, animate: boolean, util: number | null): ThemeMode {
  const resolved = resolveTheme(pref, new Date(), util);
  const el = document.documentElement;
  const changed = el.getAttribute("data-theme") !== resolved;
  if (animate && changed) {
    el.classList.add("theme-anim");
    window.setTimeout(() => el.classList.remove("theme-anim"), 560);
  }
  el.setAttribute("data-theme", resolved);
  el.setAttribute("data-theme-pref", pref);
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    // Private mode / storage disabled — theme still applies for this session.
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLOR[resolved]);
  return resolved;
}

export default function ThemeController({ compact }: { compact?: boolean } = {}) {
  const { plz, setPlz } = useLocation();
  const { data: solar } = useCachedFetch<SolarNowResponse | null>(
    `/api/solar-now${plz ? `?plz=${plz}` : ""}`,
    `solar-now-${plz ?? "de"}`,
    null,
  );
  const util = solar?.utilisation ?? null;
  const utilRef = useRef<number | null>(null);
  utilRef.current = util;

  const [pref, setPref] = useState<ThemePref>("auto");
  const [mounted, setMounted] = useState(false);
  const prefRef = useRef<ThemePref>("auto");

  // Adopt the preference the boot script already resolved, then keep it applied.
  useEffect(() => {
    const initial = readPref();
    prefRef.current = initial;
    setPref(initial);
    apply(initial, false, utilRef.current);
    setMounted(true);
  }, []);

  // Re-apply when a fresh reading arrives (or the location changes): the boot
  // script painted from the sun's position, this corrects it — the cross-fade
  // makes the adjustment read as intentional rather than a flash.
  useEffect(() => {
    if (!mounted) return;
    apply(prefRef.current, true, util);
  }, [util, mounted]);

  // In auto mode, re-evaluate every minute so the dusk/night crossover lands
  // without a reload.
  useEffect(() => {
    if (pref !== "auto") return;
    const id = window.setInterval(() => {
      if (prefRef.current !== "auto") return;
      apply("auto", true, utilRef.current);
    }, 60_000);
    return () => window.clearInterval(id);
  }, [pref]);

  const choose = useCallback((next: ThemePref) => {
    prefRef.current = next;
    setPref(next);
    apply(next, true, utilRef.current);
  }, []);

  return (
    <SunControl
      data={solar}
      plz={plz}
      onSetPlz={setPlz}
      // Before mount the boot script owns the theme; render the neutral default
      // so server and client agree, then sync.
      pref={mounted ? pref : "auto"}
      onSetPref={choose}
      compact={compact}
    />
  );
}
