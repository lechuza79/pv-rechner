"use client";
// Dach + Ausrichtung — DER gemeinsame Baustein für alle Rechner, die einen
// PV-Ertrag ausweisen. Er liefert die zwei Angaben, aus denen lib/dach-ertrag.ts
// den Ertragsfaktor bildet, und sieht überall gleich aus: im Frage-Flow wie in
// der Verfeinerung des Ergebnisses.
//
// Vorher stand diese Abfrage genau einmal im Projekt (Einspeisevergütungs-
// Rechner) und nirgends sonst — der Hauptrechner rechnete deshalb jedes Dach
// als optimales Süddach. Wer eine zweite Fassung baut, holt genau diese Drift
// zurück.
import OptionCard from "./OptionCard";
import { v, space } from "../lib/theme";
import { DACHARTEN } from "../lib/constants";
import { dachErlaubtNord } from "../lib/dach-ertrag";
import { TILT_ORIENTATIONS, type TiltOrientation } from "../lib/tilt-config";

/** Was die Ausrichtung praktisch bedeutet — in der Reihenfolge der Matrix. */
const AUSRICHTUNG_SUB: Record<TiltOrientation, string> = {
  sued: "Voller Ertrag",
  suedostwest: "Fast voller Ertrag",
  ostwest: "Morgen- und Abendsonne",
  nord: "Deutlich weniger Ertrag",
};

export default function DachField({
  dachartIdx,
  setDachartIdx,
  ausrichtung,
  setAusrichtung,
  hinweis,
}: {
  dachartIdx: number | null;
  setDachartIdx: (i: number) => void;
  ausrichtung: TiltOrientation | null;
  setAusrichtung: (o: TiltOrientation | null) => void;
  /** Optionaler Satz unter der Abfrage (z. B. der gerechnete Ertrag). */
  hinweis?: string;
}) {
  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: v("--color-text-secondary"),
    marginBottom: space.md,
  };

  return (
    <div>
      <div style={labelStyle}>Dachform</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.md, marginBottom: space.lg }}>
        {DACHARTEN.map((d, i) => (
          <OptionCard
            key={d.id}
            selected={dachartIdx === i}
            onClick={() => {
              setDachartIdx(i);
              // Aufgeständert gibt es kein Nord — eine bereits getroffene,
              // jetzt ungültige Wahl zurücksetzen statt still weiterrechnen.
              if (!dachErlaubtNord(i) && ausrichtung === "nord") setAusrichtung(null);
            }}
            label={d.label}
            sub={d.sub}
          />
        ))}
      </div>

      {dachartIdx !== null && (
        <div className="sc-acc">
          <div style={labelStyle}>Ausrichtung der Module</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.md }}>
            {TILT_ORIENTATIONS.filter(o => o.key !== "nord" || dachErlaubtNord(dachartIdx)).map(o => (
              <OptionCard
                key={o.key}
                selected={ausrichtung === o.key}
                onClick={() => setAusrichtung(o.key)}
                label={o.label}
                sub={AUSRICHTUNG_SUB[o.key]}
              />
            ))}
          </div>
        </div>
      )}

      {hinweis && (
        <p style={{ fontSize: 13, lineHeight: 1.6, color: v("--color-text-secondary"), margin: `${space.lg}px 0 0` }}>
          {hinweis}
        </p>
      )}
    </div>
  );
}
