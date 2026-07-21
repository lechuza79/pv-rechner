"use client";

/**
 * DER Modal-Baustein der App. Modals werden NICHT pro Stelle neu gebaut —
 * wer einen Dialog braucht, benutzt diesen hier und liefert nur Titel + Inhalt.
 *
 * Warum zentral: Vor der Zusammenführung gab es drei handgebaute Overlays
 * (Klima-Detail, Energiefluss, Förderprogramm), die sich in genau den Details
 * unterschieden, die man beim Nachbauen vergisst — Fokus-Rückgabe, Tab-Falle,
 * Scroll-Sperre, Verhalten auf schmalen Bildschirmen. Dasselbe Muster wie beim
 * Header: einmal zentral, statt zehnmal fast richtig.
 *
 * Gesetztes Verhalten (nicht pro Aufrufstelle verhandelbar):
 * - Desktop zentriert, schmale Bildschirme als Bottom-Sheet (fährt von unten ein)
 * - Sanftes Ein- UND Ausblenden; beim Schließen bleibt der Dialog bis zum Ende
 *   der Animation gemountet. `prefers-reduced-motion` schaltet sie ab
 * - Höhe begrenzt, Inhalt scrollt INNEN — der Absenden-Knopf bleibt erreichbar,
 *   auch auf flachen Laptop-Displays und bei eingeblendeter Tastatur (dvh)
 * - Schließen per Escape, Klick daneben und ×
 * - Fokus wandert beim Öffnen in den Dialog, bleibt per Tab-Falle darin und
 *   springt beim Schließen auf das auslösende Element zurück
 * - Seite dahinter scrollt nicht mit
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { v } from "../lib/theme";

const DURATION_MS = 180;
const MOBILE_MAX_PX = 640;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Überschrift im Kopf des Dialogs. */
  title: ReactNode;
  /** Nur nötig, wenn die Vorlese-Bezeichnung von der Überschrift abweicht. */
  ariaLabel?: string;
  /** Kurzer Erklärtext unter der Überschrift. */
  intro?: ReactNode;
  maxWidth?: number;
  children: ReactNode;
}

/**
 * Media-Query als React-State — Inline-Styles können keine Media-Queries.
 *
 * Bewusst useSyncExternalStore statt useState+Effekt: der Wert wird bei JEDEM
 * Render frisch gelesen. Ein Effekt, der nur auf das change-Ereignis hört,
 * verpasst jede Breitenänderung, die zwischen Mount und Öffnen passiert ist —
 * das Modal wird ja einmal gemountet und erst viel später geöffnet.
 * Server-Snapshot false: dort gibt es keine Fensterbreite, und der Dialog ist
 * beim ersten Rendern ohnehin geschlossen.
 */
function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export default function Modal({
  open,
  onClose,
  title,
  ariaLabel,
  intro,
  maxWidth = 480,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // Aktuelles onClose ohne den Mechanik-Effekt neu zu starten: die Aufrufer
  // übergeben eine frische Inline-Funktion pro Render. Hinge der Effekt daran,
  // liefe sein Aufräumen mitten im Tippen und risse den Fokus aus dem Feld.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const isMobile = useMediaQuery(`(max-width: ${MOBILE_MAX_PX}px)`);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const duration = reducedMotion ? 0 : DURATION_MS;

  // Zwei Zustände, damit es auch beim SCHLIESSEN eine Animation gibt:
  // `rendered` hält den Dialog im DOM, `shown` fährt ihn hinein bzw. hinaus.
  const [rendered, setRendered] = useState(open);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setRendered(true);
      // Ein Frame im Ausgangszustand, sonst gibt es nichts zu überblenden.
      // Timer als Rückfallebene: in nicht sichtbaren Tabs pausiert der Browser
      // requestAnimationFrame — ohne ihn bliebe der Dialog unsichtbar hängen.
      const raf = requestAnimationFrame(() => setShown(true));
      const fallback = setTimeout(() => setShown(true), 50);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(fallback);
      };
    }
    setShown(false);
    const timer = setTimeout(() => setRendered(false), duration);
    return () => clearTimeout(timer);
  }, [open, duration]);

  // Modal-Mechanik, solange offen: Scroll-Sperre, Escape, Tab-Falle, Fokus.
  // Bewusst an `open` gekoppelt (nicht an `rendered`), damit der Fokus sofort
  // zurückspringt und nicht erst nach der Ausblende-Animation.
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Auf den Dialog selbst fokussieren, nicht auf das erste Feld: so liest ein
    // Screenreader erst Titel und Kontext vor.
    dialogRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      // An den Rändern umschlagen; ist der Fokus entwischt, zurückholen.
      if (e.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialog.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      trigger?.focus();
    };
  }, [open]);

  // Portal erst nach dem Mount: der Server rendert kein document.body.
  const [canPortal, setCanPortal] = useState(false);
  useEffect(() => setCanPortal(true), []);

  if (!rendered || !canPortal) return null;

  const radius = v("--radius-lg");
  const hiddenTransform = isMobile ? "translateY(100%)" : "translateY(8px) scale(0.98)";

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        justifyContent: "center",
        alignItems: isMobile ? "flex-end" : "center",
        padding: isMobile ? 0 : 16,
        opacity: shown ? 1 : 0,
        transition: `opacity ${duration}ms ease-out`,
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}
        style={{
          background: v("--color-bg"),
          color: v("--color-text-primary"),
          fontFamily: v("--font-text"),
          width: "100%",
          maxWidth,
          // dvh statt vh: bei eingeblendeter Tastatur schrumpft die Höhe mit,
          // sonst rutscht der Absenden-Knopf unter die Tastatur.
          maxHeight: isMobile ? "92dvh" : "calc(100dvh - 32px)",
          overflowY: "auto",
          borderRadius: isMobile ? `${radius} ${radius} 0 0` : radius,
          padding: "20px 18px 18px",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.3)",
          outline: "none",
          opacity: shown ? 1 : 0,
          transform: shown ? "none" : hiddenTransform,
          transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
        }}
      >
        <div style={S.head}>
          <h2 style={S.h2}>{title}</h2>
          <button onClick={onClose} aria-label="Schließen" style={S.close}>
            ×
          </button>
        </div>
        {intro && <p style={S.intro}>{intro}</p>}
        {children}
      </div>
    </div>,
    document.body,
  );
}

const S: Record<string, React.CSSProperties> = {
  head: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 4 },
  h2: { fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.25 },
  close: {
    border: "none",
    background: "transparent",
    color: v("--color-text-muted"),
    fontSize: 24,
    lineHeight: 0.8,
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
  },
  intro: { fontSize: 12, color: v("--color-text-muted"), marginBottom: 18, lineHeight: 1.5 },
};
