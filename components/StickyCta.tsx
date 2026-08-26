"use client";

import { useEffect, useRef, useState } from "react";
import { v } from "../lib/theme";

/**
 * Klebende Aktionsleiste am unteren Rand — die ein bis zwei Wege, die eine lange
 * Seite anbietet, bleiben in Reichweite.
 *
 * Sie verschwindet, sobald das Seitenende (der Merker) in Sicht kommt, damit sie
 * nie den Fuß mit den Rechtshinweisen überdeckt, und fährt beim Zurückscrollen
 * wieder ein.
 *
 * ALLGEMEIN GEMACHT AM 26.08.2026, vorher fest für den Wärmepumpen-Ratgeber
 * verdrahtet (zwei feste Beschriftungen, ein fester Sprungpunkt). Als die
 * Förder-Stadtseiten dieselbe Leiste brauchten, war die Versuchung, eine zweite
 * zu bauen — und die hätte sich in Verlauf, Sicherheitszone und Ausblenden am
 * Seitenende sofort unterschieden. Ein Baustein, zwei Aufrufer.
 *
 * Der Aufrufer rendert den Merker selbst: `<div id="sc-cta-sentinel" />` am Ende
 * seines Inhalts.
 */
/** Ab hier gilt es als „der Nutzer liest weiter unten". */
const AB_SCROLL_PX = 260;

export default function StickyCta({
  primaer,
  sekundaer,
}: {
  primaer: { href: string; label: string };
  /**
   * Zweite Aktion — entfällt, wo es nur einen nächsten Schritt gibt.
   * `ereignis` statt `href`, wo das Ziel kein Ort ist, sondern ein Fenster
   * (der Förder-Check öffnet sich, statt irgendwohin zu springen).
   */
  sekundaer?: { href?: string; ereignis?: string; label: string; extern?: boolean };
}) {
  const [hidden, setHidden] = useState(false);
  const [gescrollt, setGescrollt] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = document.getElementById("sc-cta-sentinel");
    if (!sentinel) return;
    const io = new IntersectionObserver(([entry]) => setHidden(entry.isIntersecting), {
      rootMargin: "0px 0px -40px 0px",
    });
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  // ERST BEIM SCROLLEN (26.08.2026). Vorher stand die Leiste vom ersten Moment
  // an da — und damit doppelt: Der primäre Knopf steht oben in Sichtweite, die
  // Leiste bot denselben Weg zwei Zentimeter tiefer noch einmal an. Ein zweiter
  // identischer Knopf neben dem ersten ist Lärm; sinnvoll wird er erst, wenn der
  // erste weggescrollt ist.
  useEffect(() => {
    const pruefe = () => setGescrollt(window.scrollY > AB_SCROLL_PX);
    pruefe();
    window.addEventListener("scroll", pruefe, { passive: true });
    return () => window.removeEventListener("scroll", pruefe);
  }, []);

  const sichtbar = gescrollt && !hidden;

  const base: React.CSSProperties = {
    flex: 1,
    textAlign: "center",
    padding: "12px 10px",
    borderRadius: v("--radius-md"),
    fontSize: 14,
    fontWeight: 700,
    textDecoration: "none",
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  };

  return (
    <div
      ref={ref}
      aria-hidden={!sichtbar}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        // Nach oben ausblendender Hintergrund statt harter Kante — der Inhalt
        // scrollt weich darunter durch. Der deckende Teil reicht bis knapp über
        // die Knöpfe, darüber löst er sich auf; `color-mix` hält ihn
        // theme-fähig, also auch auf den dunklen Tagesstufen richtig.
        background: `linear-gradient(to top, color-mix(in srgb, ${v("--color-bg")} 90%, transparent) 0%, color-mix(in srgb, ${v("--color-bg")} 90%, transparent) 55%, color-mix(in srgb, ${v("--color-bg")} 50%, transparent) 78%, transparent 100%)`,
        // KEIN backdrop-filter (26.08.2026). Er wirkt auf die GANZE Box, also
        // auch dort, wo der Verlauf längst durchsichtig ist — der Text darüber
        // wurde unscharf, und genau das sah aus wie ein Hintergrund, der nicht
        // ausblendet. Der Verlauf allein reicht, wenn er lang genug ist:
        // 64 px Auslauf über den Knöpfen statt 24.
        padding: "64px 12px calc(12px + env(safe-area-inset-bottom))",
        transform: sichtbar ? "none" : "translateY(130%)",
        transition: "transform 0.28s ease",
        pointerEvents: sichtbar ? "auto" : "none",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", gap: 8 }}>
        <a
          href={primaer.href}
          style={{
            ...base,
            background: v("--color-accent"),
            color: v("--color-text-on-accent"),
          }}
        >
          {primaer.label}
        </a>
        {sekundaer && (
          sekundaer.ereignis ? (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(sekundaer.ereignis!))}
              style={{
                ...base,
                cursor: "pointer",
                background: v("--color-bg"),
                color: v("--color-accent"),
                border: `1px solid ${v("--color-border-accent")}`,
              }}
            >
              {sekundaer.label}
            </button>
          ) : (
            <a
              href={sekundaer.href}
              {...(sekundaer.extern ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              style={{
                ...base,
                background: v("--color-bg"),
                color: v("--color-accent"),
                border: `1px solid ${v("--color-border-accent")}`,
              }}
            >
              {sekundaer.label}
            </a>
          )
        )}
      </div>
    </div>
  );
}
