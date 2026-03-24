"use client";
import { v } from "../lib/theme";

export default function OptionCard({ selected, onClick, icon = null, label, sub }: { selected: boolean; onClick: () => void; icon?: string | null; label: string; sub: string }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "14px 8px", borderRadius: v('--radius-card'), cursor: "pointer",
      background: selected ? v('--color-accent-dim') : v('--color-bg-input'),
      border: selected ? `2px solid ${v('--color-accent')}` : `2px solid ${v('--color-border-input')}`,
      color: v('--color-text-primary'), textAlign: "center", minHeight: 78, width: "100%",
    }}>
      {icon && <div style={{ fontSize: 18, marginBottom: 3 }}>{icon}</div>}
      <div style={{ fontSize: 14, fontWeight: 700, color: v('--color-text-primary') }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: v('--color-text-secondary'), marginTop: 2, lineHeight: 1.3 }}>{sub}</div>}
    </button>
  );
}
