"use client";

import { useEffect } from "react";

/**
 * Starts the shared hero scene (public/hero-system) on the server-rendered
 * markup and gives it this town's weather.
 *
 * The scene reads `window.atlasWeather.load()`; here that is the same
 * snapshot-backed source the homepage scene uses (/scene-data: DWD ICON-D2),
 * never the free forecast API the prototype called; the monitor's day curve
 * comes from the same snapshot (/api/gemeinde/solartag). One request per page,
 * shared by everything that asks within five minutes.
 */
declare global {
  interface Window {
    atlasWeather?: { load(): Promise<unknown>; refresh(): Promise<unknown> };
  }
}

// The scene mounts once per document; a second module run (React's
// development double effect) would build a second stage.
let gestartet = false;

export default function GemeindeSzene({ plz }: { plz: string | null }) {
  useEffect(() => {
    if (gestartet) return;
    gestartet = true;
    let pending: Promise<unknown> | null = null;
    let started = 0;
    window.atlasWeather = {
      load() {
        if (!plz) return Promise.reject(new Error("Kein Standort"));
        if (Date.now() - started > 300_000) pending = null;
        if (!pending) {
          started = Date.now();
          const json = (url: string) =>
            fetch(url, { signal: AbortSignal.timeout(15_000) }).then((r) =>
              r.ok ? r.json() : Promise.reject(new Error("Wetter nicht verfügbar")),
            );
          // The scene needs "now"; the monitor also needs today's curve
          // (`points`). A missing curve must not take the scene down.
          pending = Promise.all([json(`/scene-data?plz=${plz}`), json(`/api/gemeinde/solartag?plz=${plz}`).catch(() => null)])
            .then(([jetzt, tag]) => {
              // Without the curve, keep the answer for the scene but do not
              // hold it: the next caller asks again.
              if (!tag?.points) started = 0;
              return { ...jetzt, points: tag?.points };
            })
            .catch((e) => {
              pending = null;
              throw e;
            });
        }
        return pending;
      },
      refresh() {
        pending = null;
        return this.load();
      },
    };
    const script = document.createElement("script");
    script.type = "module";
    script.src = "/hero-system/dist/municipality.js";
    document.body.append(script);
  }, [plz]);
  return null;
}
