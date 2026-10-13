"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Host-seitiges Gegenstück zu `WidgetAutoHeight`: hört auf die
 * `widget:height`-Meldung des eingebetteten Widgets und gibt die passende
 * iframe-Höhe zurück. Nur Nachrichten aus genau diesem iframe werden
 * akzeptiert (Prüfung `event.source`).
 *
 * @param fallback Anfangs-/Mindesthöhe, bis das Widget seine echte Höhe meldet.
 */
export function useIframeAutoHeight(fallback: number) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(fallback);
  // Die erste Höhenmeldung ist zugleich der Nachweis, dass im iframe React
  // läuft und zuhört — vorher gesendete Nachrichten (z. B. das Farbschema der
  // Seite) verpufften. Deshalb wird sie mitgeteilt, statt sie zu erraten.
  const [bereit, setBereit] = useState(false);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (!ref.current || e.source !== ref.current.contentWindow) return;
      const origin = new URL(ref.current.src, window.location.href).origin;
      if (e.origin !== origin) return;
      const d = e.data as { type?: string; height?: number; ready?: boolean } | null;
      if (d && d.type === "widget:height" && typeof d.height === "number" && Number.isFinite(d.height) && d.height > 0) {
        setHeight(Math.ceil(d.height));
        setBereit(d.ready !== false);
      }
    };
    window.addEventListener("message", onMsg);
    // A cached frame can hydrate before this listener mounts. Ask until it answers.
    const request = () => {
      const frame = ref.current;
      if (frame) frame.contentWindow?.postMessage({type: 'widget:measure'}, new URL(frame.src, window.location.href).origin);
    };
    request();
    const retry = bereit ? undefined : window.setInterval(request, 1000);
    return () => { window.removeEventListener("message", onMsg); window.clearInterval(retry); };

  }, [bereit]);

  return { ref, height, bereit };
}
