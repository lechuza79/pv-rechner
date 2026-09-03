"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { v, pad } from "../lib/theme";

/**
 * Eine klebende Leiste am unteren Rand, die den nächsten Schritt wiederholt —
 * aber nur, solange der echte Knopf nicht im Bild ist.
 *
 * ── Warum an der SICHTBARKEIT und nicht an einer Scroll-Höhe ───────────────
 * Wie weit unten das Rechner-Ergebnis endet, hängt davon ab, wie viele
 * Abschnitte der Nutzer aufgeklappt hat. Eine feste Zahl wäre auf der einen
 * Seite zu früh und auf der anderen zu spät. Die Leiste beobachtet deshalb den
 * Knopf selbst.
 *
 * ── Warum sie verschwindet, sobald der Knopf sichtbar ist ──────────────────
 * Zwei gleiche Knöpfe übereinander sind Lärm — dieselbe Regel, aus der die
 * klebende Leiste der Ratgeber erst beim Scrollen erscheint.
 *
 * ── Warum kein Weichzeichner ───────────────────────────────────────────────
 * Er wirkt auf die ganze Fläche, auch dort, wo der Verlauf längst durchsichtig
 * ist; der Text darunter wird milchig, und genau das sieht aus wie ein
 * Hintergrund, der nicht endet.
 *
 * ── Ein Aufrufer, eine Leiste ──────────────────────────────────────────────
 * Wer zwei klebende Leisten auf einer Seite hat, hat eine zu viel. Deshalb
 * schaltet der Aufrufer sie über `aktiv` ab, wenn eine wichtigere unten steht
 * (auf der betriebseigenen Seite hat der Rückkanal Vorrang vor dem Speichern).
 */
export default function KlebenderKnopf({
  aktiv = true,
  kinder,
  leiste,
}: {
  /** Aus, wo eine andere Leiste Vorrang hat. */
  aktiv?: boolean;
  /** Der echte Knopf im Seitenfluss. Er wird beobachtet. */
  kinder: (ref: React.RefObject<HTMLDivElement | null>) => ReactNode;
  /** Was in der Leiste steht — meist derselbe Knopf noch einmal. */
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
      // Der obere Rand ist eingezogen: Ein Knopf, der gerade erst unter der
      // Kopfzeile hervorlugt, gilt noch nicht als gesehen.
      { rootMargin: "-80px 0px 0px 0px" },
    );
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, [aktiv]);

  return (
    <>
      {kinder(ankerRef)}
      {aktiv && zeigen && (
        <div style={S.leiste}>
          <div style={S.inner}>{leiste}</div>
        </div>
      )}
    </>
  );
}

const S = {
  leiste: {
    position: "fixed" as const,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    padding: pad("sm", "md"),
    background: `linear-gradient(to top, ${v("--color-bg")} 55%, transparent)`,
    display: "flex",
    justifyContent: "center",
    // Der Verlauf selbst darf keine Klicks abfangen — nur der Knopf darin.
    pointerEvents: "none" as const,
  },
  inner: {
    pointerEvents: "auto" as const,
    width: "100%",
    maxWidth: 480,
  },
};
