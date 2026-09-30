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
  closeDisabled = false,
  closeLabel = "Schließen",
  expanded = false,
  children,
  /** Millisekunden bis zum Selbstschließen. 0 = bleibt stehen. */
  autoHideMs = 0,
  showCountdown = false,
  countdownKey,
  tone = "accent",
}: {
  open: boolean;
  /** Match the horizontal bounds and corner radius of a content card. */
  alignTo?: RefObject<HTMLElement | null>;
  onClose: () => void;
  closeDisabled?: boolean;
  closeLabel?: string;
  expanded?: boolean;
  /** Optional: Klick auf den Toast führt irgendwohin (z. B. Feld fokussieren). */
  onClick?: () => void;
  children: React.ReactNode;
  autoHideMs?: number;
  showCountdown?: boolean;
  countdownKey?: string;
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
  const [remainingMs, setRemainingMs] = useState(autoHideMs);
  useEffect(() => {
    if (!open || !autoHideMs) return;
    const deadline = Date.now() + autoHideMs;
    setRemainingMs(autoHideMs);
    const timeout = setTimeout(() => onCloseRef.current(), autoHideMs);
    const interval = showCountdown ? setInterval(() => setRemainingMs(Math.max(0, deadline - Date.now())), 100) : undefined;
    return () => { clearTimeout(timeout); if (interval) clearInterval(interval); };
  }, [open, autoHideMs, showCountdown, countdownKey, inhalt]);

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
        boxShadow: v("--shadow-toast"),
        display: "flex", alignItems: "center", gap: 10,
        fontSize: v("--font-size-small"), fontWeight: 600, lineHeight: 1.4,
        boxSizing: "border-box",
        ...(alignTo ? alignment : {}),
        ...(expanded ? { borderRadius: v("--radius-lg") } : {}),
      }}
    >
      {showCountdown && autoHideMs > 0 && (
        <span className="sc-toast-countdown" aria-hidden="true" style={{ position: "relative", width: 28, height: 28, flexShrink: 0, display: "grid", placeItems: "center" }}>
          <svg width="28" height="28" viewBox="0 0 28 28" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
            <circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.18" />
            <circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - Math.min(1, remainingMs / autoHideMs)} />
          </svg>
          <span style={{ fontSize: v("--font-size-caption"), fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{Math.ceil(remainingMs / 1000)}</span>
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      <button
        onClick={e => { e.stopPropagation(); onClose(); }}
        aria-label={closeLabel}
        disabled={closeDisabled}
        style={{
          border: "none", background: "transparent", color: foreground,
          alignSelf: expanded ? "flex-start" : undefined,
          width: 32, height: 32, flexShrink: 0, display: "grid", placeItems: "center",
          borderRadius: v("--radius-pill"), cursor: "pointer", padding: 0, opacity: 0.85,
        }}
      >
        <IconClose size={16} />
      </button>
    </div>
  );
}
