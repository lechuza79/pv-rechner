"use client";
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import './DesignHeader.css';
import Logo from './Logo';

const groups = [
  { title: 'Rechner', links: [['Passende PV-Anlage finden', '/photovoltaik-rechner'], ['PV-Anlage durchrechnen', '/photovoltaik-rechner?direkt=1'], ['Balkonkraftwerk', '/balkonkraftwerk/rechner'], ['Wärmepumpe', '/waermepumpe-rechner'], ['Klimaanlage', '/klimaanlage-stromkosten'], ['Einspeisevergütung', '/einspeiseverguetung-rechner']] },
  { title: 'Förderung', links: [['Photovoltaik', '/photovoltaik-foerderung'], ['Balkonkraftwerk', '/balkonkraftwerk/foerderung'], ['Wärmepumpe', '/ratgeber/waermepumpe-foerderung']] },
  { title: 'Themen & Ratgeber', links: [['Alle Ratgeber', '/ratgeber'], ['Balkonkraftwerk', '/balkonkraftwerk']] },
  { title: 'Energiemonitor', links: [['Strommix Deutschland', '/strommix-deutschland'], ['Live-Simulation', '/pv-simulation'], ['Energie-Widgets', '/energie-widgets']] },
];

/** The shared draft navigation, with existing destinations and no prototype-only actions. */
export default function DesignHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); ref.current?.querySelectorAll('details').forEach(item => { item.open = false; }); };
  useEffect(() => {
    const outside = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) close(); };
    document.addEventListener('click', outside);
    return () => document.removeEventListener('click', outside);
  }, []);
  return <header ref={ref} className="sc-design-header" onKeyDown={event => { if (event.key === 'Escape') { close(); toggle.current?.focus(); } }}>
    <Link href="/" aria-label="Solar Check – Startseite"><Logo width={140} /></Link>
    <button ref={toggle} className="sc-design-menu-toggle" aria-expanded={open} aria-controls="sc-design-design-navigation" onClick={() => setOpen(!open)}>{open ? 'Schließen ×' : 'Menü ☰'}</button>
    <nav id="sc-design-design-navigation" className={open ? 'is-open' : ''} aria-label="Hauptnavigation">
      {groups.map((group, i) => <div className="sc-design-nav-entry" key={group.title}>
        {i === 3 && <Link className="sc-design-atlas-nav" href="/solar-atlas">Energie-Atlas</Link>}
        <details onToggle={event => { const active = event.currentTarget; if (active.open) ref.current?.querySelectorAll('details').forEach(item => { if (item !== active) item.open = false; }); }}>
          <summary>{group.title} <span aria-hidden="true">⌄</span></summary>
          <div className="sc-design-nav-panel">{group.links.map(([title, href]) => <Link key={href} href={href} aria-current={href === pathname ? 'page' : undefined} onClick={close}>{title}</Link>)}</div>
        </details>
      </div>)}
    </nav>
  </header>;
}
