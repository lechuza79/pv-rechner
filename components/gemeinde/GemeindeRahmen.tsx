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
  const placeholder = useRef<HTMLDivElement>(null);
  const los = useNachDerSzene(ref);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    const section = frame.closest("section") as HTMLElement | null;
    let modalOpen = false;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    let lastHeight = startHoehe;
    let previousOverflow = "";
    let previousAnchor = "";
    let parentScroll = 0;
    let layoutRoot: HTMLElement | null = null;
    let layoutStyle: string | null = null;
    let contentScroll = { x: 0, y: 0 };
    const applyModal = (open: boolean) => {
      if (open === modalOpen) return;
      const bounds = frame.getBoundingClientRect();
      const contentOffset = Math.max(0, -bounds.top);
      if (open) {
        parentScroll = window.scrollY;
        previousAnchor = document.documentElement.style.overflowAnchor;
        // Moving the frame out of flow must not trigger browser scroll anchoring.
        document.documentElement.style.overflowAnchor = "none";
        previousOverflow = document.body.style.overflow;
        contentScroll = { x: frame.contentWindow?.scrollX ?? 0, y: frame.contentWindow?.scrollY ?? 0 };
        layoutRoot = frame.contentDocument?.querySelector<HTMLElement>("[data-embed-layout-root]") ?? null;
        if (layoutRoot) {
          layoutStyle = layoutRoot.getAttribute("style");
          const layoutBounds = layoutRoot.getBoundingClientRect();
          // Promote only the dialog viewport. Keep the underlying content at
          // its original width and screen position instead of reflowing it.
          layoutRoot.style.position = "fixed";
          layoutRoot.style.left = `${bounds.left + layoutBounds.left}px`;
          layoutRoot.style.top = `${bounds.top + layoutBounds.top}px`;
          layoutRoot.style.margin = "0";
          layoutRoot.style.width = `${layoutBounds.width}px`;
          layoutRoot.style.maxWidth = "none";
        }
        // Keep the document height stable when the frame leaves normal flow.
        if (placeholder.current) placeholder.current.style.height = `${lastHeight}px`;
      }
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
      document.body.style.overflow = open ? "hidden" : previousOverflow;
      if (open) {
        frame.contentWindow?.scrollTo({ top: layoutRoot ? 0 : contentOffset, behavior: "instant" });
      } else {
        if (layoutRoot) {
          if (layoutStyle === null) layoutRoot.removeAttribute("style");
          else layoutRoot.setAttribute("style", layoutStyle);
          layoutRoot = null;
        }
        if (placeholder.current) placeholder.current.style.height = "";
        frame.contentWindow?.scrollTo({ left: contentScroll.x, top: contentScroll.y, behavior: "instant" });
        window.scrollTo({ top: parentScroll, behavior: "instant" });
        document.documentElement.style.overflowAnchor = previousAnchor;
      }
      frame.style.backdropFilter = open ? "blur(3px)" : "";
      frame.style.background = open ? "rgba(0,8,10,.48)" : "transparent";
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.type !== nachricht) return;
      const height = Number(event.data.height);
      // Modal viewport measurements must not replace the normal-flow height.
      if (!modalOpen) lastHeight = Math.min(16000, Math.max(300, Number.isFinite(height) ? Math.ceil(height) + 4 : startHoehe));
      clearTimeout(closeTimer);
      if (vollbild && event.data.modal === true) applyModal(true);
      else if (modalOpen) closeTimer = setTimeout(() => applyModal(false), 240);
      else frame.style.height = `${lastHeight}px`;
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(closeTimer);
      if (modalOpen) applyModal(false);
    };
  }, [nachricht, startHoehe, vollbild]);

  return (
    <div ref={placeholder}>
      <iframe
        ref={ref}
        src={los ? mitParametern(src, durchreichen) : undefined}
        title={title}
        style={{ display: "block", width: "100%", height: startHoehe, border: 0, background: "transparent" }}
      />
    </div>
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
