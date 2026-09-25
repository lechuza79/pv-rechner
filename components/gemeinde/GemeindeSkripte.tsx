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
const SKRIPTE = [
  "/gemeinde/icons.js",
  "/gemeinde/landkreis-rennen.js",
  "/gemeinde/konfetti.js",
  "/gemeinde/rangliste.js",
  "/gemeinde/teilen.js",
  "/gemeinde/hilfe.js",
  "/gemeinde/ankernav.js",
];

// Classic scripts with top-level globals: loading them twice (React's
// development double effect, or a remount) would redeclare those globals.
// Once per document, like the prototype.
let gestartet = false;

export default function GemeindeSkripte({ daten, navigationOnly=false }: { daten: unknown; navigationOnly?:boolean }) {
  useEffect(() => {
    if (gestartet) return;
    gestartet = true;
    window.__GEMEINDE__ = daten;
    (async () => {
      for (const src of navigationOnly ? SKRIPTE.filter(src=>!src.endsWith("rangliste.js")&&!src.endsWith("hilfe.js")) : SKRIPTE) {
        if ((src.endsWith("landkreis-rennen.js") || src.endsWith("konfetti.js")) && !(daten as {districtOverview?:boolean})?.districtOverview) continue;
        await new Promise<void>((fertig) => {
          const s = document.createElement("script");
          s.src = src;
          s.onload = s.onerror = () => fertig();
          document.body.append(s);
        });
        if (src.endsWith("konfetti.js")) window.dispatchEvent(new Event("district-race-ready"));
      }
    })();
  }, [daten,navigationOnly]);
  return null;
}
