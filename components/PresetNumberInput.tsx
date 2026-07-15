"use client";

import { useEffect, useRef, useState } from "react";
import { v } from "../lib/theme";

interface PresetNumberInputProps {
  /** Current committed value. */
  value: number;
  /** Preset values shown as chips next to the field. When `value` is one of
   *  them, the field shows empty (the chip is the active choice) and uses the
   *  muted styling. */
  presets: number[];
  min: number;
  max: number;
  /** Trailing unit label + placeholder, e.g. "km" or "m²". */
  unit: string;
  /** Called with a valid, in-range number as the user types. */
  onCommit: (n: number) => void;
  /** Smaller sizing for the result-page QuickSettings row. */
  compact?: boolean;
  /** Optional focus/blur hooks — the accordion uses them to keep the field
   *  open while a custom value is being typed (else it collapses mid-input). */
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * Free numeric input that sits next to preset chips (E-Auto km, Klima m²).
 *
 * Why this component exists: a naively-controlled
 * `<input value={isPreset ? "" : n} onChange={commit if n >= min}>` is
 * impossible to type into. Typing 15000 goes through "1", "15", "150" — each
 * below the minimum, so nothing commits, state never changes, and the
 * controlled value snaps the field back to empty on every keystroke. Reported
 * on mobile (Brave), but broken everywhere the presets aren't used.
 *
 * The fix: keep a local text buffer so partial input stays visible, commit only
 * once the number is in range, and — while focused — never let an external
 * value change yank the text out from under the user. On blur the buffer snaps
 * back to reflect the committed value if it's empty or out of range.
 */
export default function PresetNumberInput({
  value,
  presets,
  min,
  max,
  unit,
  onCommit,
  compact = false,
  onFocus,
  onBlur,
}: PresetNumberInputProps) {
  const isCustom = !presets.includes(value);
  const [text, setText] = useState(isCustom ? String(value) : "");
  const focused = useRef(false);

  // Sync the buffer when the value changes from outside (e.g. a preset chip was
  // clicked) — but never mid-typing, or we'd delete the user's keystrokes.
  useEffect(() => {
    if (!focused.current) setText(isCustom ? String(value) : "");
  }, [value, isCustom]);

  const s = compact
    ? { width: 48, fontSize: 11, padding: "5px 4px", border: 1, unitSize: 10, unitColor: v("--color-text-faint"), bgIdle: v("--color-bg"), colorIdle: v("--color-text-faint"), gap: 3 }
    : { width: 56, fontSize: 12, padding: "7px 4px", border: 1.5, unitSize: 11, unitColor: v("--color-text-muted"), bgIdle: v("--color-bg-muted"), colorIdle: v("--color-text-muted"), gap: 4 };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: s.gap }}>
      <input
        value={text}
        placeholder={unit}
        inputMode="numeric"
        onFocus={() => {
          focused.current = true;
          onFocus?.();
        }}
        onBlur={() => {
          focused.current = false;
          setText(isCustom ? String(value) : "");
          onBlur?.();
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, "");
          setText(raw);
          const n = parseInt(raw, 10);
          if (!isNaN(n) && n >= min && n <= max) onCommit(n);
        }}
        style={{
          width: s.width,
          textAlign: "center",
          fontSize: s.fontSize,
          fontWeight: 600,
          fontFamily: v("--font-mono"),
          color: isCustom ? v("--color-accent") : s.colorIdle,
          background: isCustom ? v("--color-accent-dim") : s.bgIdle,
          border: isCustom
            ? `${s.border}px solid ${v("--color-accent")}`
            : `${s.border}px solid ${v("--color-border")}`,
          borderRadius: v("--radius-sm"),
          padding: s.padding,
          outline: "none",
        }}
      />
      <span style={{ fontSize: s.unitSize, color: s.unitColor }}>{unit}</span>
    </span>
  );
}
