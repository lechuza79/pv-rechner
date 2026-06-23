"use client";

import { useEffect } from "react";
import { parseWidgetThemeQuery, WIDGET_THEME_PARAMS } from "./widget-theme";

// Every CSS var an embed widget may have themed: the colour/radius tokens plus
// the resolved font family.
const ALLOWED = new Set<string>([...Object.values(WIDGET_THEME_PARAMS), "--widget-font-family"]);

/**
 * Applies widget theming to the document root from two sources:
 *  - URL query params on load (the static copy-paste embed code path)
 *  - postMessage from the parent frame (the demo's live preview, same-origin)
 *
 * Mirrors the inline logic in the strommix/erzeugung widgets, centralized so
 * newer widgets (map, live simulation) don't copy it again.
 */
export function useWidgetTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const setVars = (vars: Record<string, unknown>) => {
      Object.keys(vars).forEach((k) => {
        const val = vars[k];
        if (ALLOWED.has(k) && typeof val === "string") root.style.setProperty(k, val);
      });
    };

    // Static theme from the iframe URL.
    setVars(parseWidgetThemeQuery(window.location.search));

    // Live theme from the parent frame — only same-origin (the demo). External
    // embedders theme via URL params, so they don't need the postMessage channel.
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const payload = event.data as { type?: unknown; vars?: unknown } | undefined;
      if (!payload || payload.type !== "widget:theme") return;
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
