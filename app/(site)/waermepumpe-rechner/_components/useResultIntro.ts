"use client";
import { useEffect, useRef, useState } from 'react';

/** Run the result introduction once per visit, only while the page is visible. */
export function useResultIntro(enabled: boolean, revision = 0) {
  const anchor = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'count' | 'solar' | 'race'>('count');
  useEffect(() => {
    setProgress(0);
    setStage('count');
    if (!enabled) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgress(1);
      setStage('race');
      return;
    }
    let frame = 0;
    let elapsed = 0;
    let last = 0;
    let started = false;
    let scrolling = false;
    const startRace = () => {
      if (!started) return;
      scrolling = true;
      setStage('race');
    };
    let lastScrollY = window.scrollY;
    const onScroll = () => {
      if (window.scrollY > lastScrollY + 1) startRace();
      lastScrollY = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    const onWheel = (event: WheelEvent) => { if (event.deltaY > 0) startRace(); };
    const onKey = (event: KeyboardEvent) => {
      if (['ArrowDown', 'PageDown', 'End', ' '].includes(event.key)) startRace();
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchmove', startRace, { passive: true });
    window.addEventListener('keydown', onKey);
    const tick = (now: number) => {
      if (!document.hidden) elapsed += last ? Math.min(now - last, 64) : 0;
      last = now;
      setProgress(1 - Math.pow(1 - Math.min(elapsed / 1600, 1), 3));
      setStage(scrolling ? 'race' : elapsed < 1600 ? 'count' : revision === 0 && elapsed < 6600 ? 'solar' : 'race');
      if (elapsed < 6600) frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(entries => {
      if (!started && entries.some(entry => entry.intersectionRatio >= .6)) {
        started = true;
        frame = requestAnimationFrame(tick);
        observer.disconnect();
      }
    }, { threshold: .6 });
    if (anchor.current) observer.observe(anchor.current);
    return () => {
      observer.disconnect(); cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchmove', startRace);
      window.removeEventListener('keydown', onKey);
    };
  }, [enabled, revision]);
  return { anchor, progress, stage };
}
