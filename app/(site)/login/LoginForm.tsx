"use client";

import { useState } from "react";
import Link from "next/link";
import { v } from "../../../lib/theme";
import { useAuth, signInWithMagicLink } from "../../../lib/auth";

// Dedicated login page. The site had no real login entry — the header's
// "Einloggen" only linked to the calculator, whose inline form appears deep in
// the flow. This is the proper passwordless (magic-link) entry, reused
// site-wide. `next` is where the magic link lands after login (default:
// dashboard); the auth callback validates it.

export default function LoginForm({ next = "/dashboard" }: { next?: string }) {
  const authState = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value || !value.includes("@")) {
      setError("Bitte eine gültige E-Mail-Adresse eingeben.");
      return;
    }
    setBusy(true);
    setError("");
    const { error } = await signInWithMagicLink(value, { next });
    setBusy(false);
    if (error) {
      setError("Der Link konnte nicht gesendet werden. Bitte später erneut versuchen.");
      return;
    }
    setSent(true);
  }

  const card: React.CSSProperties = {
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-lg"),
    padding: 24,
    boxShadow: v("--shadow-sm"),
  };

  return (
    <div style={{ background: v("--color-bg"), minHeight: "70vh", padding: "40px 16px", fontFamily: v("--font-text"), color: v("--color-text-primary") }}>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>Anmelden</h1>
        <p style={{ fontSize: 14, color: v("--color-text-muted"), marginBottom: 20, lineHeight: 1.5 }}>
          Passwortlos per Magic Link: E-Mail eingeben, du bekommst einen Anmeldelink. Kein Passwort, keine Werbung.
        </p>

        {authState.status === "authed" ? (
          <div style={{ ...card, textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Du bist bereits angemeldet.</div>
            <div style={{ fontSize: 13, color: v("--color-text-secondary"), marginBottom: 16 }}>{authState.user.email}</div>
            <Link href={next} style={{ display: "inline-block", padding: "12px 24px", borderRadius: v("--radius-md"), fontSize: 14, fontWeight: 700, background: v("--color-accent"), color: v("--color-text-on-accent"), textDecoration: "none" }}>
              Weiter →
            </Link>
          </div>
        ) : sent ? (
          <div style={{ ...card, textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: v("--color-accent"), marginBottom: 6 }}>Link gesendet!</div>
            <div style={{ fontSize: 13, color: v("--color-text-secondary"), lineHeight: 1.5 }}>
              Prüfe dein Postfach ({email.trim()}) und klicke den Anmeldelink. Danach bist du eingeloggt.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={card}>
            <label htmlFor="login-email" style={{ display: "block", fontSize: 12, fontWeight: 600, color: v("--color-text-secondary"), textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              E-Mail-Adresse
            </label>
            <input
              id="login-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              placeholder="du@beispiel.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: v("--radius-md"), fontSize: 15,
                background: v("--color-bg-muted"), border: `1px solid ${v("--color-border")}`,
                color: v("--color-text-primary"), fontFamily: v("--font-text"), outline: "none", marginBottom: 12,
              }}
            />
            <button
              type="submit"
              disabled={busy}
              style={{
                width: "100%", padding: "13px", borderRadius: v("--radius-md"), fontSize: 15, fontWeight: 700,
                background: v("--color-accent"), border: "none", color: v("--color-text-on-accent"),
                cursor: busy ? "default" : "pointer", fontFamily: v("--font-text"), opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? "Wird gesendet…" : "Anmeldelink senden"}
            </button>
            {error && <div style={{ fontSize: 13, color: v("--color-negative"), marginTop: 10 }}>{error}</div>}
          </form>
        )}
      </div>
    </div>
  );
}
