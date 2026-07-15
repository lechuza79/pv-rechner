"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { v } from "../lib/theme";
import { resolveTheme, cycleFrom, type ThemePref, type ThemeMode } from "../lib/theme-schedule";

// Header control for the colour scheme. One click from "Auto" always flips to
// the opposite of what is on screen; the full cycle is auto → opposite → other
// → auto. Each switch shows a short tooltip explaining the new mode.
//
// "Auto" tracks the time of day (see lib/theme-schedule.ts): bright by day,
// warm-dimmed at dusk/dawn, dark at night. Dusk is a stage of that cycle, not a
// pickable preference. A compact boot script in app/(site)/layout.tsx has
// already applied the correct theme before first paint (no flash); this
// component owns the runtime: the switch, periodic re-evaluation in auto mode,
// and the smooth cross-fade on change.
//
// Persistence uses localStorage directly — this control only ever renders in the
// (site) layout, never in the storage-free embed context.

const STORAGE_KEY = "sc-theme-pref";
const HINT_MS = 3200;

const LABEL: Record<ThemePref, string> = {
  auto: "Automatisch",
  light: "Hell",
  dark: "Dunkel",
};

// Full sentences — this is visible UI copy, not a label.
const HINT: Record<ThemePref, string> = {
  auto: "Das Farbschema folgt jetzt wieder der Tageszeit: tagsüber hell, zur Dämmerung gedimmt, nachts dunkel.",
  light: "Das Farbschema bleibt jetzt immer hell, unabhängig von der Tageszeit.",
  dark: "Das Farbschema bleibt jetzt immer dunkel, unabhängig von der Tageszeit.",
};

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
  const [hint, setHint] = useState<ThemePref | null>(null);
  const prefRef = useRef<ThemePref>("auto");
  // Which manual mode the last click out of auto landed on — keeps the cycle
  // symmetric so both manual modes stay reachable.
  const firstManualRef = useRef<ThemePref | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Adopt the preference the boot script already resolved, then keep it applied.
  useEffect(() => {
    const initial = readPref();
    prefRef.current = initial;
    if (initial !== "auto") firstManualRef.current = initial;
    setPref(initial);
    setResolved(apply(initial, false));
    setMounted(true);
  }, []);

  useEffect(() => () => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
  }, []);

  // In auto mode, re-evaluate every minute so the dusk/night crossover lands
  // without a reload. No tooltip here — the user did not do anything.
  useEffect(() => {
    if (pref !== "auto") return;
    const id = window.setInterval(() => {
      if (prefRef.current !== "auto") return;
      setResolved(apply("auto", true));
    }, 60_000);
    return () => window.clearInterval(id);
  }, [pref]);

  const cycle = useCallback(() => {
    const current = prefRef.current;
    const next = cycleFrom(current, resolveTheme(current, new Date()), firstManualRef.current);
    if (current === "auto") firstManualRef.current = next;
    if (next === "auto") firstManualRef.current = null;
    prefRef.current = next;
    setPref(next);
    setResolved(apply(next, true));
    setHint(next);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(null), HINT_MS);
  }, []);

  // SSR renders a stable placeholder; the icon syncs on mount (theme is already
  // correct via the boot script, only this small control catches up).
  const icon = !mounted ? "auto" : pref;
  const modeNow =
    pref !== "auto" ? "" :
    ` (aktuell ${resolved === "dark" ? "dunkel" : resolved === "dusk" ? "Dämmerung" : "hell"})`;

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        onClick={cycle}
        aria-label={`Farbschema: ${LABEL[pref]}${modeNow}. Klicken zum Wechseln.`}
        title={`Farbschema: ${LABEL[pref]}${modeNow}`}
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

      {hint && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 200,
            width: 232,
            background: v("--color-bg"),
            border: `1px solid ${v("--color-border")}`,
            borderRadius: v("--radius-md"),
            boxShadow: v("--shadow-md"),
            padding: "9px 11px",
            fontFamily: v("--font-text"),
            fontSize: 12.5,
            lineHeight: 1.5,
            color: v("--color-text-secondary"),
            animation: "fu .3s ease-out",
            pointerEvents: "none",
          }}
        >
          <span style={{ fontWeight: 700, color: v("--color-text-primary") }}>{LABEL[hint]}</span>
          {" — "}
          {HINT[hint]}
        </div>
      )}
    </div>
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
