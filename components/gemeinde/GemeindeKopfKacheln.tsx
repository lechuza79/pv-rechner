"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { GemeindePaket } from "../../lib/gemeinde-paket";

/**
 * The right-hand stack in the hero: the town's best ranking and a rotating
 * monitor card (feed-in value, solar output now, the month's curve). Port of
 * the approved prototype's behaviour (variant3.js): the card rotates every few
 * seconds, pauses on hover/focus, off screen, in a hidden tab and for reduced
 * motion; the dots switch it by hand; a click opens the full monitor.
 *
 * The card renders inline — the prototype put it in a frame, which loaded a
 * whole second page before anything showed.
 */
const KopfMonitor = dynamic(() => import("./GemeindeMonitor").then((m) => m.GemeindeKopfMonitor), { ssr: false });

const WIDGETS = [
  { id: "feed-in-value", label: "Einspeisevergütung" },
  { id: "live", label: "Solarleistung heute" },
  { id: "radial", label: "Solarerzeugung im Tagesverlauf" },
];

export type KopfRang = { titel: string; text: string; bild: string | null };

export default function GemeindeKopfKacheln({ paket, name, rang }: { paket: GemeindePaket; name: string; rang: KopfRang | null }) {
  const karte = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [pausiert, setPausiert] = useState(false);
  const indexRef = useRef(0);
  const waehlenRef = useRef<(i: number) => void>(() => {});

  useEffect(() => {
    const hero = karte.current;
    if (!hero) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let sichtbar = true;
    const reduziert = matchMedia("(prefers-reduced-motion: reduce)");
    const setzen = (i: number) => {
      indexRef.current = i;
      setIndex(i);
    };
    const planen = () => {
      clearTimeout(timer);
      if (!document.hidden && sichtbar && !reduziert.matches && !hero.matches(":hover,:focus-within")) {
        timer = setTimeout(
          () => {
            setzen((indexRef.current + 1) % WIDGETS.length);
            planen();
          },
          indexRef.current === 2 ? 22000 : 7000,
        );
      }
    };
    waehlenRef.current = (i) => {
      setzen(i);
      planen();
    };
    const stop = () => {
      clearTimeout(timer);
      setPausiert(true);
    };
    const weiter = () => {
      setPausiert(false);
      setTimeout(planen, 0);
    };
    const beobachter = new IntersectionObserver(([e]) => {
      sichtbar = e.isIntersecting;
      planen();
    });
    beobachter.observe(hero);
    hero.addEventListener("mouseenter", stop);
    hero.addEventListener("mouseleave", weiter);
    hero.addEventListener("focusin", stop);
    hero.addEventListener("focusout", weiter);
    document.addEventListener("visibilitychange", planen);
    reduziert.addEventListener("change", planen);
    planen();
    return () => {
      clearTimeout(timer);
      beobachter.disconnect();
      hero.removeEventListener("mouseenter", stop);
      hero.removeEventListener("mouseleave", weiter);
      hero.removeEventListener("focusin", stop);
      hero.removeEventListener("focusout", weiter);
      document.removeEventListener("visibilitychange", planen);
      reduziert.removeEventListener("change", planen);
    };
  }, []);

  const zumMonitor = (e: React.MouseEvent) => {
    e.preventDefault();
    history.replaceState(null, "", "#atlas-data");
    const reduziert = matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelector("#atlas-data")?.scrollIntoView({ behavior: reduziert ? "instant" : "smooth" });
  };

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
      <aside ref={karte} className="v3-hero-card v3-monitor-card" data-ready="true">
        <a href="#atlas-data" onClick={zumMonitor} aria-label={`Zum Energiemonitor ${name}`} className="hero-monitor-link gemeinde-kopf-monitor gemeinde-widgets">
          <KopfMonitor paket={paket} widget={WIDGETS[index].id} paused={pausiert} />
        </a>
        <nav aria-label="Energiekachel">
          {WIDGETS.map((w, i) => (
            <button key={w.id} type="button" aria-label={w.label} aria-pressed={i === index} onClick={() => waehlenRef.current(i)}>
              <span />
            </button>
          ))}
        </nav>
      </aside>
    </div>
  );
}
