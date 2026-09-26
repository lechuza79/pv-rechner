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
import { useEffect, useLayoutEffect, useRef, useState, type RefObject, type CSSProperties } from "react";
import { IconClose } from "./Icons";
import { v, KLEBELEISTE_VAR } from "../lib/theme";

export default function Toast({
  open,
  alignTo,
  onClose,
  onClick,
  children,
  /** Millisekunden bis zum Selbstschließen. 0 = bleibt stehen. */
  autoHideMs = 0,
  tone = "accent",
}: {
  open: boolean;
  /** Match the horizontal bounds and corner radius of a content card. */
  alignTo?: RefObject<HTMLElement | null>;
  onClose: () => void;
  /** Optional: Klick auf den Toast führt irgendwohin (z. B. Feld fokussieren). */
  onClick?: () => void;
  children: React.ReactNode;
  autoHideMs?: number;
  /** `accent` = Handlungsaufforderung, `neutral` = reine Auskunft. */
  tone?: "accent" | "neutral" | "awareness";
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

  const [alignment, setAlignment] = useState<CSSProperties>({});
  useLayoutEffect(() => {
    const target = alignTo?.current;
    if (!open || !target) return;
    const update = () => {
      const rect = target.getBoundingClientRect();
      setAlignment({ left: rect.left, width: rect.width, maxWidth: "none", transform: "none", borderRadius: getComputedStyle(target).borderRadius });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(target);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, [open, alignTo]);

  if (!open) return null;

  const accent = tone === "accent";
  const awareness = tone === "awareness";
  const foreground = awareness ? v("--color-awareness") : v("--color-text-on-accent");
  return (
    <div
      className="fu"
      role="status"
      aria-live="polite"
      onClick={onClick}
      style={{
        // Über der klebenden Aktionsleiste, wenn eine da ist: Sie meldet ihre
        // gemessene Höhe am Wurzelelement (siehe KlebenderKnopf). Ohne das lag
        // die PLZ-Aufforderung genau darunter und war nicht mehr lesbar.
        position: "fixed", bottom: `calc(20px + var(${KLEBELEISTE_VAR}, 0px))`,
        left: "50%", transform: "translateX(-50%)",
        transition: "bottom 0.28s ease",
        zIndex: 900, maxWidth: 440, width: "calc(100% - 32px)",
        cursor: onClick ? "pointer" : "default",
        background: awareness ? v("--color-awareness-dim") : accent ? v("--color-cta") : v("--color-text-primary"),
        color: foreground,
        borderRadius: v("--radius-pill"), padding: "12px 16px",
        boxShadow: v("--shadow-lg"),
        display: "flex", alignItems: "center", gap: 10,
        fontSize: v("--font-size-small"), fontWeight: 600, lineHeight: 1.4,
        boxSizing: "border-box",
        ...(alignTo ? alignment : {}),
      }}
    >
      <span style={{ flex: 1 }}>{children}</span>
      <button
        onClick={e => { e.stopPropagation(); onClose(); }}
        aria-label="Schließen"
        style={{
          border: "none", background: "transparent", color: foreground,
          width: 32, height: 32, flexShrink: 0, display: "grid", placeItems: "center",
          borderRadius: v("--radius-pill"), cursor: "pointer", padding: 0, opacity: 0.85,
        }}
      >
        <IconClose size={16} />
      </button>
    </div>
  );
}
