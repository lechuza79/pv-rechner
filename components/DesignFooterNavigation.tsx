"use client";
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';

type Entry = { href: string; label: string };
/** Reorganize existing released links into the draft's four columns. */
export default function DesignFooterNavigation({ groups, atlasLinks, children }: { groups: { label: string; links: Entry[] }[]; atlasLinks: Entry[]; children: ReactNode }) {
  if (usePathname() !== '/waermepumpe-rechner') return children;
  const all = groups.flatMap(group => group.links);
  const calculators = new Set(['/photovoltaik-rechner', '/balkonkraftwerk/rechner', '/waermepumpe-rechner', '/klimaanlage-stromkosten', '/pv-bedarf-berechnen', '/einspeiseverguetung-rechner', '/pv-simulation']);
  const knowledge = new Set(['/balkonkraftwerk', '/balkonkraftwerk/foerderung', '/balkonkraftwerk/ratgeber/anmelden', '/balkonkraftwerk/ratgeber/mit-speicher', '/photovoltaik-foerderung', '/ratgeber', '/glossar']);
  const energy = new Set(['/strommix-deutschland', '/atomstrom-import', '/photovoltaik-bestand-deutschland', '/datenstand']);
  const legal = new Set(['/impressum', '/datenschutz']);
  const columns = [
    { title: 'Rechner', links: all.filter(item => calculators.has(item.href)) },
    { title: 'Themen & Förderung', links: all.filter(item => knowledge.has(item.href)) },
    { title: 'Atlas & Energiemonitor', links: [...atlasLinks.filter(item => item.href === '/solar-atlas'), ...all.filter(item => energy.has(item.href))] },
    { title: 'Solar Check & Weiterverwenden', links: all.filter(item => !calculators.has(item.href) && !knowledge.has(item.href) && !energy.has(item.href) && !legal.has(item.href)) },
  ];
  return <>
    <nav className="wp-footer-navigation" aria-label="Fußnavigation">{columns.map(column => <section key={column.title}><h2>{column.title}</h2>{column.links.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}</section>)}</nav>
    <div className="wp-footer-regions">{atlasLinks.filter(item => item.href !== '/solar-atlas').map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}</div>
    <div className="wp-footer-legal">{all.filter(item => legal.has(item.href)).map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}</div>
  </>;
}
