"use client";
import { v } from "../lib/theme";

export default function TriToggle({ options, value, onChange, label }: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: v('--color-text-primary'), marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", gap: 6 }}>
        {options.map(o => (
          <button key={o.id} onClick={() => onChange(o.id)} style={{
            flex: 1, padding: "10px 8px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 600,
            cursor: "pointer", textAlign: "center",
            background: value === o.id ? v('--color-accent-dim') : v('--color-bg-muted'),
            border: value === o.id ? `2px solid ${v('--color-accent')}` : `2px solid ${v('--color-border')}`,
            color: value === o.id ? v('--color-accent') : v('--color-text-muted'),
          }}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}
