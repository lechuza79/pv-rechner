"use client";
import { useState } from "react";
import { v } from "../lib/theme";

export default function InlineEdit({ value, onCommit, unit, step = 1, min = 0, max = 99999, width = 72, fmt }: { value: number; onCommit: (v: number) => void; unit: string; step?: number; min?: number; max?: number; width?: number; fmt?: (v: number) => string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startEdit = () => {
    setDraft(String(value));
    setEditing(true);
  };

  const commit = () => {
    const raw = draft.replace(",", ".");
    const n = parseFloat(raw);
    if (!isNaN(n) && n >= min && n <= max) {
      onCommit(Math.round(n * 1000) / 1000);
    }
    setEditing(false);
  };

  const display = fmt ? fmt(value) : (typeof value === "number" && value >= 1000 ? value.toLocaleString("de-DE") : String(value));

  if (!editing) {
    return (
      <span
        onClick={startEdit}
        style={{
          cursor: "pointer", borderBottom: `1px dashed ${v('--color-text-faint')}`,
          padding: "2px 0 3px", display: "inline-flex", alignItems: "baseline", gap: 2,
          color: v('--color-text-white'), fontFamily: v('--font-mono'), fontWeight: 700,
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
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") setEditing(false); }}
        style={{
          width, textAlign: "right", fontSize: "inherit", fontWeight: 700,
          fontFamily: v('--font-mono'), color: v('--color-accent'),
          background: v('--color-accent-dim'), border: `1px solid ${v('--color-accent')}`,
          borderRadius: v('--radius-input'), padding: "3px 6px", outline: "none",
        }}
      />
      {unit && <span style={{ color: v('--color-text-secondary'), fontWeight: 500 }}>{unit}</span>}
    </span>
  );
}
