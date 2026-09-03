"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { v } from "../lib/theme";

/**
 * Die klebende Aktionsleiste am unteren Rand des Ergebnisses.
 *
 * ── Optik aus einer Quelle ─────────────────────────────────────────────────
 * Verlauf, Auslauf, Einfahren und der sichere Bereich am unteren Rand sind
 * dieselben wie in `StickyCta` (den Ratgeber- und Förderseiten). Zwei
 * klebende Leisten, die sich in der Bewegung unterscheiden, sähen aus wie zwei
 * verschiedene Produkte — deshalb ist die Bauweise dort abgeschrieben und die
 * Begründungen sind es auch:
 *
 * - **Kein Weichzeichner.** Er wirkt auf die ganze Box, auch dort, wo der
 *   Verlauf längst durchsichtig ist; der Text darüber wird unscharf, und genau
 *   das sieht aus wie ein Hintergrund, der nicht endet. Ein langer Auslauf
 *   (64 px) reicht.
 * - **Einfahren statt Ein-/Ausblenden.** Ein Element, das an Ort und Stelle
 *   erscheint, wirkt wie ein Fehler; eines, das hereinfährt, wie eine Antwort
 *   auf das Scrollen.
 *
 * ── Warum an der SICHTBARKEIT und nicht an einer Scroll-Höhe ───────────────
 * Wie weit unten das Rechner-Ergebnis endet, hängt davon ab, wie viele
 * Abschnitte der Nutzer aufgeklappt hat. Eine feste Zahl wäre auf der einen
 * Seite zu früh und auf der anderen zu spät. Die Leiste beobachtet deshalb den
 * echten Knopf und verschwindet, sobald er im Bild ist — zwei gleiche Knöpfe
 * übereinander wären Lärm.
 */
export default function KlebenderKnopf({
  aktiv = true,
  kinder,
  leiste,
}: {
  /** Aus, wo es nichts zu wiederholen gibt. */
  aktiv?: boolean;
  /** Der echte Bereich im Seitenfluss. Er wird beobachtet. */
  kinder: (ref: React.RefObject<HTMLDivElement | null>) => ReactNode;
  /** Was in der Leiste steht. */
  leiste: ReactNode;
}) {
  const ankerRef = useRef<HTMLDivElement>(null);
  const [zeigen, setZeigen] = useState(false);

  useEffect(() => {
    if (!aktiv) {
      setZeigen(false);
      return;
    }
    const el = ankerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const beobachter = new IntersectionObserver(
      ([eintrag]) => setZeigen(!eintrag.isIntersecting),
      // Der obere Rand ist eingezogen: Ein Bereich, der gerade erst unter der
      // Kopfzeile hervorlugt, gilt noch nicht als gesehen.
      { rootMargin: "-80px 0px 0px 0px" },
    );
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, [aktiv]);

  const sichtbar = aktiv && zeigen;

  return (
    <>
      {kinder(ankerRef)}
      <div
        aria-hidden={!sichtbar}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 60,
          background: `linear-gradient(to top, color-mix(in srgb, ${v("--color-bg")} 90%, transparent) 0%, color-mix(in srgb, ${v("--color-bg")} 90%, transparent) 55%, color-mix(in srgb, ${v("--color-bg")} 50%, transparent) 78%, transparent 100%)`,
          padding: "64px 12px calc(12px + env(safe-area-inset-bottom))",
          transform: sichtbar ? "none" : "translateY(130%)",
          transition: "transform 0.28s ease",
          pointerEvents: sichtbar ? "auto" : "none",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", gap: 8 }}>
          {leiste}
        </div>
      </div>
    </>
  );
}
