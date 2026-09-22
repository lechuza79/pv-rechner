"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { GemeindePaket } from "../../lib/gemeinde-paket";

/**
 * The story strip and the energy monitor, rendered inline on the page.
 *
 * The prototype ran both in frames, each a whole second page with its own
 * scripts and fonts, started only when scrolled near — the delay visitors saw.
 * Inline they render in the browser only: their chart geometry differs
 * between server and browser in the last digit, which React reports as a
 * hydration mismatch; the page carries their text for crawlers itself. The
 * reserved height keeps the page from jumping.
 *
 * They start once the hero scene has drawn its first frame. Built during its
 * start-up they competed with it for the main thread — measured, the scene
 * came up 1–1.5 s later than on the homepage. Anyone scrolling towards them
 * gets them at once, and after four seconds they start regardless.
 */
const Insights = dynamic(() => import("./GemeindeInsights"), { ssr: false, loading: () => <div style={{ minHeight: 560 }} /> });
const Monitor = dynamic(() => import("./GemeindeMonitor"), { ssr: false, loading: () => <div style={{ minHeight: 1400 }} /> });

function useNachDerSzene(ref: React.RefObject<HTMLDivElement | null>) {
  const [los, setLos] = useState(false);
  useEffect(() => {
    if (los) return;
    const start = () => setLos(true);
    const szene = document.querySelector<HTMLElement>(".hero .scene");
    const bereit = () => szene?.dataset.unifiedReady === "true" || document.querySelector<HTMLElement>(".solar-page")?.dataset.sceneBoot === "failed";
    if (!szene || bereit()) return start();
    const mo = new MutationObserver(() => bereit() && start());
    mo.observe(document.querySelector(".solar-page") ?? szene, { attributes: true, subtree: true, attributeFilter: ["data-unified-ready", "data-scene-boot"] });
    const io = new IntersectionObserver(([e]) => e.isIntersecting && start(), { rootMargin: "1200px 0px" });
    if (ref.current) io.observe(ref.current);
    const timer = setTimeout(start, 4000);
    return () => {
      mo.disconnect();
      io.disconnect();
      clearTimeout(timer);
    };
  }, [los, ref]);
  return los;
}

export function GemeindeGeschichten({ paket, name }: { paket: GemeindePaket; name: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const los = useNachDerSzene(ref);
  return (
    <div ref={ref} className="gemeinde-widgets gemeinde-geschichten">
      {los ? <Insights stories={paket.stories as never} name={name} surfaceScheme="dark" showHeader={false} embedded /> : <div style={{ minHeight: 560 }} />}
    </div>
  );
}

export function GemeindeEnergiemonitor({ paket }: { paket: GemeindePaket }) {
  const ref = useRef<HTMLDivElement>(null);
  const los = useNachDerSzene(ref);
  return (
    <div ref={ref} className="gemeinde-widgets">
      {los ? <Monitor paket={paket} /> : <div style={{ minHeight: 1400 }} />}
    </div>
  );
}
