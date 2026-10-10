"use client";

import { useEffect, useRef, useState } from "react";
import { LoadingDots } from "./LoadingDots";
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
  scheme,
  startWhenVisible = false,
  rounded = framed,
  onReady,
  onHeightChange,
  loading = "lazy",
  appearance,
}: {
  src: string;
  title: string;
  fallbackHeight: number;
  framed?: boolean;
  scheme?: "light" | "dark";
  /** Defer animation-bearing embeds until they actually enter the viewport. */
  startWhenVisible?: boolean;
  rounded?: boolean;
  onReady?: () => void;
  onHeightChange?: (height: number) => void;
  loading?: "lazy" | "eager";
  appearance?: import("../lib/widget-appearance").WidgetAppearance;
}) {
  const { ref, height, bereit } = useIframeAutoHeight(fallbackHeight);
  const pathname = usePathname();
  const container = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (!startWhenVisible || entered || !container.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setEntered(true);
        observer.disconnect();
      }
    }, { threshold: 0.15 });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [startWhenVisible, entered]);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);

  useEffect(() => { if (bereit) onHeightChange?.(height); }, [bereit, height, onHeightChange]);
  useEffect(() => { if (bereit) onReady?.(); }, [bereit, onReady]);

  // Der Pfad hängt an der Adresse, nicht an einer Nachricht: so ist er schon
  // beim ersten Rendern im iframe da und der Knopf blitzt nicht kurz auf.
  const quelle = pathname ? `${src}${src.indexOf("?") === -1 ? "?" : "&"}hp=${encodeURIComponent(pathname)}` : src;

  useEffect(() => {
    // Explicit embed themes must not be overwritten by the surrounding page theme.
    if (scheme) return;
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
  }, [ref, bereit, scheme]);

  const activeSource = !startWhenVisible || entered ? quelle : undefined;
  const pending = !activeSource || (!bereit && loadedSource !== quelle);

  useEffect(() => {
    if (!appearance) return;
    const origin = new URL(quelle, window.location.href).origin;
    const send = () => ref.current?.contentWindow?.postMessage({type:"widget:appearance",appearance},origin);
    const receive = (event: MessageEvent) => {
      if(event.source===ref.current?.contentWindow && event.origin===origin && event.data?.type==='widget:appearance-request')send();
    };
    window.addEventListener('message',receive);
    send();
    return()=>window.removeEventListener('message',receive);
  }, [appearance, bereit, quelle, ref]);

  return (
    <div ref={container} style={{ position: "relative", width: "100%" }} aria-busy={pending}>
      {pending && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 16,
          background: "var(--atlas-surface, var(--color-bg-raised))",
          color: v("--color-text-muted"), borderRadius: v("--radius-md"),
          border: `1px solid ${v("--color-border")}`, boxSizing: "border-box",
          pointerEvents: "none",
        }}>
          <LoadingDots size={6} baseline={false} />
          <span>Diagramm wird geladen …</span>
        </div>
      )}
    <iframe
      ref={ref}
      src={activeSource}
      title={title}
      loading={loading}
      onLoad={() => { if (activeSource) setLoadedSource(activeSource); ref.current?.contentWindow?.postMessage({type:"widget:measure"},new URL(quelle,window.location.href).origin); }}
      style={{
        opacity: pending ? 0 : 1,
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        colorScheme: scheme,
        background: scheme ? "var(--atlas-surface, var(--color-bg))" : undefined,
        height,
        border: framed ? `1px solid ${v("--color-border")}` : 0,
        borderRadius: rounded ? v("--radius-md") : 0,
        display: "block",
      }}
    />
    </div>
  );
}
