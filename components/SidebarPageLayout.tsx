'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import SidebarNavigation from './SidebarNavigation';
import styles from './SidebarPageLayout.module.css';

/** Shared sidebar follows the content surface without owning page sections. */
export default function SidebarPageLayout({ children, links, activeHref, label, enabled = true, darkHero = false, alignWith, navigationControls }: {
  children: ReactNode;
  navigationControls?: ReactNode;
  links: readonly { href: string; label: string }[];
  activeHref: string;
  label: string;
  enabled?: boolean;
  darkHero?: boolean;
  alignWith?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!enabled || !darkHero || !root.current || !sidebar.current) return;
    const container = root.current;
    const rail = sidebar.current;
    const alignment = alignWith ? container.querySelector(alignWith) : null;
    const boundary = container.querySelector('[data-sidebar-light-start]');
    if (!boundary) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (alignment) container.style.setProperty('--sidebar-start', `${alignment.getBoundingClientRect().top - container.getBoundingClientRect().top}px`);
      const edge = boundary.getBoundingClientRect().top;
      const box = rail.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (box.bottom - edge) / Math.max(1, box.height)));
      rail.style.setProperty('--sidebar-light', `${progress * 100}%`);
      container.style.setProperty('--dark-height', `${edge - container.getBoundingClientRect().top}px`);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const resize = new ResizeObserver(schedule);
    resize.observe(container);
    resize.observe(boundary);
    if (alignment) resize.observe(alignment);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    update();
    return () => { resize.disconnect(); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); cancelAnimationFrame(frame); };
  }, [enabled, darkHero, alignWith]);
  if (!enabled) return <>{children}</>;
  return <div ref={root} className={styles.surface} data-dark-hero={darkHero || undefined}>
    <div className={styles.layout}>
      <aside ref={sidebar} className={styles.sidebar}><SidebarNavigation links={links} activeHref={activeHref} label={label}>{navigationControls}</SidebarNavigation></aside>
      <div className={styles.content}>{children}</div>
    </div>
  </div>;
}
