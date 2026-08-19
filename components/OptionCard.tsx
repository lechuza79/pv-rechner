"use client";
import { v } from "../lib/theme";

export default function OptionCard({ selected, onClick, icon = null, label, sub, group }: { selected: boolean; onClick: () => void; icon?: string | null; label: string; sub: string;
  /** Name der Frage, zu der diese Option gehört — nur nötig, wenn ein Schritt
   *  MEHRERE Fragen trägt (etwa Personen und Nutzungsprofil in einem Schritt).
   *  Der Flow-Läufer beantwortet daran die übrigen Fragen des Schritts, statt
   *  den gesperrten Weiter-Knopf für einen Fehler zu halten. Ein Schritt mit
   *  nur einer Frage braucht das Feld nicht. */
  group?: string }) {
  return (
    // data-flow-option: Der Flow-Läufer (e2e/flows.spec.ts) findet daran die
    // wählbaren Optionen eines Schritts, ohne dass ein Flow ihm seine Struktur
    // beschreiben muss. Selbe Systematik wie die Export-Marker: Der Baustein
    // meldet sich selbst an, statt dass jemand daran denken muss.
    <button onClick={onClick} data-flow-option={label} data-flow-group={group} aria-pressed={selected} style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "14px 8px", borderRadius: v('--radius-md'), cursor: "pointer",
      background: selected ? v('--color-accent-dim') : v('--color-bg-muted'),
      border: selected ? `2px solid ${v('--color-accent')}` : `2px solid ${v('--color-border')}`,
      color: v('--color-text-primary'), textAlign: "center", minHeight: 78, width: "100%",
    }}>
      {icon && <div style={{ fontSize: 18, marginBottom: 3 }}>{icon}</div>}
      <div style={{ fontSize: 14, fontWeight: 700, color: v('--color-text-primary') }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: v('--color-text-secondary'), marginTop: 2, lineHeight: 1.3 }}>{sub}</div>}
    </button>
  );
}
