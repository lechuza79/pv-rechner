"use client";
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { IconChevronLeft, IconChevronRight } from './Icons';
import { iconSizes, space } from '../lib/theme';

/** One product list, driven by Embla; optionally becomes a desktop sidebar. */
export default function AffiliateCarousel({ children, label, desktopSidebar = false, desktopSlides, previousLabel = "Vorherige Angebote" }: { children: ReactNode; label: string; desktopSidebar?: boolean; desktopSlides?: number; previousLabel?: string }) {
  const [sidebarActive, setSidebarActive] = useState(false);
  const [ref, api] = useEmblaCarousel({ align: 'start', containScroll: 'trimSnaps', active: !sidebarActive });
  useEffect(() => {
    if (!api || !desktopSidebar) return;
    const shell = api.rootNode().closest<HTMLElement>('.sc-calculator-content[data-calculator-offers="true"]');
    if (!shell) return;
    const sync = () => setSidebarActive(shell.clientWidth >= 1188);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [api, desktopSidebar]);
  const [bounds, setBounds] = useState({ prev: false, next: false });
  useEffect(() => {
    if (!api) return;
    const sync = () => {
      const viewport = api.rootNode();
      const overflows = api.containerNode().scrollWidth > viewport.clientWidth + 1;
      setBounds({ prev: overflows && api.canScrollPrev(), next: overflows && api.canScrollNext() });
    };
    sync(); api.on('select', sync).on('reInit', sync);
    return () => { api.off('select', sync).off('reInit', sync); };
  }, [api]);
  return <div className="wp-product-carousel-frame" data-ready={!!api} data-desktop-slides={desktopSlides} style={{"--carousel-desktop-slides":desktopSlides,"--carousel-gap":`${space.md}px`} as CSSProperties} data-scroll-prev={bounds.prev} data-scroll-next={bounds.next}>
    {(bounds.prev || bounds.next) && <nav className="wp-product-navigation" aria-label={label}>
      <button type="button" aria-label={previousLabel} disabled={!bounds.prev} onClick={() => api?.scrollPrev()}><IconChevronLeft size={iconSizes.sm} /></button>
      <button type="button" aria-label={label} disabled={!bounds.next} onClick={() => api?.scrollNext()}><IconChevronRight size={iconSizes.sm} /></button>
    </nav>}
    <div ref={ref} className="wp-product-carousel" style={{ overflow: 'hidden' }}>
      <ul className="wp-geraete-reihe" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: space.md }}>{children}</ul>
    </div>
  </div>;
}
