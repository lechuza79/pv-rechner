"use client";
// Progressive-Disclosure-Bausteine für den Großverbraucher-Step des PV-Rechners.
// Statt alle Detailfragen eines Verbrauchers auf einmal zu zeigen, wird immer nur
// die erste offene Frage aufgeklappt (ohne Vorauswahl). Nach der Wahl klappt sie
// zu einer kompakten Zusammenfassungs-Zeile ein (Label + Wert + Edit), die nächste
// Frage öffnet. Ein Klick auf die Edit-Zeile öffnet die Frage wieder.
import { ReactNode, createContext, useContext } from "react";
import { v, iconSizes } from "../lib/theme";
import { IconEdit } from "./Icons";

// ─── Kennzeichnung für den Flow-Läufer ───────────────────────────────────────
//
// Eine Akkordeon-Frage ist ein ANDERES Bedienelement als eine Auswahlkarte, und
// sie braucht deshalb eine eigene Kennzeichnung (`data-flow-wahl` statt
// `data-flow-option`): Ihre Knöpfe verschwinden nach der Wahl, weil die Frage
// zu einer Zeile einklappt. Der Läufer kann an ihnen also nicht ablesen, was
// gewählt ist — er muss die Frage wieder aufklappen. Genau das ist der Grund
// für diese Attribute.
//
// Anlass (22.08.2026): Der Läufer sah diese Fragen ÜBERHAUPT NICHT. Dachform,
// Ausrichtung, Neigung, Gebäude — alles, was auf diesem Baustein sitzt — trug
// keine Kennzeichnung, und der Lauf meldete trotzdem „jede Option jedes
// Schritts geprüft". So kam ein Fehler durch, bei dem ein Klick auf
// „Flachdach" wieder „Satteldach" hinterließ.
//
// Der Name der Frage ist der Schlüssel: Er hängt am eingeklappten Streifen
// (zum Wiederaufklappen) und am aufgeklappten Block (zum Wiederfinden der
// Knöpfe). Weitergereicht wird er über den Kontext, damit ein Aufrufer ihn
// nicht ein zweites Mal hinschreiben muss — eine zweite Stelle wäre eine, die
// beim nächsten neuen Feld vergessen wird.
const FlowFrage = createContext<string | null>(null);

/** Attribute für einen Auswahl-Knopf einer Akkordeon-Frage. */
export function flowWahl(frage: string, index: number, aktiv: boolean) {
  return { "data-flow-wahl": String(index), "data-flow-frage": frage, "aria-pressed": aktiv };
}

/** Dasselbe für Knöpfe, die INNERHALB des Akkordeons gerendert werden und den
 *  Namen der Frage damit aus dem Kontext bekommen (`ChoiceButtons`).
 *
 *  Für handgebaute Knopfreihen taugt der Kontext NICHT: Sie entstehen im JSX
 *  des Aufrufers, also außerhalb des Providers, und ein Hook dort liest den
 *  leeren Außen-Kontext. Das Ergebnis wäre ein Knopf ohne Namen der Frage —
 *  der Läufer findet ihn nicht und hängt 20 Sekunden an einem Element, das es
 *  nicht gibt (so geschehen beim ersten Lauf). Die tragen ihren Namen deshalb
 *  über `flowWahl(name, …)` selbst herein. */
export function useFlowWahl() {
  const frage = useContext(FlowFrage);
  return (index: number, aktiv: boolean) => flowWahl(frage ?? "", index, aktiv);
}

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
      <div className="sc-acc" data-flow-akkordeon-offen={label} style={{ marginBottom: 22 }}>
        <div style={{ fontSize: v("--font-size-small"), fontWeight: 600, color: v("--color-text-secondary"), marginBottom: 6 }}>{label}</div>
        <FlowFrage.Provider value={label}>{children}</FlowFrage.Provider>
      </div>
    );
  }
  if (answered) {
    return (
      <button
        className="sc-acc"
        data-flow-akkordeon={label}
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
        <span style={{ fontSize: v("--font-size-small"), fontWeight: 600, color: v("--color-text-secondary") }}>{label}</span>
        <span style={{ marginLeft: "auto", fontSize: v("--font-size-small"), fontWeight: 700, color: v("--color-text-primary") }}>{summary}</span>
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
  const flowWahl = useFlowWahl();
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
            {...flowWahl(i, active)}
            style={{
              padding: columns ? "8px 4px" : "7px 12px",
              borderRadius: v("--radius-sm"),
              fontSize: v("--font-size-small"),
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
