"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __GEMEINDE__?: unknown;
  }
}

/**
 * Hands the town's data to the design's interactive scripts and loads them
 * in order (icons first — the others read its global). The scripts build the
 * ranking and the share dialogs on the server-rendered sections; their text
 * content for crawlers is already in the HTML.
 */
const SKRIPTE = ["/gemeinde/icons.js", "/gemeinde/rangliste.js", "/gemeinde/teilen.js"];

// Classic scripts with top-level globals: loading them twice (React's
// development double effect, or a remount) would redeclare those globals.
// Once per document, like the prototype.
let gestartet = false;

export default function GemeindeSkripte({ daten }: { daten: unknown }) {
  useEffect(() => {
    if (gestartet) return;
    gestartet = true;
    window.__GEMEINDE__ = daten;
    (async () => {
      for (const src of SKRIPTE) {
        await new Promise<void>((fertig) => {
          const s = document.createElement("script");
          s.src = src;
          s.onload = s.onerror = () => fertig();
          document.body.append(s);
        });
      }
    })();
  }, [daten]);
  return null;
}
