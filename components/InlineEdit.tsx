"use client";
import { useState } from "react";
import { v } from "../lib/theme";

// Parses German-formatted number input. Comma is the decimal separator; dots
// are thousand separators ("1.400,5"). Without a comma, a lone dot is only a
// thousand separator when it matches the strict grouping pattern ("1.400",
// "12.500.000") — otherwise it is treated as a decimal point, so "2.5" means
// 2,5 and not 25 (users routinely type the dot from numeric keypads).
export function parseGermanNumber(input: string): number {
  const t = input.trim();
  if (t.includes(",")) return parseFloat(t.replace(/\./g, "").replace(",", "."));
  if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) return parseFloat(t.replace(/\./g, ""));
  return parseFloat(t);
}

// `step` is accepted for API compatibility (callers pass it) but currently unused —
// the component does free-form text entry with min/max validation, no stepping.
// Kept on the prop signature in case we add arrow-key increment later.
export default function InlineEdit({ value, onCommit, unit, step: _step = 1, min = 0, max = 99999, width = 72, fmt }: { value: number; onCommit: (v: number) => void; unit: string; step?: number; min?: number; max?: number; width?: number; fmt?: (v: number) => string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startEdit = () => {
    setDraft(String(value).replace(".", ","));
    setEditing(true);
  };

  const commit = () => {
    const n = parseGermanNumber(draft);
    if (!isNaN(n) && n >= min && n <= max) {
      onCommit(Math.round(n * 1000) / 1000);
    }
    setEditing(false);
  };

  const display = fmt ? fmt(value) : value.toLocaleString("de-DE");

  if (!editing) {
    return (
      <span
        role="button"
        tabIndex={0}
        aria-label={`${display}${unit} bearbeiten`}
        onClick={startEdit}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startEdit(); } }}
        style={{
          cursor: "pointer", borderBottom: `1px dashed ${v('--color-accent')}`,
          padding: "2px 0 3px", display: "inline-flex", alignItems: "baseline", gap: 2,
          color: v('--color-text-primary'), fontFamily: v('--font-mono'), fontWeight: 700,
          fontSize: "inherit", minHeight: 24, lineHeight: 1.4,
        }}
        title="Klicken zum Bearbeiten"
      >
        {display}{unit && <span style={{ color: v('--color-text-secondary'), fontWeight: 500 }}>{unit}</span>}
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      <input
        autoFocus
        inputMode="decimal"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") setEditing(false); }}
        style={{
          // fontSize must stay >= 16px: iOS Safari auto-zooms into any focused
          // input below 16px and never zooms back out (display value can be smaller).
          width, textAlign: "right", fontSize: 16, fontWeight: 700,
          fontFamily: v('--font-mono'), color: v('--color-accent'),
          background: v('--color-accent-dim'), border: `1px solid ${v('--color-accent')}`,
          borderRadius: v('--radius-sm'), padding: "3px 6px", outline: "none",
        }}
      />
      {unit && <span style={{ color: v('--color-text-secondary'), fontWeight: 500 }}>{unit}</span>}
    </span>
  );
}
