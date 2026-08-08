"use client";
// Gebäude der Wärmepumpe — DER gemeinsame Baustein für Haustyp, Wohnfläche,
// Dämmzustand und Heizsystem. Aus diesen vier Angaben kommt der Heizstrom, und
// der ist in fast jeder Rechnung der größte Verbrauchsposten.
//
// Gleiches Muster wie components/DachField.tsx: jede Frage erscheint, sobald
// die vorige beantwortet ist, beantwortete bleiben sichtbar und änderbar, und
// überspringen ist erlaubt — solange die Annahme danach sichtbar wird.
//
// Derselbe Baustein im Frage-Flow UND in der Verfeinerung des Ergebnisses. Eine
// Angabe, die eine Zahl im Ergebnis bewegt, muss vom Ergebnis aus erreichbar
// sein; vorher war die Wärmepumpe dort nur ein Häkchen ohne jede Detailfrage.
import OptionCard from "./OptionCard";
import PresetNumberInput from "./PresetNumberInput";
import { v, space } from "../lib/theme";
import {
  HAUSTYP_WP,
  HEIZSYSTEM,
  INSULATION_BESTAND,
  WP_M2_PRESETS,
  type Heizsystem,
} from "../lib/constants";

export interface GebaeudeWerte {
  haustypIdx: number;
  wohnflaeche: number;
  insulationIdx: number;
  heizsystem: Heizsystem;
}

/** Die Teilfragen in Reihenfolge — EINE Quelle. Die Aufrufer verwalten den
 *  „schon beantwortet"-Zustand gemeinsam für alle Großverbraucher, deshalb
 *  tragen die Schlüssel ein Präfix und werden nicht je Seite neu getippt. */
export const GEBAEUDE_FIELDS = ["wp-haustyp", "wp-flaeche", "wp-daemmung", "wp-heizsystem"] as const;
const [F_HAUSTYP, F_FLAECHE, F_DAEMMUNG, F_HEIZSYSTEM] = GEBAEUDE_FIELDS;

export default function GebaeudeField({
  werte,
  setWerte,
  beantwortet,
  markiereBeantwortet,
  hinweis,
  onWeissNicht,
}: {
  werte: GebaeudeWerte;
  setWerte: (patch: Partial<GebaeudeWerte>) => void;
  /** Welche Teilfragen der Nutzer aktiv beantwortet hat. Ohne diese Menge wäre
   *  ein Default nicht von einer echten Wahl zu unterscheiden — die Folgefrage
   *  würde sofort mit erscheinen und die Vorauswahl sähe aus wie eine Antwort. */
  beantwortet: ReadonlySet<string>;
  markiereBeantwortet: (key: string) => void;
  hinweis?: string;
  /** Gesetzt → „Weiß ich nicht" erscheint. Im Ergebnis weglassen: dort gibt es
   *  nichts zu überspringen, dort wird nachjustiert. */
  onWeissNicht?: () => void;
}) {
  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: v("--color-text-secondary"),
    marginBottom: space.md,
  };

  const hat = (k: string) => beantwortet.has(k);
  const waehle = (k: string, patch: Partial<GebaeudeWerte>) => {
    setWerte(patch);
    markiereBeantwortet(k);
  };

  return (
    <div>
      <div style={labelStyle}>Haustyp</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.md, marginBottom: space.lg }}>
        {HAUSTYP_WP.map((h, i) => (
          <OptionCard
            key={h.id}
            selected={hat(F_HAUSTYP) && werte.haustypIdx === i}
            onClick={() => waehle(F_HAUSTYP, { haustypIdx: i })}
            label={h.label}
            sub={h.sub}
          />
        ))}
      </div>

      {hat(F_HAUSTYP) && (
        <div className="sc-acc">
          <div style={labelStyle}>Wohnfläche</div>
          <div style={{ display: "flex", gap: space.md, alignItems: "center", flexWrap: "wrap", marginBottom: space.lg }}>
            {WP_M2_PRESETS.map(m2 => {
              const aktiv = hat(F_FLAECHE) && werte.wohnflaeche === m2;
              return (
                <button
                  key={m2}
                  onClick={() => waehle(F_FLAECHE, { wohnflaeche: m2 })}
                  style={{
                    padding: "8px 12px", borderRadius: v("--radius-sm"), fontSize: 13, fontWeight: 600, cursor: "pointer",
                    background: aktiv ? v("--color-accent-dim") : v("--color-bg-muted"),
                    border: aktiv ? `1.5px solid ${v("--color-accent")}` : `1.5px solid ${v("--color-border")}`,
                    color: aktiv ? v("--color-accent") : v("--color-text-muted"),
                  }}
                >
                  {m2} m²
                </button>
              );
            })}
            <PresetNumberInput
              value={werte.wohnflaeche}
              presets={WP_M2_PRESETS}
              min={20}
              max={1000}
              unit="m²"
              onCommit={n => waehle(F_FLAECHE, { wohnflaeche: n })}
            />
          </div>
        </div>
      )}

      {hat(F_FLAECHE) && (
        <div className="sc-acc">
          <div style={labelStyle}>Dämmzustand</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.md, marginBottom: space.lg }}>
            {INSULATION_BESTAND.map((ins, i) => (
              <OptionCard
                key={ins.label}
                selected={hat(F_DAEMMUNG) && werte.insulationIdx === i}
                onClick={() => waehle(F_DAEMMUNG, { insulationIdx: i })}
                label={ins.label}
                sub={ins.sub}
              />
            ))}
          </div>
        </div>
      )}

      {hat(F_DAEMMUNG) && (
        <div className="sc-acc">
          <div style={labelStyle}>Heizsystem</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.md }}>
            {HEIZSYSTEM.map(h => (
              <OptionCard
                key={h.id}
                selected={hat(F_HEIZSYSTEM) && werte.heizsystem === h.id}
                onClick={() => waehle(F_HEIZSYSTEM, { heizsystem: h.id as Heizsystem })}
                label={h.label}
                sub={h.sub}
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

      {onWeissNicht && (
        <button
          onClick={onWeissNicht}
          style={{
            marginTop: space.lg, padding: 0, border: "none", background: "transparent",
            color: v("--color-text-muted"), fontSize: 13, fontWeight: 600, cursor: "pointer",
            textDecoration: "underline", textUnderlineOffset: 3,
          }}
        >
          Weiß ich nicht — überspringen
        </button>
      )}
    </div>
  );
}
