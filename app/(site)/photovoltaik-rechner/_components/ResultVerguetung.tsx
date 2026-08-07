"use client";
// Der Abschnitt „Einspeisung und Vergütung" im Ergebnis.
//
// Vorher stand die Einspeisung als Dreifach-Schalter samt Vergütungssatz mitten
// im Kennzahlen-Grid der Ergebnis-Karte, und die Konditionen-Frage (heute oder
// Entwurf ab 2027, Börsenerlös, Marktwert) als eigene Karte ganz unten auf der
// Seite — zwei Orte für eine Sache, und der zweite so weit weg, dass niemand
// mehr sah, was er bewirkt. Hier steht beides zusammen: oben die Entscheidung
// „speise ich ein und zu welchem Satz", darunter die Konditionen.
//
// Zugeklappt trägt der Abschnitt den gewählten Zustand in einer Zeile. Das ist
// Pflicht, kein Schmuck — eine Annahme, die man nicht sieht, ist eine, die
// niemand prüft.
import InlineEdit from "../../../../components/InlineEdit";
import GlossaryTerm from "../../../../components/GlossaryTerm";
import ResultSection from "../../../../components/ResultSection";
import ResultRegime, { type ResultRegimeProps } from "./ResultRegime";
import { v, space } from "../../../../lib/theme";

export type EinspeisungModus = "aus" | "teil" | "voll";

export interface ResultVerguetungProps extends ResultRegimeProps {
  modus: EinspeisungModus;
  setModus: (m: EinspeisungModus) => void;
  /** Volleinspeisung nicht wählbar (z. B. weil ein Speicher gewählt ist). */
  vollDisabled: boolean;
  /** Der heute geltende Satz in ct/kWh, editierbar. */
  effEinsp: number;
  setOEinsp: (v: number | null) => void;
}

const MODUS_LABEL: Record<EinspeisungModus, string> = {
  aus: "Keine Einspeisung",
  teil: "Teileinspeisung",
  voll: "Volleinspeisung",
};

function ctText(ct: number): string {
  return `${ct.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ct`;
}

export default function ResultVerguetung(props: ResultVerguetungProps) {
  const { modus, setModus, vollDisabled, effEinsp, setOEinsp, ...regime } = props;
  const reform = regime.regime === "reform2027";
  const uebergang = regime.verlauf.find((j) => j.art === "uebergang");
  const ersterSatz = uebergang ?? regime.verlauf[0];

  // Der Zustand in einer Zeile — er muss ohne Aufklappen lesbar sein.
  const summary = modus === "aus"
    ? MODUS_LABEL.aus
    : reform
      ? `${MODUS_LABEL[modus]} · Entwurf ab 2027 · ${ctText(ersterSatz?.satzCt ?? 0)}, danach ${regime.marktErloes ? "Börse" : "nichts"}`
      : `${MODUS_LABEL[modus]} · ${ctText(effEinsp)} · 20 Jahre`;

  return (
    <ResultSection title="Einspeisung und Vergütung" summary={summary}>
      {/* Speise ich überhaupt ein — und zu welchem Satz? */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: space.md, marginBottom: space.lg }}>
        <span style={{ fontSize: 13, color: v("--color-text-secondary") }}>
          <GlossaryTerm id="einspeiseverguetung">Einspeisung</GlossaryTerm>
        </span>
        <div style={{ display: "flex", gap: 2, background: v("--color-bg-muted"), borderRadius: 8, padding: 2, marginLeft: "auto" }}>
          {(["aus", "teil", "voll"] as const).map((m) => {
            const isActive = modus === m;
            const isDisabled = m === "voll" && vollDisabled;
            return (
              <button
                key={m}
                onClick={() => { if (!isDisabled) { setModus(m); setOEinsp(null); } }}
                aria-pressed={isActive}
                style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  background: isActive ? v("--color-accent") : "transparent",
                  border: "none",
                  color: isDisabled ? v("--color-text-faint") : isActive ? v("--color-text-on-accent") : v("--color-text-muted"),
                  opacity: isDisabled ? 0.4 : 1,
                  transition: "all 0.15s",
                }}
              >
                {m === "aus" ? "Aus" : m === "teil" ? "Teil" : "Voll"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Der Satz ist nur im heutigen Recht eine Zahl, die man setzen kann. Im
          Entwurf ist er ein Verlauf — dort wäre ein editierbarer Satz eine
          Eingabe, die nichts bewirkt. */}
      {modus !== "aus" && !reform && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: space.lg, fontSize: 13, color: v("--color-text-secondary"),
        }}>
          <span>Vergütungssatz</span>
          <InlineEdit value={effEinsp} onCommit={(val) => setOEinsp(val)} unit=" ct" step={0.01} min={4} max={16} width={56} />
        </div>
      )}

      {modus !== "aus" && (
        <div style={{ borderTop: `1px dashed ${v("--color-border")}`, paddingTop: space.lg }}>
          <ResultRegime {...regime} />
        </div>
      )}
    </ResultSection>
  );
}
