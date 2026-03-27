"use client";
import { v } from "../lib/theme";
import { IconSun, IconBattery } from "./Icons";

const ICON_MAP: Record<string, (props: { size?: number; color?: string }) => React.JSX.Element> = {
  sun: IconSun,
  battery: IconBattery,
};

export default function OptionCard({ selected, onClick, icon = null, label, sub }: { selected: boolean; onClick: () => void; icon?: string | null; label: string; sub: string }) {
  const IconComponent = icon ? ICON_MAP[icon] : null;
  return (
    <button onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "14px 8px", borderRadius: v('--radius-md'), cursor: "pointer",
      background: selected ? v('--color-accent-dim') : v('--color-bg-muted'),
      border: selected ? `2px solid ${v('--color-accent')}` : `2px solid ${v('--color-border')}`,
      color: v('--color-text-primary'), textAlign: "center", minHeight: 78, width: "100%",
    }}>
      {IconComponent && <div style={{ marginBottom: 3 }}><IconComponent size={20} color={selected ? v('--color-accent') : v('--color-text-muted')} /></div>}
      <div style={{ fontSize: 14, fontWeight: 700, color: v('--color-text-primary') }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: v('--color-text-secondary'), marginTop: 2, lineHeight: 1.3 }}>{sub}</div>}
    </button>
  );
}
