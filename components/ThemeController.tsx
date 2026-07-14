"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { v } from "../lib/theme";
import { resolveTheme, type ThemePref, type ThemeMode } from "../lib/theme-schedule";

// Header control that cycles the theme preference Auto → Hell → Dunkel and keeps
// the resolved theme (light/dusk/dark) applied to <html data-theme>.
//
// "Auto" tracks the time of day (see lib/theme-schedule.ts): bright by day,
// warm-dimmed at dusk/dawn, dark at night. A compact boot script in
// app/(site)/layout.tsx has already applied the correct theme before first
// paint (no flash); this component owns the runtime: the manual switch, periodic
// re-evaluation in auto mode, and the smooth cross-fade on change.
//
// Persistence uses localStorage directly — this control only ever renders in the
// (site) layout, never in the storage-free embed context.

const STORAGE_KEY = "sc-theme-pref";
const PREFS: ThemePref[] = ["auto", "light", "dusk", "dark"];

const LABEL: Record<ThemePref, string> = {
  auto: "Automatisch (Tageszeit)",
  light: "Hell",
  dusk: "Dämmerung",
  dark: "Dunkel",
};

function readPref(): ThemePref {
  if (typeof document === "undefined") return "auto";
  const fromAttr = document.documentElement.getAttribute("data-theme-pref");
  if (fromAttr === "light" || fromAttr === "dusk" || fromAttr === "dark" || fromAttr === "auto") {
    return fromAttr;
  }
  return "auto";
}

// Keep the mobile browser-chrome colour in step with the surface background.
const THEME_COLOR: Record<ThemeMode, string> = {
  light: "#FFFFFF",
  dusk: "#26202B",
  dark: "#12161C",
};

function apply(pref: ThemePref, animate: boolean): ThemeMode {
  const resolved = resolveTheme(pref, new Date());
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

export default function ThemeController() {
  const [pref, setPref] = useState<ThemePref>("auto");
  const [resolved, setResolved] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);
  const prefRef = useRef<ThemePref>("auto");

  // Adopt the preference the boot script already resolved, then keep it applied.
  useEffect(() => {
    const initial = readPref();
    prefRef.current = initial;
    setPref(initial);
    setResolved(apply(initial, false));
    setMounted(true);
  }, []);

  // In auto mode, re-evaluate every minute so the dusk/night crossover lands
  // without a reload.
  useEffect(() => {
    if (pref !== "auto") return;
    const id = window.setInterval(() => {
      if (prefRef.current !== "auto") return;
      setResolved(apply("auto", true));
    }, 60_000);
    return () => window.clearInterval(id);
  }, [pref]);

  const cycle = useCallback(() => {
    const next = PREFS[(PREFS.indexOf(prefRef.current) + 1) % PREFS.length];
    prefRef.current = next;
    setPref(next);
    setResolved(apply(next, true));
  }, []);

  // SSR renders a stable placeholder; the icon syncs on mount (theme is already
  // correct via the boot script, only this small control catches up).
  const icon = !mounted ? "auto" : pref;
  const nextLabel = LABEL[PREFS[(PREFS.indexOf(pref) + 1) % PREFS.length]];

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Farbschema: ${LABEL[pref]}. Klicken für ${nextLabel}.`}
      title={`Farbschema: ${LABEL[pref]}${pref === "auto" ? ` (aktuell ${resolved === "dark" ? "dunkel" : resolved === "dusk" ? "Dämmerung" : "hell"})` : ""}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        borderRadius: v("--radius-sm"),
        border: `1px solid ${v("--color-border")}`,
        background: v("--color-bg-muted"),
        color: v("--color-text-secondary"),
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
      }}
    >
      <ThemeIcon pref={icon} />
    </button>
  );
}

function ThemeIcon({ pref }: { pref: ThemePref }) {
  const c = "currentColor";
  if (pref === "light") {
    // Sun
    return (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
      </svg>
    );
  }
  if (pref === "dusk") {
    // Sunset — half sun over the horizon with rays.
    return (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 18a5 5 0 0 0-10 0" />
        <path d="M12 2v3M4.5 10.5 6 12M19.5 10.5 18 12M2 18h2M20 18h2M22 22H2" />
      </svg>
    );
  }
  if (pref === "dark") {
    // Moon
    return (
      <svg width={18} height={18} viewBox="0 0 24 24" fill={c} stroke="none">
        <path d="M20.5 14.2A8 8 0 0 1 9.8 3.5a.6.6 0 0 0-.8-.8 9.2 9.2 0 1 0 12.3 12.3.6.6 0 0 0-.8-.8Z" />
      </svg>
    );
  }
  // Auto — half sun / half moon in one disc.
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 3.8a8.2 8.2 0 0 0 0 16.4Z" fill={c} stroke="none" />
    </svg>
  );
}
