"use client";

export default function OptionCard({ selected, onClick, icon = null, label, sub }: { selected: boolean; onClick: () => void; icon?: string | null; label: string; sub: string }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "14px 8px", borderRadius: 14, cursor: "pointer",
      background: selected ? "rgba(34,197,94,0.1)" : "#161616",
      border: selected ? "2px solid #22c55e" : "2px solid #2a2a2a",
      color: "#f0f0f0", textAlign: "center", minHeight: 78, width: "100%",
    }}>
      {icon && <div style={{ fontSize: 18, marginBottom: 3 }}>{icon}</div>}
      <div style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#888", marginTop: 2, lineHeight: 1.3 }}>{sub}</div>}
    </button>
  );
}
