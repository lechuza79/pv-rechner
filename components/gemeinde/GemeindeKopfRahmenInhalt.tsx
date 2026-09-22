"use client";

import { useEffect, useState } from "react";
import { GemeindeKopfMonitor } from "./GemeindeMonitor";
import type { GemeindePaket } from "../../lib/gemeinde-paket";

/**
 * The hero card's frame content (port of the prototype's HeroWidgetPreview):
 * the page picks the reading by message, a click opens the full monitor.
 */
const WIDGETS = ["feed-in-value", "live", "radial"];

export default function GemeindeKopfRahmenInhalt({ paket }: { paket: GemeindePaket }) {
  const [widget, setWidget] = useState(() => {
    const start = new URLSearchParams(location.search).get("widget") ?? "";
    return WIDGETS.includes(start) ? start : WIDGETS[0];
  });
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin === location.origin && event.source === parent && event.data?.type === "atlas-hero-widget" && WIDGETS.includes(event.data.widget))
        setWidget(event.data.widget);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  useEffect(() => {
    let active = true;
    Promise.all([document.fonts.ready, ...Array.from(document.images).map((image) => image.decode().catch(() => {}))]).then(() => {
      if (active) parent.postMessage({ type: "atlas-hero-ready" }, location.origin);
    });
    return () => {
      active = false;
    };
  }, [widget]);
  return (
    <a
      href="#atlas-data"
      target="_parent"
      onClick={(event) => {
        event.preventDefault();
        parent.postMessage({ type: "atlas-hero-open-monitor" }, location.origin);
      }}
      aria-label="Zum Energiemonitor"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="hero-monitor-link"
    >
      <GemeindeKopfMonitor paket={paket} widget={widget} paused={paused} />
    </a>
  );
}
