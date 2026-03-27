"use client";
import Link from "next/link";
import Logo from "./Logo";
import { IconUser } from "./Icons";
import { v } from "../lib/theme";

interface HeaderProps {
  user?: any;
  authLoading?: boolean;
  onLoginClick?: () => void;
  onLogoutClick?: () => void;
  activePage?: string;
}

export default function Header({ user, authLoading, onLoginClick, onLogoutClick, activePage }: HeaderProps) {
  const linkStyle = (page: string): React.CSSProperties => ({
    fontSize: 13,
    fontWeight: 600,
    color: activePage === page ? v('--color-accent') : v('--color-text-secondary'),
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  });

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
      <Link href="/" style={{ textDecoration: "none", display: "inline-flex" }}>
        <Logo height={22} />
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/rechner" style={linkStyle("rechner")}>Rechner</Link>
        <Link href="/empfehlung" style={linkStyle("empfehlung")}>Empfehlung</Link>
        {!authLoading && (
          user ? (
            onLogoutClick ? (
              <button onClick={onLogoutClick} style={{
                background: "none", border: "none", fontSize: 13, fontWeight: 600,
                color: v('--color-text-muted'), cursor: "pointer", padding: 0, fontFamily: v('--font-text'),
              }}>
                Abmelden
              </button>
            ) : (
              <Link href="/dashboard" style={linkStyle("dashboard")}>
                <IconUser size={14} color={v('--color-accent-light')} /> Dashboard
              </Link>
            )
          ) : (
            onLoginClick ? (
              <button onClick={onLoginClick} style={{
                background: "none", border: "none", fontSize: 13, fontWeight: 600,
                color: v('--color-text-secondary'), cursor: "pointer", padding: 0,
                fontFamily: v('--font-text'), display: "inline-flex", alignItems: "center", gap: 4,
              }}>
                <IconUser size={14} color={v('--color-accent-light')} /> Einloggen
              </button>
            ) : (
              <Link href="/rechner" style={{ ...linkStyle(""), gap: 4 }}>
                <IconUser size={14} color={v('--color-accent-light')} /> Einloggen
              </Link>
            )
          )
        )}
      </div>
    </div>
  );
}
