"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "./Logo";
import { IconUser, IconMenu, IconClose, IconChevronDown } from "./Icons";
import { v, iconSizes } from "../lib/theme";
import { useAuth, signOut } from "../lib/auth";
import ThemeController from "./ThemeController";

interface HeaderProps {
  onLoginClick?: () => void;
  onLogoutClick?: () => void;
  activePage?: string;
}

interface NavItem {
  href: string;
  label: string;
  desc: string;
  page: string;
}

// All calculators grouped under the "Rentabilität berechnen" dropdown. Sub-labels
// carry the SEO keywords (Photovoltaik-Rechner, Wärmepumpen-Rechner …) so internal
// anchor text matches each page's target term.
const RECHNER_ITEMS: NavItem[] = [
  { href: "/photovoltaik-rechner", label: "Photovoltaik-Rechner", desc: "Lohnt sich meine PV-Anlage?", page: "rechner" },
  { href: "/waermepumpe-rechner", label: "Wärmepumpen-Rechner", desc: "Heizkosten und Förderung vergleichen", page: "waermepumpe" },
  { href: "/klimaanlage-stromkosten", label: "Klimaanlagen-Rechner", desc: "Kühlkosten und Gerätevergleich — auch ergänzend zum Heizen", page: "klima" },
  { href: "/balkonkraftwerk-rechner", label: "Balkonkraftwerk-Rechner", desc: "Steckersolar für Miete und Eigentum", page: "balkon" },
  { href: "/pv-bedarf-berechnen", label: "PV-Bedarf berechnen", desc: "Welche Anlage passt zu mir?", page: "empfehlung" },
  { href: "/pv-simulation", label: "PV-Live-Simulation", desc: "Aktuelle Erträge in Echtzeit", page: "simulation" },
];

// PV-Förderung group: the regional funding directory plus the national data
// story that puts it in context (how policy shaped the build-out).
const FOERDERUNG_ITEMS: NavItem[] = [
  { href: "/photovoltaik-foerderung", label: "Förderprogramme", desc: "Bundes-, Landes- und Kommunalförderung nach Region", page: "foerderung" },
  { href: "/photovoltaik-zubau-deutschland", label: "Solar-Zubau & Förderung", desc: "Wie Förderung den Ausbau geformt hat — die Datenstory", page: "zubau" },
];

// Energy-data hub: the dashboard plus the embeddable widgets. The embed page is
// surfaced here (not as a top-level slot) so it becomes crawlable without
// spending a scarce nav slot on a publisher feature.
const ENERGIE_ITEMS: NavItem[] = [
  { href: "/strommix-deutschland", label: "Strommix Deutschland", desc: "Live-Stromerzeugung, Verlauf und Kernenergie", page: "energie" },
  { href: "/atomstrom-import", label: "Atomstrom-Import", desc: "Wie viel Kernstrom Deutschland aus dem Ausland bezieht", page: "atomstrom" },
  { href: "/solar-atlas", label: "Solar-Atlas", desc: "Solar-Bestand je Region — Deutschland, Länder, Kreise", page: "atlas" },
  { href: "/energie-widgets", label: "Charts einbetten", desc: "Kostenlose Energie-Widgets für die eigene Website", page: "widgets" },
];

