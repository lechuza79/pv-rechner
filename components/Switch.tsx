"use client";

import { v } from "../lib/theme";

/**
 * DER Ein/Aus-Schalter. Er saß bis 22.08.2026 fest in `ResultSection` — als das
 * Zubau-Widget einen brauchte, wäre er dort ein zweites Mal entstanden, mit
 * eigenen Maßen und eigener Bewegung. Ein Schalter, der an zwei Stellen
 * verschieden aussieht, ist derselbe Fehler wie zwei Formatter für eine Einheit.
 *
 * Beschriftet wird er IMMER (`label`) — für Screenreader ist ein Schieber ohne
 * Namen nur „an/aus", ohne Angabe wovon. Sichtbar daneben stehen darf ein
 * anderer, kürzerer Text; dann bleibt `label` die vollständige Fassung.
 */
export default function Switch({
  an,
  onChange,
  label,
  /** Sichtbare Beschriftung rechts neben dem Schieber. */
  text,
  size = "md",
}: {
  an: boolean;
  onChange: (an: boolean) => void;
  label: string;
  text?: string;
  /** „sm" für Widget-Leisten, „md" für Ergebnis-Abschnitte. */
  size?: "sm" | "md";
}) {
  const breite = size === "sm" ? 30 : 36;
  const hoehe = size === "sm" ? 17 : 20;
  const knopf = hoehe - 4;

  const schieber = (
    <span
      style={{
        flexShrink: 0,
        width: breite,
        height: hoehe,
        borderRadius: hoehe / 2,
        background: an ? v("--color-accent") : v("--color-border"),
        transition: "background .2s ease",
        position: "relative",
        display: "block",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: an ? breite - knopf - 2 : 2,
          width: knopf,
          height: knopf,
          borderRadius: "50%",
          background: v("--color-bg"),
          transition: "left .2s ease",
          display: "block",
        }}
      />
    </span>
  );

  return (
    <button
      type="button"
      onClick={() => onChange(!an)}
      role="switch"
      aria-checked={an}
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: 0,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        color: an ? v("--color-accent") : v("--color-text-secondary"),
        fontSize: size === "sm" ? 12 : 13,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {schieber}
      {text && <span>{text}</span>}
    </button>
  );
}
