"use client";

import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { v, space } from "../lib/theme";
import { IconChevronLeft, IconChevronRight } from "./Icons";
import heroStyles from "./StorySliderHero.module.css";

/**
 * Eine Reihe Teaser, die man wischt — mit Endlosschleife, Pfeilen und
 * Punkten.
 *
 * WARUM EIN PAKET UND NICHT DER BROWSER: Wischen und Einrasten kann der
 * Browser selbst, und für eine Reihe ohne Schleife war das die richtige Wahl.
 * Eine ENDLOSSCHLEIFE kann er nicht: Sie verlangt, dass die Spur beim
 * Überschreiten des letzten Eintrags nahtlos wieder am ersten steht — also
 * Kopien der Ränder, ein Zurücksetzen der Rolle mitten in der Bewegung und ein
 * Trägheits-Modell, das dabei nicht springt. Von Hand ist das der Punkt, an
 * dem man anfängt, Zeigerereignisse und Geschwindigkeiten selbst zu rechnen —
 * und genau daran ist in diesem Projekt schon einmal Zeit verbrannt worden.
 *
 * DIE SCHLEIFE GILT NICHT IMMER, und das ist keine Inkonsequenz. Füllen die
 * Einträge die Spur nicht, gibt es nichts zu drehen; das Paket schaltet die
 * Schleife dann von sich aus ab, ohne es zu sagen. Statt sich darauf zu
 * verlassen, entscheidet das hier sichtbar: unter {@link MIN_FUER_SCHLEIFE}
 * Einträgen keine Schleife. Der Grund ist inhaltlich, nicht technisch — eine
 * Gemeinde mit zwei Meldungen, die sich endlos dreht, zeigt dieselben zwei
 * Karten immer wieder, und das sieht nach Fehler aus, nicht nach Fülle.
 */
function ScrollingStorySlider({
  children,
  ariaLabel,
  fullWidth = false,
  itemLabel = "Meldung",
  arrows = true,
  autoplay = false,
}: {
  /** Die Teaser. Jeder wird zu einer Station der Spur. */
  children: React.ReactNode[];
  /** Wofür diese Reihe steht — für Screenreader, die keine Überschrift sehen. */
  ariaLabel: string;
  /** Show one full card per snap with optional compact navigation. */
  fullWidth?: boolean;
  itemLabel?: string;
  arrows?: boolean;
  /** Advance complete slides while visible, pausing for interaction. */
  autoplay?: boolean;
}) {
  const schleife = children.length >= MIN_FUER_SCHLEIFE;

  const auto = useMemo(() => Autoplay({delay:5000,playOnInit:false,stopOnInteraction:false,stopOnMouseEnter:true,stopOnFocusIn:true}), []);
  const [spurRef, embla] = useEmblaCarousel({
    loop: schleife,
    align: "start",
    // Ohne Schleife die Ränder beschneiden, damit die letzte Karte bündig
    // abschließt statt in einer Lücke zu enden. Mit Schleife muss das
    // ausbleiben — dort gibt es keinen Rand, an dem etwas zu beschneiden wäre.
    containScroll: schleife ? false : "trimSnaps",
    // Zeigt der Nutzer eine reduzierte Bewegung an, springt die Spur, statt zu
    // gleiten. Die Bewegung ist hier Zierde; das Blättern selbst bleibt.
    duration: 25,
  }, autoplay ? [auto] : []);

  useEffect(() => {
    if (!embla || !autoplay) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => {
      if (visible && !document.hidden && !motion.matches) auto.play();
      else auto.stop();
    };
    const observer = new IntersectionObserver(([entry]) => {visible=entry.isIntersecting;sync();}, {threshold:0.5});
    observer.observe(embla.rootNode());
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    return () => {observer.disconnect();auto.stop();document.removeEventListener("visibilitychange",sync);motion.removeEventListener("change",sync);};
  }, [embla, autoplay, auto]);

  const [kannZurueck, setKannZurueck] = useState(false);
  const [kannVor, setKannVor] = useState(false);
  const [aktiv, setAktiv] = useState(0);
  const [stationen, setStationen] = useState<number[]>([]);

  // Der Zustand der Pfeile wird GEMESSEN, nicht aus der Zahl der Einträge
  // geschlossen: Drei Teaser sind auf einem breiten Schirm nichts zu blättern,
  // auf 375 px schon. Ein Pfeil, der nichts bewirkt, sieht bedienbar aus und
  // ist es nicht.
  const messen = useCallback(() => {
    if (!embla) return;
    setKannZurueck(embla.canScrollPrev());
    setKannVor(embla.canScrollNext());
    setAktiv(embla.selectedScrollSnap());
    setStationen(embla.scrollSnapList().map((_, i) => i));
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    messen();
    embla.on("select", messen);
    embla.on("reInit", messen);
    return () => {
      embla.off("select", messen);
      embla.off("reInit", messen);
    };
  }, [embla, messen]);

  const zeigen = kannZurueck || kannVor || stationen.length > 1;

  return (
    <div style={S.wrap}>
      <div ref={spurRef} style={S.fenster} role="group" aria-label={ariaLabel}>
        <div style={S.spur}>
          {children.map((kind, i) => (
            <div key={i} style={{...S.station, ...(fullWidth ? {flex:"0 0 100%"} : {})}}>
              {kind}
            </div>
          ))}
        </div>
      </div>

      {/* Bedienung UNTER der Reihe, nicht darüberliegend: Über den Karten
          verdeckten die Pfeile deren Aktionsknöpfe, und auf einer schmalen
          Karte gibt es keine Fläche, auf der sie nichts verdecken. */}
      {zeigen && (
        <div data-slider-controls style={{...S.leiste, ...(!arrows ? {justifyContent:"center"} : {})}}>
          {/* Punkte statt einer Bildlaufleiste: Mit Schleife hat die Spur kein
              Ende, eine Leiste hätte also nichts anzuzeigen. Sie sagen, wo man
              ist und wie viel es gibt. */}
          <div style={S.punkte}>
            {stationen.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => embla?.scrollTo(i)}
                aria-label={`${itemLabel} ${i + 1} von ${stationen.length}`}
                aria-current={i === aktiv ? "true" : undefined}
                style={{
                  ...S.punkt,
                  background: "transparent",
                }}
              ><span aria-hidden="true" style={{width:7,height:7,borderRadius:"50%",background:i===aktiv?v("--color-cta"):v("--color-text-muted"),opacity:i===aktiv?1:.4}}/></button>
            ))}
          </div>
          {arrows && <div style={S.pfeile}>
            <button
              type="button"
              onClick={() => embla?.scrollPrev()}
              disabled={!kannZurueck}
              aria-label="Vorherige Meldung"
              style={{ ...S.pfeil, opacity: kannZurueck ? 1 : 0.35 }}
            >
              <IconChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => embla?.scrollNext()}
              disabled={!kannVor}
              aria-label="Nächste Meldung"
              style={{ ...S.pfeil, opacity: kannVor ? 1 : 0.35 }}
            >
              <IconChevronRight size={16} />
            </button>
          </div>}
        </div>
      )}
    </div>
  );
}

