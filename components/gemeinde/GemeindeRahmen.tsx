"use client";

import { useEffect, useRef } from "react";

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
}: {
  src: string;
  title: string;
  /** postMessage type the view reports its layout with. */
  nachricht: string;
  startHoehe: number;
  /** The story strip opens a full-screen reader inside the frame. */
  vollbild?: boolean;
}) {
  const ref = useRef<HTMLIFrameElement>(null);

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
      src={src}
      title={title}
      loading="lazy"
      style={{ display: "block", width: "100%", height: startHoehe, border: 0, background: "transparent" }}
    />
  );
}
