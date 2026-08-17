"use client";
import { IconChevronDown } from "./Icons";
import { iconSizes, v } from "../lib/theme";

/**
 * Einheitlich gestyltes Auswahlfeld statt des nackten Browser-Selects: gleiche
 * Optik wie die Text-Eingaben (Muster ContactForm) plus eigener Chevron —
 * das native Erscheinungsbild ist abgeschaltet, damit das Feld in jedem
 * Browser und jeder Theme-Stufe gleich aussieht.
 */
export default function SelectField({
  value,
  onChange,
  ariaLabel,
  children,
  maxWidth,
}: {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  ariaLabel: string;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    <span style={{ position: "relative", display: "inline-flex", flex: 1, maxWidth }}>
      <select
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          width: "100%",
          fontFamily: v("--font-text"),
          fontSize: 14,
          color: v("--color-text-primary"),
          background: v("--color-bg-muted"),
          border: `1px solid ${v("--color-border")}`,
          borderRadius: v("--radius-md"),
          padding: "10px 34px 10px 12px",
          outline: "none",
          cursor: "pointer",
        }}
      >
        {children}
      </select>
      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: v("--color-text-secondary"), display: "inline-flex" }}>
        <IconChevronDown size={iconSizes.md} />
      </span>
    </span>
  );
}
