"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import { IconUser, IconMenu, IconClose, IconChevronDown } from "./Icons";
import { v } from "../lib/theme";
import { useAuth } from "../lib/auth";

interface HeaderProps {
  onLoginClick?: () => void;
  onLogoutClick?: () => void;
  activePage?: string;
}

// All calculators grouped under the "Rechner" dropdown. Sub-labels carry the
// SEO keywords (Photovoltaik-Rechner, Wärmepumpen-Rechner …) so internal anchor
// text matches each page's target term.
const RECHNER_ITEMS = [
  { href: "/photovoltaik-rechner", label: "Photovoltaik-Rechner", desc: "Lohnt sich meine PV-Anlage?", page: "rechner" },
  { href: "/waermepumpe-rechner", label: "Wärmepumpen-Rechner", desc: "Heizkosten und Förderung vergleichen", page: "waermepumpe" },
  { href: "/pv-bedarf-berechnen", label: "PV-Bedarf berechnen", desc: "Welche Anlage passt zu mir?", page: "empfehlung" },
  { href: "/pv-simulation", label: "PV-Live-Simulation", desc: "Aktuelle Erträge in Echtzeit", page: "simulation" },
];

const RECHNER_PAGES = RECHNER_ITEMS.map((i) => i.page);

export default function Header({ onLoginClick, onLogoutClick, activePage: activePageProp }: HeaderProps) {
  const pathname = usePathname();
  const authState = useAuth();
  const activePage = activePageProp ?? (
    pathname === "/" ? "" :
    pathname.startsWith("/pv-simulation") ? "simulation" :
    pathname.startsWith("/strommix-deutschland") ? "energie" :
    pathname.startsWith("/photovoltaik-rechner") ? "rechner" :
    pathname.startsWith("/waermepumpe-rechner") ? "waermepumpe" :
    pathname.startsWith("/photovoltaik-foerderung") ? "foerderung" :
    pathname.startsWith("/pv-bedarf-berechnen") ? "empfehlung" :
    pathname.startsWith("/dashboard") ? "dashboard" : ""
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [rechnerOpen, setRechnerOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const rechnerCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const openRechner = useCallback(() => {
    if (rechnerCloseTimer.current) clearTimeout(rechnerCloseTimer.current);
    setRechnerOpen(true);
  }, []);
  // Small delay so moving the cursor across the gap to the panel doesn't close it.
  const scheduleCloseRechner = useCallback(() => {
    if (rechnerCloseTimer.current) clearTimeout(rechnerCloseTimer.current);
    rechnerCloseTimer.current = setTimeout(() => setRechnerOpen(false), 120);
  }, []);

  const rechnerActive = RECHNER_PAGES.includes(activePage);

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

  const authElement = authState.status === "loading" ? null :
    authState.status === "authed" ? (
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
        <Link href="/photovoltaik-rechner" style={{ ...(isDesktop ? linkStyle("") : mobileLinkStyle("")), gap: isDesktop ? 6 : 8 }} onClick={closeMenu}>
          <IconUser size={isDesktop ? 14 : 16} color={v('--color-accent-light')} /> Einloggen
        </Link>
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
        alignItems: "center",
        gap: 32,
      }}>
        <Link href="/" style={{ textDecoration: "none", display: "inline-flex", flexShrink: 0 }}>
          <Logo width={130} />
        </Link>

        {isDesktop && (
          <nav style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {/* Rechner dropdown */}
            <div
              style={{ position: "relative" }}
              onMouseEnter={openRechner}
              onMouseLeave={scheduleCloseRechner}
            >
              <Link
                href="/photovoltaik-rechner"
                style={{
                  ...linkStyle(rechnerActive ? activePage : "rechner"),
                  color: rechnerActive ? v('--color-accent') : v('--color-text-secondary'),
                  cursor: "pointer",
                }}
                aria-haspopup="true"
                aria-expanded={rechnerOpen}
                onFocus={openRechner}
              >
                Rechner
                <IconChevronDown
                  size={14}
                  color={rechnerActive ? v('--color-accent') : v('--color-text-muted')}
                  style={{
                    transition: "transform 0.15s ease",
                    transform: rechnerOpen ? "rotate(180deg)" : "none",
                  }}
                />
              </Link>

              {rechnerOpen && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  paddingTop: 10,
                  zIndex: 100,
                }}>
                  <div style={{
                    background: v('--color-bg'),
                    border: `1px solid ${v('--color-border')}`,
                    borderRadius: 14,
                    boxShadow: "0 8px 28px rgba(0,0,0,0.1)",
                    padding: 8,
                    width: 280,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}>
                    {RECHNER_ITEMS.map((item) => {
                      const isActive = activePage === item.page;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setRechnerOpen(false)}
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
                          <div style={{ fontSize: 12.5, color: v('--color-text-muted') }}>
                            {item.desc}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <Link href="/photovoltaik-foerderung" style={linkStyle("foerderung")}>PV-Förderung</Link>
            <Link href="/strommix-deutschland" style={linkStyle("energie")}>Strommix</Link>
          </nav>
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          {isDesktop ? authElement : (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
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
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: v('--color-text-muted'),
              padding: "14px 0 4px",
            }}>
              Rechner
            </div>
            {RECHNER_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{ ...mobileLinkStyle(item.page), paddingLeft: 12 }}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            ))}

            <div style={{ height: 1, background: v('--color-border'), margin: "10px 0 2px" }} />

            <Link href="/photovoltaik-foerderung" style={mobileLinkStyle("foerderung")} onClick={closeMenu}>PV-Förderung</Link>
            <Link href="/strommix-deutschland" style={mobileLinkStyle("energie")} onClick={closeMenu}>Strommix</Link>

            <div style={{ height: 1, background: v('--color-border'), margin: "10px 0 2px" }} />

            {authElement}
          </nav>
        </>
      )}
    </header>
  );
}
