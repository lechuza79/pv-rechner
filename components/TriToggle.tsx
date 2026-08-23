"use client";
import { v } from "../lib/theme";

export default function TriToggle({ options, value, onChange, label }: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void; label: string }) {
  // Führendes Emoji für die Kennzeichnung abschneiden: Die Beschriftungen wandern
  // in die Wegprotokolle und Fehlermeldungen des Flow-Läufers, und „⚡ Wärmepumpe:
  // Ja" ist dort weder such- noch lesbar. Dieselbe Überlegung wie bei den
  // Auswahlkarten, deren Bezeichnung schon immer aus dem Attribut kommt.
  const frage = label.replace(/^[^\p{L}]+/u, "");
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: v('--color-text-primary'), marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", gap: 6 }}>
        {options.map(o => (
          // Kennzeichnung für den Flow-Läufer. Sie fehlte bis zum 22.08.2026 —
          // mit der Folge, dass er den Großverbraucher-Schritt für einen
          // „Schritt ohne Auswahl" hielt, nur Weiter klickte und damit die
          // Wärmepumpe NIE einschaltete. Alles dahinter (Gebäude-Fragen,
          // Heizstrom im Ergebnis) hat er nie gesehen, während der Lauf „jede
          // Option jedes Schritts" meldete.
          //
          // Der Name der Frage steht vorn, weil drei Schalter nebeneinander
          // dieselben drei Beschriftungen tragen („Nein / Geplant / Ja") — ohne
          // Präfix greift der Läufer immer den ersten und prüft dreimal
          // dasselbe. `data-flow-group` hält sie auseinander, damit er beim
          // Beantworten der übrigen Fragen nicht alle drei als eine behandelt.
          <button key={o.id} onClick={() => onChange(o.id)}
            data-flow-option={`${frage}: ${o.label}`}
            data-flow-group={frage}
            aria-pressed={value === o.id}
            style={{
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
