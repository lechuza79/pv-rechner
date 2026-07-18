"use client";
// Progressive-Disclosure-Bausteine für den Großverbraucher-Step des PV-Rechners.
// Statt alle Detailfragen eines Verbrauchers auf einmal zu zeigen, wird immer nur
// die erste offene Frage aufgeklappt (ohne Vorauswahl). Nach der Wahl klappt sie
// zu einer kompakten Zusammenfassungs-Zeile ein (Label + Wert + Edit), die nächste
// Frage öffnet. Ein Klick auf die Edit-Zeile öffnet die Frage wieder.
import { ReactNode } from "react";
import { v, iconSizes } from "../lib/theme";
import { IconEdit } from "./Icons";

export function AccordionField({
  label,
  open,
  answered,
  summary,
  onEdit,
  children,
}: {
  label: string;
  /** True, wenn diese Frage gerade die aufgeklappte ist. */
  open: boolean;
  /** True, sobald der Nutzer eine Wahl getroffen hat. */
  answered: boolean;
  /** Kompakte Anzeige des gewählten Werts (nur wenn eingeklappt). */
  summary?: ReactNode;
  onEdit: () => void;
  children: ReactNode;
}) {
  if (open) {
    return (
      <div className="sc-acc" style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: v("--color-text-secondary"), marginBottom: 6 }}>{label}</div>
        {children}
      </div>
    );
  }
  if (answered) {
    return (
      <button
        className="sc-acc"
        onClick={onEdit}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "9px 12px",
          marginBottom: 8,
          borderRadius: v("--radius-sm"),
          background: v("--color-bg-muted"),
          border: `1px solid ${v("--color-border")}`,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: v("--color-text-secondary") }}>{label}</span>
        <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: v("--color-text-primary") }}>{summary}</span>
        <IconEdit size={iconSizes.sm} color={v("--color-text-muted")} />
      </button>
    );
  }
  return null;
}

/** Reihe/Grid aus Auswahl-Buttons mit optionaler „keine Vorauswahl"-Anzeige
 *  (selected === null → nichts hervorgehoben). Deckt alle Detail-Fragen ab. */
export function ChoiceButtons<T>({
  options,
  selected,
  onSelect,
  columns,
  render,
}: {
  options: readonly T[];
  /** Index der aktiven Wahl, oder null wenn noch nichts gewählt wurde. */
  selected: number | null;
  onSelect: (i: number) => void;
  /** Anzahl Grid-Spalten. Ohne Angabe: Flex-Reihe. */
  columns?: number;
  render: (option: T, i: number) => ReactNode;
}) {
  return (
    <div
      style={
        columns
          ? { display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 6 }
          : { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }
      }
    >
      {options.map((o, i) => {
        const active = selected === i;
        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            style={{
              padding: columns ? "8px 4px" : "7px 12px",
              borderRadius: v("--radius-sm"),
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "center",
              background: active ? v("--color-accent-dim") : v("--color-bg-muted"),
              border: active ? `1.5px solid ${v("--color-accent")}` : `1.5px solid ${v("--color-border")}`,
              color: active ? v("--color-accent") : v("--color-text-muted"),
            }}
          >
            {render(o, i)}
          </button>
        );
      })}
    </div>
  );
}
