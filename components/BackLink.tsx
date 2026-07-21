"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";

/**
 * „Zurück" zur Herkunftsseite statt stumpf auf die Startseite.
 *
 * Wer den Kontakt aus einer Gemeinde-Seite heraus öffnet, will dorthin zurück —
 * ein fixes href="/" wirft ihn stattdessen auf die Startseite und der Kontext ist
 * weg. Ohne Verlauf (Direktaufruf, neuer Tab, aus einer Mail) greift der Fallback.
 */
export default function BackLink({
  fallback = "/",
  style,
  label = "← Zurück",
}: {
  fallback?: string;
  style?: CSSProperties;
  label?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        fontFamily: "inherit",
        ...style,
      }}
    >
      {label}
    </button>
  );
}
