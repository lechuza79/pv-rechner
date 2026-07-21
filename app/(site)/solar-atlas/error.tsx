"use client";

import { useEffect } from "react";
import { v } from "../../../lib/theme";

/**
 * Ruhige Fallback-Seite für die Atlas-Routen, wenn ein Datenbank-Read fehlschlägt
 * (z. B. Timeout aus lib/db-timeout.ts, wenn die DB gerade überlastet ist). Ohne
 * sie würde die Seite 500 werfen oder — vor dem Fast-Fail — bis zu 300 s hängen.
 * Deckt Übersicht + Gemeinde-Detail ab (error.tsx greift für alle Kinder-Routen).
 */
export default function AtlasError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Landet in den Server-/Vercel-Logs für die Fehlerauswertung.
    console.error("Solar-Atlas error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
        fontFamily: v("--font-text"),
      }}
    >
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🛰️</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: v("--color-text-primary"), margin: "0 0 10px" }}>
          Die Atlas-Daten sind gerade nicht erreichbar
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: v("--color-text-secondary"), margin: "0 0 22px" }}>
          Das ist meist nur ein kurzer Moment. Bitte versuche es gleich noch einmal — die
          übrigen Rechner auf der Seite funktionieren normal weiter.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={reset}
            style={{
              background: v("--color-accent"),
              color: v("--color-text-on-accent"),
              border: "none",
              borderRadius: v("--radius-md"),
              padding: "11px 20px",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            Nochmal versuchen
          </button>
          <a
            href="/"
            style={{
              background: v("--color-bg-muted"),
              color: v("--color-text-primary"),
              border: `1px solid ${v("--color-border")}`,
              borderRadius: v("--radius-md"),
              padding: "11px 20px",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Zur Startseite
          </a>
        </div>
      </div>
    </div>
  );
}
