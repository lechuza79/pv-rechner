"use client";
// Aufklappbarer Ergebnis-Abschnitt — der geteilte Baustein für alles, was im
// Ergebnis eines Rechners einstellbar ist, aber nicht in die Summary-Card oben
// gehört.
//
// Warum es diesen Baustein gibt: Die Summary-Card trägt das Ergebnis und die
// wenigen Kernzahlen. Alles, was mehr als eine Zahl ist — eine Rechtslage, ein
// Preispfad, eine Aufschlüsselung —, drängte sich trotzdem dort hinein oder
// stand als eigene Karte irgendwo darunter, in jedem Rechner anders. Zugeklappt
// zeigt dieser Abschnitt deshalb IMMER seinen gewählten Zustand in einer Zeile
// (`summary`): Ein eingeklappter Block, dem man nicht ansieht, wonach gerade
// gerechnet wird, versteckt eine Annahme — und das ist schlimmer als eine
// überladene Karte.
//
// Bedienung: Kopfzeile ist der Schalter (Button, `aria-expanded`), der Inhalt
// bekommt eine `region` mit Bezug auf die Kopfzeile. Die Einblende-Bewegung
// kommt aus `.sc-acc` (lib/theme.ts) und schaltet sich bei
// `prefers-reduced-motion` selbst ab.
import { ReactNode, useId, useState } from "react";
import { v, iconSizes, space, pad } from "../lib/theme";
import { IconChevronDown } from "./Icons";

export interface ResultSectionProps {
  /** Überschrift des Abschnitts — benennt das Thema, nicht die Aktion. */
  title: string;
  /**
   * Der gewählte Zustand in einer Zeile, immer sichtbar (auch zugeklappt).
   * Kein „Details" o. Ä. — hier steht, wonach gerade gerechnet wird.
   */
  summary: ReactNode;
  /** Offen starten? Default: zu. */
  defaultOpen?: boolean;
  /** Wird beim Auf-/Zuklappen gerufen (z. B. für ein Analytics-Event). */
  onToggle?: (open: boolean) => void;
  children: ReactNode;
}

export default function ResultSection({
  title, summary, defaultOpen = false, onToggle, children,
}: ResultSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const headId = useId();

  return (
    <div style={{
      background: v("--color-bg"),
      borderRadius: v("--radius-md"),
      border: `1px solid ${v("--color-border")}`,
      marginBottom: space.xl,
      overflow: "hidden",
    }}>
      <button
        id={headId}
        onClick={() => { const next = !open; setOpen(next); onToggle?.(next); }}
        aria-expanded={open}
        aria-controls={panelId}
        style={{
          display: "flex", alignItems: "center", gap: space.md,
          width: "100%", padding: pad("lg", "xl"),
          background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: v("--color-text-primary"), flexShrink: 0 }}>
          {title}
        </span>
        <span style={{
          marginLeft: "auto", fontSize: 12, color: v("--color-text-muted"),
          textAlign: "right", lineHeight: 1.4, minWidth: 0,
        }}>
          {summary}
        </span>
        <IconChevronDown
          size={iconSizes.md}
          color={v("--color-text-muted")}
          style={{ flexShrink: 0, transition: "transform .2s ease", transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headId}
          className="sc-acc"
          style={{
            padding: pad("lg", "xl"),
            borderTop: `1px dashed ${v("--color-border")}`,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
