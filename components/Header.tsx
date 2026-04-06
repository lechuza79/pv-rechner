"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import { IconUser, IconMenu, IconClose } from "./Icons";
import { v } from "../lib/theme";

interface HeaderProps {
  user?: any;
  authLoading?: boolean;
  onLoginClick?: () => void;
  onLogoutClick?: () => void;
  activePage?: string;
}

export default function Header({ user, authLoading, onLoginClick, onLogoutClick, activePage: activePageProp }: HeaderProps) {
  const pathname = usePathname();
  const activePage = activePageProp ?? (
    pathname === "/" ? "" :
    pathname.startsWith("/simulation") ? "simulation" :
    pathname.startsWith("/energie") ? "energie" :
    pathname.startsWith("/rechner") ? "rechner" :
    pathname.startsWith("/empfehlung") ? "empfehlung" :
    pathname.startsWith("/dashboard") ? "dashboard" : ""
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
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

  const authElement = !authLoading && (
    user ? (
      onLogoutClick ? (
        <button onClick={() => { onLogoutClick(); closeMenu(); }} style={{
          background: "none", border: "none", fontSize: isDesktop ? 14 : 16, fontWeight: 600,
          color: v('--color-text-muted'), cursor: "pointer", padding: isDesktop ? 0 : "12px 0",
          fontFamily: v('--font-text'),
        }}>
          Abmelden
        </button>
      ) : (
        <Link href="/dashboard" style={isDesktop ? linkStyle("dashboard") : mobileLinkStyle("dashboard")} onClick={closeMenu}>
          <IconUser size={isDesktop ? 14 : 16} color={v('--color-accent-light')} /> Dashboard
        </Link>
      )
    ) : (
      onLoginClick ? (
        <button onClick={() => { onLoginClick(); closeMenu(); }} style={{
          background: "none", border: "none", fontSize: isDesktop ? 14 : 16, fontWeight: 600,
          color: v('--color-text-secondary'), cursor: "pointer", padding: isDesktop ? 0 : "12px 0",
          fontFamily: v('--font-text'), display: "flex", alignItems: "center", gap: isDesktop ? 6 : 8,
        }}>
          <IconUser size={isDesktop ? 14 : 16} color={v('--color-accent-light')} /> Einloggen
        </button>
      ) : (
        <Link href="/rechner" style={{ ...(isDesktop ? linkStyle("") : mobileLinkStyle("")), gap: isDesktop ? 6 : 8 }} onClick={closeMenu}>
          <IconUser size={isDesktop ? 14 : 16} color={v('--color-accent-light')} /> Einloggen
        </Link>
      )
    )
  );

  return (
    <header style={{
      maxWidth: v('--header-max-width'),
      margin: "0 auto",
      marginBottom: 20,
      position: "relative",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <Link href="/" style={{ textDecoration: "none", display: "inline-flex" }}>
          <Logo width={130} />
        </Link>

        {isDesktop ? (
          <nav style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Link href="/rechner" style={linkStyle("rechner")}>Rechner</Link>
            <Link href="/simulation" style={linkStyle("simulation")}>Live Simulation</Link>
            <Link href="/energie" style={linkStyle("energie")}>Charts</Link>
            {authElement}
          </nav>
        ) : (
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Menu schließen" : "Menu öffnen"}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 4,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {menuOpen
              ? <IconClose size={22} color={v('--color-text-primary')} />
              : <IconMenu size={22} color={v('--color-text-primary')} />
            }
          </button>
        )}
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
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          }}>
            <Link href="/rechner" style={mobileLinkStyle("rechner")} onClick={closeMenu}>Rechner</Link>
            <Link href="/simulation" style={mobileLinkStyle("simulation")} onClick={closeMenu}>Live Simulation</Link>
            <Link href="/energie" style={mobileLinkStyle("energie")} onClick={closeMenu}>Charts</Link>
            {authElement}
          </nav>
        </>
      )}
    </header>
  );
}
