"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { v, KLEBELEISTE_VAR } from "../lib/theme";

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
 *
 * ── Sie meldet ihre Höhe, damit nichts unter ihr verschwindet ──────────────
 * Der Toast liegt ebenfalls am unteren Rand; ohne Meldung lag die
 * PLZ-Aufforderung genau unter der Leiste und war nicht mehr lesbar. Die
 * Leiste schreibt ihre tatsächliche Höhe an das Wurzelelement
 * (`--sc-klebeleiste`), eingefahren null — wer unten etwas platziert, rechnet
 * sie auf seinen Abstand. Gemessen statt geschätzt, weil die Höhe an der
 * Beschriftung hängt: Auf schmalen Schirmen bricht die dritte Aktion um.
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
  const leisteRef = useRef<HTMLDivElement>(null);
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

  // Die Höhe wird gemessen, nicht angenommen — sie hängt an der Beschriftung
  // und am Umbruch. Eingefahren gilt null, sonst hielte die Leiste den Platz
  // frei, den sie gar nicht belegt.
  //
  // Gemessen wird die KNOPFREIHE plus der Abstand darunter, nicht die ganze
  // Box: Deren oberes Drittel ist der durchsichtige Auslauf des Verlaufs. Wer
  // ihn mitzählt, schiebt alles darüber 64 px zu hoch. Und nicht über die
  // Bildschirmposition — während die Leiste einfährt, steht sie noch woanders.
  useEffect(() => {
    const wurzel = document.documentElement;
    const setzen = () => {
      const box = leisteRef.current;
      const reihe = box?.firstElementChild as HTMLElement | null;
      if (!sichtbar || !box || !reihe) {
        wurzel.style.setProperty(KLEBELEISTE_VAR, "0px");
        return;
      }
      const unten = parseFloat(getComputedStyle(box).paddingBottom) || 0;
      wurzel.style.setProperty(KLEBELEISTE_VAR, `${Math.round(reihe.offsetHeight + unten)}px`);
    };
    setzen();
    const el = leisteRef.current;
    if (!el || typeof ResizeObserver === "undefined") return () => {
      wurzel.style.removeProperty(KLEBELEISTE_VAR);
    };
    const beobachter = new ResizeObserver(setzen);
    beobachter.observe(el);
    return () => {
      beobachter.disconnect();
      wurzel.style.removeProperty(KLEBELEISTE_VAR);
    };
  }, [sichtbar]);

  return (
    <>
      {kinder(ankerRef)}
      <div
        ref={leisteRef}
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