export default function Header({ onLoginClick, onLogoutClick, activePage: activePageProp }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const authState = useAuth();
  // Abmelden ohne durchgereichten Handler: nach dem Abmelden weg von der
  // geschützten Seite und den Server-State auffrischen — sonst bliebe man auf
  // dem Dashboard mit veralteter Sitzungsansicht stehen.
  const defaultLogout = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };
  const activePage = activePageProp ?? (
    pathname === "/" ? "" :
    pathname.startsWith("/pv-simulation") ? "simulation" :
    pathname.startsWith("/strommix-deutschland") ? "energie" :
    pathname.startsWith("/atomstrom-import") ? "atomstrom" :
    pathname.startsWith("/solar-atlas") ? "atlas" :
    pathname.startsWith("/energie-widgets") ? "widgets" :
    pathname.startsWith("/photovoltaik-rechner") ? "rechner" :
    pathname.startsWith("/waermepumpe-rechner") ? "waermepumpe" :
    pathname.startsWith("/klimaanlage-stromkosten") ? "klima" :
    pathname.startsWith("/balkonkraftwerk-rechner") ? "balkon" :
    pathname.startsWith("/photovoltaik-zubau-deutschland") ? "zubau" :
    pathname.startsWith("/photovoltaik-foerderung") ? "foerderung" :
    pathname.startsWith("/ratgeber") ? "ratgeber" :
    pathname.startsWith("/lohnt-sich-pv") ? "ratgeber" :
    pathname.startsWith("/pv-bedarf-berechnen") ? "empfehlung" :
    pathname.startsWith("/dashboard") ? "dashboard" : ""
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1000px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
      if (e.matches) setMenuOpen(false);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const linkStyle = (page: string): React.CSSProperties => ({
    fontSize: 14,
    fontWeight: 600,
    color: activePage === page ? v('--color-accent') : v('--color-text-secondary'),
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
  });

  const mobileLinkStyle = (page: string): React.CSSProperties => ({
    fontSize: 16,
    fontWeight: 600,
    color: activePage === page ? v('--color-accent') : v('--color-text-primary'),
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 0",
  });

  const email = authState.status === "authed" ? authState.user.email ?? "" : "";
  const doLogout = () => { (onLogoutClick ?? defaultLogout)(); closeMenu(); };

  // Einloggen-Element (für Desktop-Leiste UND Burger, Styling folgt isDesktop).
  const loginElement = onLoginClick ? (
    <button onClick={() => { onLoginClick(); closeMenu(); }} style={{
      background: "none", border: "none", fontSize: isDesktop ? 14 : 16, fontWeight: 600,
      color: v('--color-text-secondary'), cursor: "pointer", padding: isDesktop ? 0 : "12px 0",
      fontFamily: v('--font-text'), display: "flex", alignItems: "center", gap: isDesktop ? 6 : 8,
    }}>
      <IconUser size={isDesktop ? 14 : 16} color={v('--color-accent-light')} /> Einloggen
    </button>
  ) : (
    <Link href="/login" style={{ ...(isDesktop ? linkStyle("") : mobileLinkStyle("")), gap: isDesktop ? 6 : 8 }} onClick={closeMenu}>
      <IconUser size={isDesktop ? 14 : 16} color={v('--color-accent-light')} /> Einloggen
    </Link>
  );

  // Oben rechts, eingeloggt: EIN Profil-Menü (Dropdown) statt loser Links —
  // ersetzt den Einloggen-Knopf. Inhalt bewusst schlank: Konto + Abmelden. Die
  // internen Ziele (Dashboard, Admin) navigiert man über die Sidebar des
  // internen Bereichs, den man über „Mein Konto" betritt.
  const desktopAuth = authState.status === "loading" ? null
    : authState.status === "authed"
      ? <ProfileMenu email={email} onLogout={doLogout} />
      : loginElement;

  // Burger-Menü, eingeloggt: dieselbe schlanke Profil-Sektion als Liste.
  const mobileAuth = authState.status === "loading" ? null
    : authState.status === "authed" ? (
      <>
        <div style={{
          fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
          color: v('--color-text-muted'), padding: "14px 0 4px",
        }}>
          {email || "Mein Konto"}
        </div>
        <Link href="/dashboard" style={mobileLinkStyle("dashboard")} onClick={closeMenu}>
          <IconUser size={16} color={v('--color-accent-light')} /> Mein Konto
        </Link>
        <button onClick={doLogout} style={{
          background: "none", border: "none", fontSize: 16, fontWeight: 600,
          color: v('--color-text-muted'), cursor: "pointer", padding: "12px 0",
          fontFamily: v('--font-text'), textAlign: "left",
        }}>
          Abmelden
        </button>
      </>
    ) : loginElement;

  return (
    <header style={{
      maxWidth: v('--header-max-width'),
      margin: "0 auto",
      // Kein marginBottom mehr: der Header→Content-Abstand sitzt zentral im
      // (site)-Layout (headerContentGap), nicht am Header selbst.
      position: "relative",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 32,
      }}>
        <Link href="/" style={{ textDecoration: "none", display: "inline-flex", flexShrink: 0 }}>
          <Logo width={130} />
        </Link>

        {isDesktop && (
          <nav style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <DesktopDropdown
              triggerLabel="Rentabilität berechnen"
              triggerHref="/photovoltaik-rechner"
              items={RECHNER_ITEMS}
              activePage={activePage}
            />
            <DesktopDropdown
              triggerLabel="PV-Förderung"
              triggerHref="/photovoltaik-foerderung"
              items={FOERDERUNG_ITEMS}
              activePage={activePage}
            />
            <Link href="/ratgeber" style={linkStyle("ratgeber")}>Ratgeber</Link>
            <DesktopDropdown
              triggerLabel="Strommix & Energiedaten"
              triggerHref="/strommix-deutschland"
              items={ENERGIE_ITEMS}
              activePage={activePage}
            />
          </nav>
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: isDesktop ? 14 : 8 }}>
          <ThemeController compact={!isDesktop} />
          {isDesktop ? desktopAuth : (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: 4,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {menuOpen
                ? <IconClose size={iconSizes.xl} color={v('--color-text-primary')} />
                : <IconMenu size={iconSizes.xl} color={v('--color-text-primary')} />
              }
            </button>
          )}
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {!isDesktop && menuOpen && (
        <>
          <div
            onClick={closeMenu}
            style={{
              position: "fixed", inset: 0, zIndex: 99,
              background: "rgba(0,0,0,0.2)",
            }}
          />
          <nav style={{
            position: "absolute",
            top: "100%",
            left: -16,
            right: -16,
            zIndex: 100,
            background: v('--color-bg'),
            borderBottom: `1px solid ${v('--color-border')}`,
            padding: "8px 24px 16px",
            boxShadow: v('--shadow-md'),
          }}>
            <MobileSection title="Rentabilität berechnen" items={RECHNER_ITEMS} activePage={activePage} onNavigate={closeMenu} />

            <div style={{ height: 1, background: v('--color-border'), margin: "10px 0 2px" }} />

            <MobileSection title="PV-Förderung" items={FOERDERUNG_ITEMS} activePage={activePage} onNavigate={closeMenu} />

            <div style={{ height: 1, background: v('--color-border'), margin: "10px 0 2px" }} />

            <Link href="/ratgeber" style={mobileLinkStyle("ratgeber")} onClick={closeMenu}>Ratgeber</Link>

            <div style={{ height: 1, background: v('--color-border'), margin: "10px 0 2px" }} />

            <MobileSection title="Strommix & Energiedaten" items={ENERGIE_ITEMS} activePage={activePage} onNavigate={closeMenu} />

            <div style={{ height: 1, background: v('--color-border'), margin: "10px 0 2px" }} />

            {mobileAuth}
          </nav>
        </>
      )}
    </header>
  );
}

