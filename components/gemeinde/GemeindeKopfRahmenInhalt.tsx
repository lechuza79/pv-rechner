"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GemeindeKopfMonitor } from "./GemeindeMonitor";
import type { GemeindePaket } from "../../lib/gemeinde-paket";

/**
 * The hero card's frame content (port of the prototype's HeroWidgetPreview):
 * the page picks the reading by message, a click opens the full monitor.
 *
 * Der Wechsel ist eine Blende, kein Schnitt (Betreiber, 23.09.2026): Die
 * Kachel wird kurz durchsichtig, tauscht dann den Inhalt und blendet ihn
 * wieder auf. Und der Tagesverlauf meldet dem Rahmen, wann seine Bewegung
 * durch ist — vorher schaltete die Seite nach fester Zeit weiter, mitten in
 * die Animation hinein.
 */
const WIDGETS = ["feed-in-value", "live", "radial"];
/** So lange blendet die Kachel aus und wieder auf. */
const BLENDE_MS = 260;

export default function GemeindeKopfRahmenInhalt({ paket }: { paket: GemeindePaket }) {
  const [widget, setWidget] = useState(() => {
    const start = new URLSearchParams(location.search).get("widget") ?? "";
    return WIDGETS.includes(start) ? start : WIDGETS[0];
  });
  const [sichtbar, setSichtbar] = useState(true);
  const [paused, setPaused] = useState(false);
  const wechsel = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Welche Kachel zuletzt angefordert wurde — die Entscheidung darf nicht im
  // Zustands-Aktualisierer stehen, der läuft in der Entwicklung doppelt.
  const aktuell = useRef(widget);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== parent) return;
      if (event.data?.type !== "atlas-hero-widget" || !WIDGETS.includes(event.data.widget)) return;
      const naechstes = event.data.widget as string;
      if (aktuell.current === naechstes) return;
      aktuell.current = naechstes;
      // Ohne Bewegung fällt die Blende weg, der Inhalt springt.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setWidget(naechstes);
        return;
      }
      setSichtbar(false);
      clearTimeout(wechsel.current);
      wechsel.current = setTimeout(() => {
        setWidget(naechstes);
        setSichtbar(true);
      }, BLENDE_MS);
    };
    window.addEventListener("message", receive);
    return () => {
      window.removeEventListener("message", receive);
      clearTimeout(wechsel.current);
    };
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

  // „Meine Bewegung ist durch." Die Seite wartet danach noch einen Moment,
  // bevor sie weiterschaltet — das Bild soll stehen bleiben, nicht sofort
  // verschwinden.
  const fertig = useCallback(() => {
    parent.postMessage({ type: "atlas-hero-finished", widget }, location.origin);
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
      style={{ opacity: sichtbar ? 1 : 0, transition: `opacity ${BLENDE_MS}ms ease` }}
    >
      <GemeindeKopfMonitor paket={paket} widget={widget} paused={paused} onFertig={fertig} />
    </a>
  );
}
