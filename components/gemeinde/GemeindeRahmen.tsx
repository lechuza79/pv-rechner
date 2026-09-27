"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A frame for one of the page's embedded views (story strip, energy monitor),
 * with the approved prototype's behaviour (story-integration.js): it takes
 * the height the view reports, and while the story reader is open it covers
 * the viewport so the reader can be a full-screen modal.
 */
export default function GemeindeRahmen({
  src,
  title,
  nachricht,
  startHoehe,
  vollbild = false,
  durchreichen = [],
}: {
  src: string;
  title: string;
  /** postMessage type the view reports its layout with. */
  nachricht: string;
  startHoehe: number;
  /** The story strip opens a full-screen reader inside the frame. */
  vollbild?: boolean;
  /** Page parameters the view reads too (a shared story link opens its story). */
  durchreichen?: string[];
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const los = useNachDerSzene(ref);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    const section = frame.closest("section") as HTMLElement | null;
    let modalOpen = false;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    let lastHeight = startHoehe;
    const applyModal = (open: boolean) => {
      if (open === modalOpen) return;
      modalOpen = open;
      if (section) {
        section.style.position = open ? "relative" : "";
        section.style.zIndex = open ? "2147483647" : "";
        const content = section.closest(".atlas-content") as HTMLElement | null;
        if (content) content.style.zIndex = open ? "2147483647" : "";
      }
      frame.style.position = open ? "fixed" : "static";
      frame.style.inset = open ? "0" : "auto";
      frame.style.zIndex = open ? "2147483647" : "auto";
      frame.style.height = open ? "100dvh" : `${lastHeight}px`;
      document.body.style.overflow = open ? "hidden" : "";
      frame.style.backdropFilter = open ? "blur(3px)" : "";
      frame.style.background = open ? "rgba(0,8,10,.48)" : "transparent";
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.type !== nachricht) return;
      const height = Number(event.data.height);
      lastHeight = Math.min(16000, Math.max(300, Number.isFinite(height) ? Math.ceil(height) + 4 : startHoehe));
      clearTimeout(closeTimer);
      if (vollbild && event.data.modal === true) applyModal(true);
      else if (modalOpen) closeTimer = setTimeout(() => applyModal(false), 240);
      else frame.style.height = `${lastHeight}px`;
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(closeTimer);
    };
  }, [nachricht, startHoehe, vollbild]);

  return (
    <iframe
      ref={ref}
      src={los ? mitParametern(src, durchreichen) : undefined}
      title={title}
      style={{ display: "block", width: "100%", height: startHoehe, border: 0, background: "transparent" }}
    />
  );
}

/**
 * When a frame may start loading. Not lazily on scroll (the delay visitors
 * saw), but not during the hero scene's start-up either: a frame is a whole
 * page with its own scripts, and loading it then pushed the scene back by
 * 1–1.5 s. So: once the scene has drawn its first frame, when scrolled
 * towards, or after four seconds — whichever comes first.
 */
function useNachDerSzene(ref: React.RefObject<HTMLElement | null>) {
  const [los, setLos] = useState(false);
  useEffect(() => {
    if (los) return;
    const start = () => setLos(true);
    const seite = document.querySelector<HTMLElement>(".solar-page");
    const szene = document.querySelector<HTMLElement>(".hero .scene");
    const bereit = () => szene?.dataset.unifiedReady === "true" || seite?.dataset.sceneBoot === "failed";
    if (!szene || bereit()) return start();
    const mo = new MutationObserver(() => bereit() && start());
    mo.observe(seite ?? szene, { attributes: true, subtree: true, attributeFilter: ["data-unified-ready", "data-scene-boot"] });
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

function mitParametern(src: string, namen: string[]): string {
  if (!namen.length || typeof location === "undefined") return src;
  const url = new URL(src, location.origin);
  const seite = new URLSearchParams(location.search);
  for (const n of namen) {
    const wert = seite.get(n);
    if (wert) url.searchParams.set(n, wert);
  }
  return url.pathname + url.search;
}
