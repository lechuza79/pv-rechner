"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { v, space } from "../lib/theme";
import { IconChevronLeft, IconChevronRight } from "./Icons";

/**
 * Eine Reihe Teaser, die man wischt — und auf dem Schirm mit Pfeilen blättert.
 *
 * WARUM KEIN SLIDER-PAKET: Was hier gebraucht wird, ist Wischen, Einrasten und
 * zwei Pfeile. Das kann der Browser selbst (`scroll-snap`), samt Trägheit auf
 * Mobilgeräten, Tastaturbedienung und Bildlaufleiste — ein Paket brächte
 * Endlosschleife und Autoplay mit, beides brauchen zwei bis fünf Meldungen
 * nicht. Die Atlas-Seiten sind der dokumentierte Leistungs-Engpass des
 * Projekts; ein Paket im Browser-Bündel jeder der 11.000 Ortsseiten will
 * begründet sein. Kommt später Autoplay oder eine echte Schleife dazu, ist
 * Embla der Austausch — die Schnittstelle dieser Komponente ändert sich dabei
 * nicht.
 *
 * WARUM NICHT EIN GITTER: Ein Gitter zeigt alles auf einmal und wächst nach
 * unten. Der Teaser soll aber neben den Zahlen der Seite stehen, ohne sie
 * wegzuschieben — und er muss mit zwei Einträgen genauso aussehen wie mit
 * zwanzig, weil eine kleine Gemeinde selten mehr als zwei Meldungen hat.
 */
export default function StorySlider({
  children,
  ariaLabel,
}: {
  /** Die Teaser. Jeder wird zu einer Einrast-Station. */
  children: React.ReactNode[];
  /** Wofür diese Reihe steht — für Screenreader, die keine Überschrift sehen. */
  ariaLabel: string;
}) {
  const spurRef = useRef<HTMLDivElement | null>(null);
  const [kannZurueck, setKannZurueck] = useState(false);
  const [kannVor, setKannVor] = useState(false);

  // Ob die Pfeile etwas tun können, wird GEMESSEN, nicht aus der Zahl der
  // Einträge geschlossen: Bei drei Teasern auf einem breiten Schirm ist nichts
  // zu blättern, bei denselben dreien auf 375 px schon. Ein Pfeil, der nichts
  // bewirkt, sieht bedienbar aus und ist es nicht.
  const messen = useCallback(() => {
    const el = spurRef.current;
    if (!el) return;
    const rest = el.scrollWidth - el.clientWidth - el.scrollLeft;
    setKannZurueck(el.scrollLeft > 4);
    setKannVor(rest > 4);
  }, []);

  useEffect(() => {
    const el = spurRef.current;
    if (!el) return;
    messen();
    el.addEventListener("scroll", messen, { passive: true });
    // Auch bei Größenänderung — sonst behält ein Pfeil seinen Zustand aus einer
    // Breite, die es nicht mehr gibt.
    const ro = new ResizeObserver(messen);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", messen);
      ro.disconnect();
    };
  }, [messen, children.length]);

  const blaettern = (richtung: 1 | -1) => {
    const el = spurRef.current;
    if (!el) return;
    // Um die Breite einer Karte, nicht um die des Fensters: Auf dem Schirm
    // stehen mehrere nebeneinander, und ein Sprung um die volle Breite
    // überspringt die dazwischen.
    const karte = el.firstElementChild as HTMLElement | null;
    const schritt = karte ? karte.getBoundingClientRect().width + KARTEN_ABSTAND : el.clientWidth;
    el.scrollBy({ left: schritt * richtung, behavior: "smooth" });
  };

  return (
    <div style={S.wrap}>
      <div ref={spurRef} style={S.spur} role="group" aria-label={ariaLabel} tabIndex={0}>
        {children.map((kind, i) => (
          <div key={i} style={S.station}>
            {kind}
          </div>
        ))}
      </div>

      {/* Die Pfeile stehen UNTER der Reihe, nicht darüberliegend: Über den
          Karten verdeckten sie deren Aktionsknöpfe, und auf einer schmalen
          Karte gibt es keine Fläche, auf der sie nichts verdecken. Sie blenden
          sich ganz aus, solange es nichts zu blättern gibt. */}
      {(kannZurueck || kannVor) && (
        <div style={S.pfeile}>
          <button
            type="button"
            onClick={() => blaettern(-1)}
            disabled={!kannZurueck}
            aria-label="Vorherige Meldung"
            style={{ ...S.pfeil, opacity: kannZurueck ? 1 : 0.35 }}
          >
            <IconChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => blaettern(1)}
            disabled={!kannVor}
            aria-label="Nächste Meldung"
            style={{ ...S.pfeil, opacity: kannVor ? 1 : 0.35 }}
          >
            <IconChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

/** Abstand zwischen zwei Karten — auch die Schrittweite der Pfeile. */
const KARTEN_ABSTAND = space.lg;

const S: Record<string, React.CSSProperties> = {
  wrap: { position: "relative" },
  spur: {
    display: "flex",
    gap: KARTEN_ABSTAND,
    overflowX: "auto",
    scrollSnapType: "x mandatory",
    // Die Bildlaufleiste bleibt erlaubt: Sie ist auf dem Schirm der einzige
    // Hinweis, dass rechts noch etwas steht, wenn die Pfeile gerade ausgeblendet
    // sind. Auf Mobilgeräten blendet das Betriebssystem sie ohnehin aus.
    scrollBehavior: "smooth",
    // Damit die erste und letzte Karte nicht am Rand kleben.
    paddingBottom: space.sm,
    WebkitOverflowScrolling: "touch",
  },
  station: {
    scrollSnapAlign: "start",
    // Feste Breite statt Anteil: Eine Karte, die sich die Spur teilt, wird bei
    // zwei Einträgen doppelt so breit wie bei vier — dieselbe Meldung sähe je
    // nach Nachbarschaft anders aus.
    flex: "0 0 clamp(240px, 78vw, 320px)",
    display: "flex",
  },
  pfeile: { display: "flex", gap: space.sm, justifyContent: "flex-end", marginTop: space.sm },
  pfeil: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: v("--radius-sm"),
    border: `1px solid ${v("--color-border")}`,
    background: v("--color-bg"),
    color: v("--color-text-primary"),
    cursor: "pointer",
  },
};
