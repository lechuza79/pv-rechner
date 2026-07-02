"use client";

import { useIframeAutoHeight } from "../lib/useIframeAutoHeight";
import { v } from "../lib/theme";

/**
 * Bettet ein Embed-Widget als iframe ein und passt die Höhe automatisch an die
 * gemeldete Content-Höhe an (siehe `WidgetAutoHeight`). Standard-Einbettung
 * unserer Widgets auf eigenen Seiten (as-is), ohne Leerraum unten.
 */
export default function AutoHeightIframe({
  src,
  title,
  fallbackHeight,
  framed = true,
}: {
  src: string;
  title: string;
  fallbackHeight: number;
  framed?: boolean;
}) {
  const { ref, height } = useIframeAutoHeight(fallbackHeight);
  return (
    <iframe
      ref={ref}
      src={src}
      title={title}
      loading="lazy"
      style={{
        width: "100%",
        height,
        border: framed ? `1px solid ${v("--color-border")}` : 0,
        borderRadius: framed ? v("--radius-md") : 0,
        display: "block",
      }}
    />
  );
}
