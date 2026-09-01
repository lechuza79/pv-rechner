"use client";
// Kurzmeldung am unteren Bildschirmrand — DER gemeinsame Baustein.
//
// Zwei Anlässe, beide „der Nutzer soll wissen, was gerade passiert ist":
//  1. ein Hinweis, der zu einer Eingabe führt (PLZ-Nudge → Feld fokussieren),
//  2. die FOLGE einer übersprungenen Frage („Weiß ich nicht" → womit wir
//     stattdessen rechnen). Genau dafür darf eine Frage überhaupt überspringbar
//     sein: die Annahme wird sichtbar, statt still zu gelten.
//
// Vorher stand die Mechanik inline im PV-Rechner. Ein zweiter Toast wäre eine
// zweite Fassung von Position, Farbe, Schließen und Auto-Ausblenden geworden.
import { useEffect, useRef } from "react";
import { v } from "../lib/theme";

export default function Toast({
  open,
  onClose,
  onClick,
  children,
  /** Millisekunden bis zum Selbstschließen. 0 = bleibt stehen. */
  autoHideMs = 0,
  tone = "accent",
}: {
  open: boolean;
  onClose: () => void;
  /** Optional: Klick auf den Toast führt irgendwohin (z. B. Feld fokussieren). */
  onClick?: () => void;
  children: React.ReactNode;
  autoHideMs?: number;
  /** `accent` = Handlungsaufforderung, `neutral` = reine Auskunft. */
  tone?: "accent" | "neutral";
}) {
  // Der Effekt hängt an `open`, NICHT am onClose-Callback: die Aufrufer
  // übergeben eine frische Inline-Funktion pro Render, sonst würde der Timer
  // bei jedem Elternrender neu starten und nie ablaufen. Gleiche Falle wie in
  // components/Modal.tsx.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Der Timer hängt zusätzlich am INHALT: Wechselt die Meldung, während der
  // Toast schon offen ist, bleibt `open` true — der Effekt liefe nicht neu und
  // die zweite Meldung erbte die Restzeit der ersten. Gemessen: Dach
  // überspringen, acht Sekunden später das Gebäude überspringen, und der zweite
  // Satz war nach einer Sekunde weg. Genau der Satz, der die stille Annahme
  // sichtbar machen soll.
  const inhalt = typeof children === "string" ? children : null;
  useEffect(() => {
    if (!open || !autoHideMs) return;
    const t = setTimeout(() => onCloseRef.current(), autoHideMs);
    return () => clearTimeout(t);
  }, [open, autoHideMs, inhalt]);

  if (!open) return null;

  const accent = tone === "accent";
  return (
    <div
      className="fu"
      role="status"
      aria-live="polite"
      onClick={onClick}
      style={{
        position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
        zIndex: 900, maxWidth: 440, width: "calc(100% - 32px)",
        cursor: onClick ? "pointer" : "default",
        background: accent ? v("--color-accent") : v("--color-text-primary"),
        color: v("--color-text-on-accent"),
        borderRadius: v("--radius-md"), padding: "12px 16px",
        boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
        display: "flex", alignItems: "center", gap: 10,
        fontSize: v("--font-size-small"), fontWeight: 600, lineHeight: 1.4,
      }}
    >
      <span style={{ flex: 1 }}>{children}</span>
      <button
        onClick={e => { e.stopPropagation(); onClose(); }}
        aria-label="Schließen"
        style={{
          border: "none", background: "transparent", color: v("--color-text-on-accent"),
          fontSize: v("--font-size-h3"), lineHeight: 0.8, cursor: "pointer", padding: 0, opacity: 0.85,
        }}
      >
        ×
      </button>
    </div>
  );
}
