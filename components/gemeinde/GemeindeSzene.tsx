"use client";

import { useEffect } from "react";

/**
 * Starts the shared hero scene (public/hero-system) on the server-rendered
 * markup and gives it this town's weather.
 *
 * The scene reads `window.atlasWeather.load()`; here that is the same
 * snapshot-backed source the homepage scene uses (/scene-data: DWD ICON-D2),
 * never the free forecast API the prototype called. One request per page,
 * shared by everything that asks within five minutes.
 */
declare global {
  interface Window {
    atlasWeather?: { load(): Promise<unknown>; refresh(): Promise<unknown> };
  }
}

export default function GemeindeSzene({ plz }: { plz: string | null }) {
  useEffect(() => {
    let pending: Promise<unknown> | null = null;
    let started = 0;
    window.atlasWeather = {
      load() {
        if (!plz) return Promise.reject(new Error("Kein Standort"));
        if (Date.now() - started > 300_000) pending = null;
        if (!pending) {
          started = Date.now();
          pending = fetch(`/scene-data?plz=${plz}`, { signal: AbortSignal.timeout(15_000) })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Wetter nicht verfügbar"))))
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
    return () => script.remove();
  }, [plz]);
  return null;
}
