"use client";
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Header from './SharedSiteHeader';
import Logo from './Logo';

const groups = [
  { title: 'Rechner', links: [['Passende PV-Anlage finden', '/pv-bedarf-berechnen'], ['PV-Anlage durchrechnen', '/photovoltaik-rechner'], ['Balkonkraftwerk', '/balkonkraftwerk/rechner'], ['Wärmepumpe', '/waermepumpe-rechner'], ['Klimaanlage', '/klimaanlage-stromkosten'], ['Einspeisevergütung', '/einspeiseverguetung-rechner']] },
  { title: 'Förderung', links: [['Photovoltaik', '/photovoltaik-foerderung'], ['Balkonkraftwerk', '/balkonkraftwerk/foerderung'], ['Wärmepumpe', '/ratgeber/waermepumpe-foerderung']] },
  { title: 'Themen & Ratgeber', links: [['Alle Ratgeber', '/ratgeber'], ['Balkonkraftwerk', '/balkonkraftwerk']] },
  { title: 'Energiemonitor', links: [['Strommix Deutschland', '/strommix-deutschland'], ['Live-Simulation', '/pv-simulation'], ['Energie-Widgets', '/energie-widgets']] },
];

/** The shared draft navigation, with existing destinations and no prototype-only actions. */
function DesignHeader() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); ref.current?.querySelectorAll('details').forEach(item => { item.open = false; }); };
  useEffect(() => {
    const outside = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) close(); };
    document.addEventListener('click', outside);
    return () => document.removeEventListener('click', outside);
  }, []);
  return <header ref={ref} className="wp-design-header" onKeyDown={event => { if (event.key === 'Escape') { close(); toggle.current?.focus(); } }}>
    <Link href="/" aria-label="Solar Check – Startseite"><Logo width={140} /></Link>
    <button ref={toggle} className="wp-menu-toggle" aria-expanded={open} aria-controls="wp-design-navigation" onClick={() => setOpen(!open)}>{open ? 'Schließen ×' : 'Menü ☰'}</button>
    <nav id="wp-design-navigation" className={open ? 'is-open' : ''} aria-label="Hauptnavigation">
      {groups.map((group, i) => <div className="wp-nav-entry" key={group.title}>
        {i === 3 && <Link className="wp-atlas-nav" href="/solar-atlas">Solar-Atlas</Link>}
        <details onToggle={event => { const active = event.currentTarget; if (active.open) ref.current?.querySelectorAll('details').forEach(item => { if (item !== active) item.open = false; }); }}>
          <summary>{group.title} <span aria-hidden="true">⌄</span></summary>
          <div className="wp-nav-panel">{group.links.map(([title, href]) => <Link key={href} href={href} aria-current={href === '/waermepumpe-rechner' ? 'page' : undefined} onClick={close}>{title}</Link>)}</div>
        </details>
      </div>)}
    </nav>
  </header>;
}

export default function HeatPumpDesignHeader() {
  return usePathname() === '/waermepumpe-rechner' ? <DesignHeader /> : <Header />;
}
