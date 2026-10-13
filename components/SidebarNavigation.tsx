"use client";
import Link, { useLinkStatus } from "next/link";
import { LoadingDots } from "./LoadingDots";
import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Auswahl } from "./Auswahl";
import styles from "./SidebarNavigation.module.css";

function NavigationLabel({label}:{label:string}) {
  const {pending}=useLinkStatus();
  return <><span>{label}</span>{pending && <span aria-live="polite" aria-label={`${label} wird geladen`}><LoadingDots/></span>}</>;
}

/** Section links with an optional contextual control, separate from page content. */
export default function SidebarNavigation({links,activeHref,children,label}:{
  links:readonly {href:string;label:string}[];activeHref:string;children?:ReactNode;label:string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const collapsed = Boolean(children) || links.length > 2;
  const activeLabel = links.find(link => link.href === activeHref)?.label ?? label;
  return <nav className={styles.navigation} aria-label={label} data-collapsed={collapsed || undefined}>
    <div className={styles.links}>{links.map(link=><Link key={link.href} href={link.href} scroll={false} prefetch={true}
      aria-current={activeHref===link.href ? "page" : undefined}><NavigationLabel label={link.label}/></Link>)}</div>
    {collapsed && <div className={styles.mobileMenu} aria-busy={pending}>
      <Auswahl titel={activeLabel} aktiv={activeHref} breite={0} pfeile={false}
        eintraege={links.map(link => ({schluessel:link.href, name:link.label}))}
        onWahl={href => startTransition(() => router.push(href, {scroll:false}))}/>
      {pending && <span className={styles.pending} role="status" aria-label="Inhalte werden geladen"><LoadingDots/></span>}
    </div>}
    {children && <div className={styles.controls}>{children}</div>}
  </nav>;
}
