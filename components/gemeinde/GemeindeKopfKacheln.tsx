"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The right-hand stack in the hero: the town's best ranking and a rotating
 * monitor card (feed-in value, solar output now, today's curve). Port of the
 * approved prototype's behaviour (variant3.js): the card rotates every few
 * seconds, pauses on hover/focus, when off screen, when the tab is hidden and
 * for reduced motion; the dots switch it by hand.
 */
/** Wie lange das fertige Bild noch steht, bevor die nächste Kachel kommt. */
const RUHE_NACH_LAUF = 2200;

const WIDGETS = [
  { id: "feed-in-value", label: "Einspeisevergütung" },
  { id: "live", label: "Solarleistung heute" },
  { id: "radial", label: "Solarerzeugung im Tagesverlauf" },
];

export type KopfRang = { titel: string; text: string; bild: string | null };

export default function GemeindeKopfKacheln({ ags, name, rang }: { ags: string; name: string; rang: KopfRang | null }) {
  const karte = useRef<HTMLElement>(null);
  const rahmen = useRef<HTMLIFrameElement>(null);
  const [index, setIndex] = useState(0);
  const [bereit, setBereit] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    const hero = karte.current;
    const frame = rahmen.current;
    if (!hero || !frame) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let sichtbar = true;
    const reduziert = matchMedia("(prefers-reduced-motion: reduce)");
    const senden = (i: number) => {
      indexRef.current = i;
      setIndex(i);
      frame.contentWindow?.postMessage({ type: "atlas-hero-widget", widget: WIDGETS[i].id }, location.origin);
    };
    const planen = (wartezeit?: number) => {
      clearTimeout(timer);
      if (!document.hidden && sichtbar && !reduziert.matches && !hero.matches(":hover,:focus-within")) {
        timer = setTimeout(
          () => {
            senden((indexRef.current + 1) % WIDGETS.length);
            planen();
          },
          // Der Tagesverlauf läuft, bis er fertig ist, und meldet sich dann
          // selbst (siehe unten). Die Zeit hier ist nur die Notbremse, falls
          // die Meldung ausbleibt — vorher wurde nach fester Zeit mitten in
          // die Bewegung hinein weitergeschaltet.
          wartezeit ?? (indexRef.current === 2 ? 30000 : 7000),
        );
      }
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
      if (event.data?.type === "atlas-hero-ready") setBereit(true);
      // „Bewegung durch": Das Bild bleibt noch einen Moment stehen, dann geht
      // es weiter. Ohne diese Ruhe verschwindet der fertige Tagesverlauf in
      // derselben Sekunde, in der er zu Ende gelaufen ist.
      if (event.data?.type === "atlas-hero-finished" && WIDGETS[indexRef.current]?.id === event.data.widget) planen(RUHE_NACH_LAUF);
      if (event.data?.type === "atlas-hero-open-monitor") {
        history.replaceState(null, "", "#atlas-data");
        document.querySelector("#atlas-data")?.scrollIntoView({ behavior: reduziert.matches ? "instant" : "smooth" });
      }
    };
    const onLoad = () => {
      senden(indexRef.current);
      planen();
    };
    const stop = () => clearTimeout(timer);
    // Ereignis-Hörer bekommen ein Ereignis übergeben; die Wartezeit von
    // `planen` darf das nicht als Zahl missverstehen.
    const neuPlanen = () => planen();
    const spaeter = () => setTimeout(neuPlanen, 0);
    const beobachter = new IntersectionObserver(([e]) => {
      sichtbar = e.isIntersecting;
      planen();
    });
    beobachter.observe(hero);
    window.addEventListener("message", onMessage);
    frame.addEventListener("load", onLoad);
    hero.addEventListener("mouseenter", stop);
    hero.addEventListener("mouseleave", neuPlanen);
    hero.addEventListener("focusin", stop);
    hero.addEventListener("focusout", spaeter);
    document.addEventListener("visibilitychange", neuPlanen);
    reduziert.addEventListener("change", neuPlanen);
    (hero as HTMLElement & { __waehlen?: (i: number) => void }).__waehlen = (i: number) => {
      senden(i);
      planen();
    };
    return () => {
      clearTimeout(timer);
      beobachter.disconnect();
      window.removeEventListener("message", onMessage);
      frame.removeEventListener("load", onLoad);
      hero.removeEventListener("mouseenter", stop);
      hero.removeEventListener("mouseleave", neuPlanen);
      hero.removeEventListener("focusin", stop);
      hero.removeEventListener("focusout", spaeter);
      document.removeEventListener("visibilitychange", neuPlanen);
      reduziert.removeEventListener("change", neuPlanen);
    };
  }, []);

  const waehlen = (i: number) => (karte.current as (HTMLElement & { __waehlen?: (i: number) => void }) | null)?.__waehlen?.(i);

  return (
    <div className="v3-hero-stack">
      {rang && (
        <a className="v3-rank-intro" href="#atlas-ranking">
          {rang.bild && <img src={rang.bild} alt="" width={80} height={80} />}
          <div>
            <strong>{rang.titel}</strong>
            <span>{rang.text}</span>
          </div>
        </a>
      )}
      <aside ref={karte} className="v3-hero-card v3-monitor-card" data-ready={bereit ? "true" : undefined}>
        <iframe ref={rahmen} title={`Energiemonitor ${name}`} src={`/embed/gemeinde/${ags}/kopf?widget=${WIDGETS[0].id}`} />
        <nav aria-label="Energiekachel">
          {WIDGETS.map((w, i) => (
            <button key={w.id} type="button" aria-label={w.label} aria-pressed={i === index} onClick={() => waehlen(i)}>
              <span />
            </button>
          ))}
        </nav>
      </aside>
    </div>
  );
}
