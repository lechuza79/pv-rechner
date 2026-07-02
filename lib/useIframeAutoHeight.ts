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

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (!ref.current || e.source !== ref.current.contentWindow) return;
      const d = e.data as { type?: string; height?: number } | null;
      if (d && d.type === "widget:height" && typeof d.height === "number" && d.height > 0) {
        setHeight(Math.ceil(d.height));
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return { ref, height };
}
