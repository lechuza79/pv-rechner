"use client";

import { useEffect, useRef } from "react";
import { parseWidgetThemeQuery, WIDGET_THEME_PARAMS } from "./widget-theme";
import {
  WidgetSettings,
  parseWidgetSettingsObject,
  parseWidgetSettingsQuery,
} from "./widget-settings";

// Every CSS var an embed widget may have themed: the colour/radius tokens plus
// the resolved font family.
const ALLOWED = new Set<string>([...Object.values(WIDGET_THEME_PARAMS), "--widget-font-family"]);

/**
 * Single source for embed-widget theming AND functional settings. Both travel
 * two ways:
 *  - URL query params on load (the static copy-paste embed code path)
 *  - postMessage from the parent frame (the demo's live preview, same-origin)
 *
 * THEME (--widget-* vars) is applied to the document root directly. SETTINGS
 * (share / range / switcher / embed) are reported back via `onSettings` so the
 * widget can drive its own state. Every widget — strommix, erzeugung, karte,
 * simulation — uses this one hook, so the parsing/validation/origin rules can
 * never drift between widgets again.
 *
 * Only same-origin postMessage is honoured: external embedders theme via URL
 * params, so they never need the postMessage channel, and keeping it same-origin
 * avoids trusting arbitrary parent frames.
 */
export function useWidgetTheme(opts?: {
  onSettings?: (settings: Partial<WidgetSettings>) => void;
}) {
  // Hold the latest callback in a ref so the effect subscribes exactly once and
  // callers don't need to memoise the function.
  const onSettingsRef = useRef(opts?.onSettings);
  onSettingsRef.current = opts?.onSettings;

  useEffect(() => {
    const root = document.documentElement;
    const setVars = (vars: Record<string, unknown>) => {
      Object.keys(vars).forEach((k) => {
        const val = vars[k];
        if (ALLOWED.has(k) && typeof val === "string") root.style.setProperty(k, val);
      });
    };

    // Static theme + settings from the iframe URL.
    setVars(parseWidgetThemeQuery(window.location.search));
    onSettingsRef.current?.(parseWidgetSettingsQuery(window.location.search));

    // Live updates from the parent frame — same-origin only (the demo).
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const payload = event.data as
        | { type?: unknown; vars?: unknown; settings?: unknown }
        | undefined;
      if (!payload) return;

      if (payload.type === "widget:settings") {
        onSettingsRef.current?.(parseWidgetSettingsObject(payload.settings));
        return;
      }

      if (payload.type !== "widget:theme") return;
      const vars =
        payload.vars && typeof payload.vars === "object"
          ? (payload.vars as Record<string, unknown>)
          : {};
      if (Object.keys(vars).length === 0) {
        ALLOWED.forEach((k) => root.style.removeProperty(k));
        return;
      }
      setVars(vars);
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
}