/**
 * Ab so vielen Einträgen dreht sich die Reihe.
 *
 * Vier, weil darunter auf jedem Schirm alles gleichzeitig sichtbar ist oder
 * fast — und eine Schleife über etwas vollständig Sichtbares dreht sich um
 * ihrer selbst willen. Die Zahl ist ein Urteil, kein Messwert; sie steht hier,
 * damit sie an EINER Stelle steht und nicht in jedem Aufrufer neu.
 */
const MIN_FUER_SCHLEIFE = 4;

/** Abstand zwischen zwei Karten. */
const KARTEN_ABSTAND = space.lg;

const S: Record<string, React.CSSProperties> = {
  wrap: { position: "relative" },
  // Das Fenster schneidet ab, die Spur darin wird verschoben. Beides braucht
  // das Paket getrennt — ein einziger Kasten kann nicht zugleich beschneiden
  // und verschoben werden.
  fenster: { overflow: "hidden" },
  spur: { display: "flex", gap: KARTEN_ABSTAND },
  station: {
    // Feste Breite statt Anteil: Eine Karte, die sich die Spur teilt, wird bei
    // zwei Einträgen doppelt so breit wie bei vier — dieselbe Meldung sähe je
    // nach Nachbarschaft anders aus.
    flex: "0 0 clamp(240px, 78vw, 320px)",
    minWidth: 0,
    display: "flex",
  },
  leiste: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    marginTop: space.md,
  },
  punkte: { display: "flex", gap: space.xs, alignItems: "center" },
  punkt: {
    width: 24,
    height: 24,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
  },
  pfeile: { display: "flex", gap: space.sm },
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


/** One hero card at a time, using the municipality's fade and pause contract. */
export default function StorySlider(props: {
  children: React.ReactNode[];
  ariaLabel: string;
  variant?: "strip" | "hero";
  fullWidth?: boolean;
  itemLabel?: string;
  arrows?: boolean;
  autoplay?: boolean;
  labels?: string[];
}) {
  return props.variant === "hero" ? <HeroStorySlider {...props} /> : <ScrollingStorySlider {...props} />;
}

function HeroStorySlider({ children, ariaLabel, labels }: {
  children: React.ReactNode[]; ariaLabel: string; labels?: string[];
}) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  // Hero controls stay minimal; choosing a slide stops automatic rotation.
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const node = root.current;
    if (!node || paused || children.length < 2) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      if (!visible || document.hidden || reduced.matches || node.matches(":hover,:focus-within")) return;
      timer = setTimeout(() => setActive(index => (index + 1) % children.length), 7000);
    };
    const stop = () => clearTimeout(timer);
    let blurFrame: number | undefined;
    const afterBlur = () => { blurFrame = requestAnimationFrame(schedule); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); });
    observer.observe(node);
    node.addEventListener("mouseenter", stop);
    node.addEventListener("mouseleave", schedule);
    node.addEventListener("focusin", stop);
    node.addEventListener("focusout", afterBlur);
    document.addEventListener("visibilitychange", schedule);
    reduced.addEventListener("change", schedule);
    return () => {
      stop(); observer.disconnect();
      if (blurFrame !== undefined) cancelAnimationFrame(blurFrame);
      node.removeEventListener("mouseenter", stop); node.removeEventListener("mouseleave", schedule);
      node.removeEventListener("focusin", stop); node.removeEventListener("focusout", afterBlur);
      document.removeEventListener("visibilitychange", schedule); reduced.removeEventListener("change", schedule);
    };
  }, [active, paused, children.length]);
  return <div ref={root} className={heroStyles.hero} role="region" aria-roledescription="Karussell" aria-label={ariaLabel}>
    <div className={heroStyles.stack}>
      {children.map((child, index) => <div key={index} className={heroStyles.slide} data-active={index === active} aria-hidden={index !== active} inert={index !== active} role="group" aria-roledescription="Folie" aria-label={labels?.[index] ?? `${index + 1} von ${children.length}`}>
        {child}
      </div>)}
    </div>
    <nav className={heroStyles.controls} aria-label="Energiekachel wechseln">
      {children.map((_, index) => <button key={index} type="button" aria-label={labels?.[index] ?? `Kachel ${index + 1}`} aria-pressed={index === active} onClick={() => { setActive(index); setPaused(true); }}><span /></button>)}
    </nav>
  </div>;
}