// Profil-Menü oben rechts (Desktop, eingeloggt). Ein Icon-Knopf öffnet ein
// Dropdown mit Mail, den internen Zielen und Abmelden — statt drei loser Links
// in der Leiste. Schließt bei Klick daneben und mit Escape.
function ProfileMenu({ email, onLogout }: { email: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const itemStyle: React.CSSProperties = {
    display: "block", width: "100%", textAlign: "left", textDecoration: "none",
    padding: "10px 12px", borderRadius: 10, fontSize: 14, fontWeight: 600,
    color: v('--color-text-primary'), background: "transparent",
    border: "none", cursor: "pointer", fontFamily: v('--font-text'),
  };
  const hover = (on: boolean) => (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.background = on ? v('--color-bg-muted') : "transparent";
  };

  return (
    <div ref={wrap} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Profil-Menü"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 10px", borderRadius: 999, cursor: "pointer",
          background: open ? v('--color-accent-dim') : v('--color-bg-muted'),
          border: `1px solid ${open ? v('--color-accent') : v('--color-border')}`,
        }}
      >
        <IconUser size={16} color={v('--color-accent')} />
        <IconChevronDown size={iconSizes.md} color={v('--color-text-muted')} style={{ transition: "transform 0.15s ease", transform: open ? "rotate(180deg)" : "none" }} />
      </button>

      {open && (
        <div role="menu" style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 100,
          background: v('--color-bg'), border: `1px solid ${v('--color-border')}`,
          borderRadius: 14, boxShadow: v('--shadow-lg'), padding: 8, minWidth: 220,
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          {email && (
            <div style={{
              fontSize: 12, color: v('--color-text-muted'), padding: "6px 12px 8px",
              borderBottom: `1px solid ${v('--color-border')}`, marginBottom: 4,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {email}
            </div>
          )}
          <Link href="/dashboard" role="menuitem" onClick={() => setOpen(false)} style={itemStyle} onMouseEnter={hover(true)} onMouseLeave={hover(false)}>
            Mein Konto
          </Link>
          <button role="menuitem" onClick={() => { setOpen(false); onLogout(); }} style={{ ...itemStyle, color: v('--color-text-muted') }} onMouseEnter={hover(true)} onMouseLeave={hover(false)}>
            Abmelden
          </button>
        </div>
      )}
    </div>
  );
}

// Desktop hover dropdown. Trigger links to the section's main page; hovering (or
// keyboard focus) reveals the panel of sub-items. Each instance owns its open
// state so multiple dropdowns coexist.
function DesktopDropdown({
  triggerLabel,
  triggerHref,
  items,
  activePage,
  width = 280,
}: {
  triggerLabel: string;
  triggerHref: string;
  items: NavItem[];
  activePage: string;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = items.some((i) => i.page === activePage);

  const openNow = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }, []);
  // Small delay so moving the cursor across the gap to the panel doesn't close it.
  const scheduleClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }, []);

  return (
    <div style={{ position: "relative" }} onMouseEnter={openNow} onMouseLeave={scheduleClose}>
      <Link
        href={triggerHref}
        aria-haspopup="true"
        aria-expanded={open}
        onFocus={openNow}
        style={{
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          whiteSpace: "nowrap",
          cursor: "pointer",
          color: active ? v('--color-accent') : v('--color-text-secondary'),
        }}
      >
        {triggerLabel}
        <IconChevronDown
          size={iconSizes.md}
          color={active ? v('--color-accent') : v('--color-text-muted')}
          style={{ transition: "transform 0.15s ease", transform: open ? "rotate(180deg)" : "none" }}
        />
      </Link>

      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, paddingTop: 10, zIndex: 100 }}>
          <div style={{
            background: v('--color-bg'),
            border: `1px solid ${v('--color-border')}`,
            borderRadius: 14,
            boxShadow: v('--shadow-lg'),
            padding: 8,
            width,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}>
            {items.map((item) => {
              const isActive = activePage === item.page;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  style={{
                    textDecoration: "none",
                    display: "block",
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: isActive ? v('--color-accent-dim') : "transparent",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = v('--color-bg-muted'); }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: isActive ? v('--color-accent') : v('--color-text-primary'),
                    marginBottom: 2,
                  }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 12.5, color: v('--color-text-muted') }}>{item.desc}</div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile: a labelled section with its sub-items listed (indented), no collapse.
function MobileSection({
  title,
  items,
  activePage,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  activePage: string;
  onNavigate: () => void;
}) {
  return (
    <>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        color: v('--color-text-muted'),
        padding: "14px 0 4px",
      }}>
        {title}
      </div>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: activePage === item.page ? v('--color-accent') : v('--color-text-primary'),
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 0",
            paddingLeft: 12,
          }}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}
