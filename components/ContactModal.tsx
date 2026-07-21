"use client";

// Kontaktformular als Modal — für Wege, bei denen ein Sprung auf /kontakt den
// Kontext zerstören würde (Gemeinde-Seiten: wer dort fragt, will die Zahlen
// nicht verlieren). Wer nicht weg navigiert, braucht auch kein "Zurück".
//
// Aufbau bewusst wie KlimaDetailModal (Overlay + Klick daneben schließt,
// Sheet von unten, ×-Knopf, role="dialog") — kein zweites Modal-Muster im
// Projekt. Ergänzt um das, was ein Formular-Modal zusätzlich braucht:
// Escape schließt, der Fokus wandert beim Öffnen hinein und beim Schließen
// zurück auf den auslösenden Knopf.

import { useEffect, useRef } from "react";
import ContactForm from "./ContactForm";
import { v } from "../lib/theme";
import type { ContactTopic } from "../lib/contact-topics";

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  intro?: string;
  initialTopic?: ContactTopic;
  initialMessage?: string;
}

export default function ContactModal({
  open,
  onClose,
  title,
  intro,
  initialTopic,
  initialMessage,
}: ContactModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);

  // Fokus: NUR an `open` gekoppelt. Hinge dieser Effekt auch am onClose-Callback
  // (der als Inline-Arrow bei jedem Render neu entsteht), liefe das Aufräumen
  // mitten im Tippen und risse den Fokus aus dem gerade benutzten Feld.
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    // Auf den Dialog selbst fokussieren, nicht auf das erste Feld: so liest ein
    // Screenreader erst den Titel vor und der Nutzer weiß, wo er gelandet ist.
    dialogRef.current?.focus();
    return () => {
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div onClick={onClose} style={S.overlay}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={S.sheet}
      >
        <div style={S.head}>
          <h2 style={S.h2}>{title}</h2>
          <button onClick={onClose} aria-label="Schließen" style={S.close}>
            ×
          </button>
        </div>
        {intro && <p style={S.intro}>{intro}</p>}

        <ContactForm initialTopic={initialTopic} initialMessage={initialMessage} />
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  sheet: {
    background: v("--color-bg"),
    color: v("--color-text-primary"),
    fontFamily: v("--font-text"),
    width: "100%",
    maxWidth: 480,
    maxHeight: "92vh",
    overflowY: "auto",
    borderTopLeftRadius: v("--radius-lg"),
    borderTopRightRadius: v("--radius-lg"),
    padding: "20px 18px 18px",
    boxShadow: "0 -8px 40px rgba(0,0,0,0.3)",
    outline: "none",
  },
  head: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: 12 },
  h2: { fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" },
  close: {
    border: "none",
    background: "transparent",
    color: v("--color-text-muted"),
    fontSize: 24,
    lineHeight: 0.8,
    cursor: "pointer",
    padding: 0,
  },
  intro: { fontSize: 12, color: v("--color-text-muted"), marginBottom: 4, lineHeight: 1.5 },
};
