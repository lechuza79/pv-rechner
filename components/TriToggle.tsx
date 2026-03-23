"use client";

export default function TriToggle({ options, value, onChange, label }: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0", marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", gap: 6 }}>
        {options.map(o => (
          <button key={o.id} onClick={() => onChange(o.id)} style={{
            flex: 1, padding: "10px 8px", borderRadius: 10, fontSize: 13, fontWeight: 600,
            cursor: "pointer", textAlign: "center",
            background: value === o.id ? "rgba(34,197,94,0.1)" : "#161616",
            border: value === o.id ? "2px solid #22c55e" : "2px solid #2a2a2a",
            color: value === o.id ? "#22c55e" : "#999",
          }}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}
