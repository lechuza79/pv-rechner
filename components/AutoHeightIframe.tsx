"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useIframeAutoHeight } from "../lib/useIframeAutoHeight";
import { v } from "../lib/theme";
import { widgetVarsAusTokens } from "../lib/widget-theme";

/**
 * Bettet ein Embed-Widget als iframe ein und passt die Höhe automatisch an die
 * gemeldete Content-Höhe an (siehe `WidgetAutoHeight`). Standard-Einbettung
 * unserer Widgets auf eigenen Seiten (as-is), ohne Leerraum unten.
 *
 * Dazu die beiden Dinge, die ein iframe von sich aus NICHT von der Seite erbt:
 *  - das FARBSCHEMA. Die Seite folgt der Sonne (sieben Tagesstufen), das
 *    Embed-Layout hat feste eigene Voreinstellungen — ohne Übergabe stand
 *    abends eine weiße Kachel auf dunklem Grund. Gesendet wird über den
 *    vorhandenen Theme-Kanal (`widget:theme`, same-origin), nicht über einen
 *    zweiten Mechanismus.
 *  - der PFAD DER SEITE. Im iframe ist die Adresse `/embed/…`; das Widget kann
 *    deshalb nicht selbst merken, dass sein „nächster Schritt" genau auf die
 *    Seite zeigt, die man gerade liest. Er wandert als `hp` in die Adresse.
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
  const { ref, height, bereit } = useIframeAutoHeight(fallbackHeight);
  const pathname = usePathname();

  // Der Pfad hängt an der Adresse, nicht an einer Nachricht: so ist er schon
  // beim ersten Rendern im iframe da und der Knopf blitzt nicht kurz auf.
  const quelle = pathname ? `${src}${src.indexOf("?") === -1 ? "?" : "&"}hp=${encodeURIComponent(pathname)}` : src;

  useEffect(() => {
    const fenster = ref.current?.contentWindow;
    if (!fenster) return;
    const senden = () => {
      const gelesen = getComputedStyle(document.documentElement);
      fenster.postMessage(
        {
          type: "widget:theme",
          // „seite" heißt: das sind unsere eigenen Tagesfarben, kein Schema
          // eines Einbettenden — das geteilte Bild stellt sie wieder auf die
          // hellste Stufe zurück (lib/chart-export.ts).
          quelle: "seite",
          vars: widgetVarsAusTokens((t) => gelesen.getPropertyValue(t)),
        },
        window.location.origin,
      );
    };
    senden();
    // Die Stufe wechselt im Lauf des Tages (und beim Umschalten von Hand) —
    // ohne Beobachter bliebe das Widget auf der Stufe des Seitenaufrufs stehen.
    const beobachter = new MutationObserver(senden);
    beobachter.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => beobachter.disconnect();
    // `bereit` als Auslöser: erst wenn das Widget seine Höhe gemeldet hat, hört
    // im iframe jemand zu.
  }, [ref, bereit]);

  return (
    <iframe
      ref={ref}
      src={quelle}
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
