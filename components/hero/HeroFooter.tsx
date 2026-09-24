"use client";
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import Link from 'next/link';
import Logo from '../Logo';
import HeroTrustBox from './HeroTrustBox';
import { footerGroups } from './footer-groups';
import './footer.css';

/** Shared Hero Stage footer, initially enabled for the heat-pump preview. */
export default function HeroFooter({ children, regionalLinks }: { children: ReactNode; regionalLinks: { href: string; label: string }[] }) {
  if (usePathname() !== '/waermepumpe-rechner') return children;
  return <div className="hero-footer-root">
    <HeroTrustBox />
    <footer className="sc-footer"><div className="sc-footer-wrap">
      <Link className="sc-footer-brand" href="/" aria-label="Solar Check – Startseite"><Logo width={150} /></Link>
      <p className="sc-footer-tagline">Dein Dach. Deine Energie.</p>
      <nav className="sc-footer-grid" aria-label="Fußnavigation">{footerGroups.map(([title, links]) => <section key={title}>
        <h2>{title}</h2>{links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
      </section>)}</nav>
      <div className="sc-footer-regions">{regionalLinks.filter(link => link.href !== '/solar-atlas').map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}</div>
      <div className="sc-footer-legal"><Link href="/impressum">Impressum</Link><Link href="/datenschutz">Datenschutz</Link></div>
      <p className="sc-footer-disclaimer">Alle Berechnungen und Angaben sind unverbindliche Näherungswerte ohne Anspruch auf Richtigkeit, Aktualität oder Vollständigkeit und stellen keine Rechts-, Steuer- oder Anlageberatung dar.</p>
    </div></footer>
  </div>;
}
