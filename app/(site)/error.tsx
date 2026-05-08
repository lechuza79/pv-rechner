"use client";
// Route-level error boundary for everything inside the (site) group.
// Next.js App Router auto-wraps each route with this — catches both
// server and client errors that bubble up. Without it, uncaught
// failures (e.g. Supabase down on /dashboard, /admin/*) show a blank
// 500 page with no branding and no recovery path.
//
// The component-level ErrorBoundary in /rechner stays — it handles
// share-URL parsing failures with a more specific message.

import { useEffect } from "react";
import { v } from "../../lib/theme";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log to server console (visible in Vercel function logs)
    console.error("Route error:", error);
  }, [error]);

  return (
    <div style={{
      background: v('--color-bg'),
      fontFamily: v('--font-text'),
      color: v('--color-text-primary'),
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
          Etwas ist schiefgegangen
        </div>
        <div style={{ fontSize: 13, color: v('--color-text-secondary'), marginBottom: 20, lineHeight: 1.5 }}>
          Die Seite konnte nicht geladen werden. Versuch es noch mal — falls es bleibt, geh zur Startseite.
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button
            onClick={() => reset()}
            style={{
              padding: "10px 24px",
              borderRadius: v('--radius-md'),
              fontSize: 14,
              fontWeight: 700,
              background: v('--color-accent'),
              color: v('--color-text-on-accent'),
              border: "none",
              cursor: "pointer",
            }}
          >
            Erneut versuchen
          </button>
          <a
            href="/"
            style={{
              display: "inline-block",
              padding: "10px 24px",
              borderRadius: v('--radius-md'),
              fontSize: 14,
              fontWeight: 700,
              background: v('--color-bg-muted'),
              color: v('--color-text-primary'),
              border: `1px solid ${v('--color-border')}`,
              textDecoration: "none",
            }}
          >
            Zur Startseite
          </a>
        </div>
        {error.digest && (
          <div style={{ marginTop: 16, fontSize: 11, color: v('--color-text-muted'), fontFamily: v('--font-mono') }}>
            Fehler-Code: {error.digest}
          </div>
        )}
      </div>
    </div>
  );
}
