"use client";
// Gebäude der Wärmepumpe — DER gemeinsame Baustein für Haustyp, Wohnfläche,
// Dämmzustand und Heizsystem. Aus diesen vier Angaben kommt der Heizstrom, und
// der ist in fast jeder Rechnung der größte Verbrauchsposten.
//
// Bedienmuster ist die progressive Disclosure aus components/AccordionField:
// offen steht immer nur die erste unbeantwortete Frage, beantwortete klappen zu
// einer schmalen Zeile mit Wert und Stift ein. Vier Fragen gleichzeitig als
// volle Kartenraster aufzublättern ist die Fragen-Wand, die am 15.07.2026
// bewusst abgeschafft wurde — sie schiebt den Weiter-Knopf aus dem Bild und
// lässt einen aktiv gewählten Wert wie eine Vorauswahl aussehen.
//
// Derselbe Baustein im Frage-Flow UND in der Verfeinerung des Ergebnisses. Eine
// Angabe, die eine Zahl im Ergebnis bewegt, muss vom Ergebnis aus erreichbar
// sein; vorher war die Wärmepumpe dort nur ein Häkchen ohne jede Detailfrage.
import { AccordionField, ChoiceButtons, flowWahl } from "./AccordionField";
import PresetNumberInput from "./PresetNumberInput";
import { v, space } from "../lib/theme";
import {
  HAUSTYP_WP,
  HEIZSYSTEM,
  HEIZSYSTEM_SHORT,
  INSULATION_BESTAND,
  WP_M2_PRESETS,
  WP_M2_MIN,
  WP_M2_MAX,
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

// Der Name der Frage steht einmal da: als Überschrift UND als Kennzeichnung der
// Knöpfe für den Flow-Läufer. Zwei getippte Fassungen wären zwei Namen für
// dieselbe Frage, und der Läufer fände die Knöpfe nicht mehr.
const FRAGE_FLAECHE = "Wohnfläche";

export default function GebaeudeField({
  werte,
  setWerte,
  beantwortet,
  markiereBeantwortet,
  /** Welche Frage der Nutzer zum Nachbearbeiten aufgeklappt hat (null = keine).
   *  Ohne diesen Zustand liesse sich eine bereits beantwortete Frage nicht mehr
   *  öffnen — der Stift wäre Dekoration. */
  bearbeitet,
  setBearbeitet,
  daemmstufen,
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
  bearbeitet: string | null;
  setBearbeitet: (key: string | null) => void;
  /** Dämmstufen — Bestand oder Neubau. Der Wärmepumpen-Rechner kennt beide
   *  Fälle (INSULATION_NEUBAU hat andere Stufen), die PV-Rechner nur Bestand.
   *  Ohne diesen Parameter würde ein Neubau die Bestandsstufen angeboten
   *  bekommen und der Heizwärmebedarf käme um ein Vielfaches zu hoch heraus. */
  daemmstufen?: ReadonlyArray<{ label: string; sub: string }>;
  hinweis?: string;
  /** Gesetzt → „Weiß ich nicht" erscheint. Im Ergebnis weglassen: dort gibt es
   *  nichts zu überspringen, dort wird nachjustiert. */
  onWeissNicht?: () => void;
}) {
  const stufen = daemmstufen ?? INSULATION_BESTAND;
  const hat = (k: string) => beantwortet.has(k);
  const waehle = (k: string, patch: Partial<GebaeudeWerte>) => {
    setWerte(patch);
    markiereBeantwortet(k);
  };

  // Offen ist die zum Bearbeiten angeklickte Frage, sonst die erste offene.
  // Sind alle beantwortet und nichts angeklickt, ist nichts offen — dann steht
  // hier nur die Zusammenfassung samt Ergebniszeile.
  const offen = bearbeitet && (GEBAEUDE_FIELDS as readonly string[]).includes(bearbeitet)
    ? bearbeitet
    : GEBAEUDE_FIELDS.find(k => !beantwortet.has(k)) ?? null;

  return (
    <div>
      <AccordionField
        label="Haustyp"
        open={offen === F_HAUSTYP}
        answered={hat(F_HAUSTYP)}
        summary={HAUSTYP_WP[werte.haustypIdx].label}
        onEdit={() => setBearbeitet(F_HAUSTYP)}
      >
        <ChoiceButtons
          options={HAUSTYP_WP}
          columns={2}
          selected={hat(F_HAUSTYP) ? werte.haustypIdx : null}
          onSelect={i => waehle(F_HAUSTYP, { haustypIdx: i })}
          render={h => h.label}
        />
      </AccordionField>

      <AccordionField
        label={FRAGE_FLAECHE}
        open={offen === F_FLAECHE}
        answered={hat(F_FLAECHE)}
        summary={`${werte.wohnflaeche} m²`}
        onEdit={() => setBearbeitet(F_FLAECHE)}
      >
        <div style={{ display: "flex", gap: space.sm, alignItems: "center", flexWrap: "wrap" }}>
          {WP_M2_PRESETS.map((m2, mi) => {
            const aktiv = hat(F_FLAECHE) && werte.wohnflaeche === m2;
            return (
              <button
                key={m2}
                onClick={() => waehle(F_FLAECHE, { wohnflaeche: m2 })}
                {...flowWahl(FRAGE_FLAECHE, mi, aktiv)}
                style={{
                  padding: "7px 10px", borderRadius: v("--radius-sm"), fontSize: 12, fontWeight: 600, cursor: "pointer",
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
            min={WP_M2_MIN}
            max={WP_M2_MAX}
            unit="m²"
            onCommit={n => waehle(F_FLAECHE, { wohnflaeche: n })}
            onFocus={() => setBearbeitet(F_FLAECHE)}
            onBlur={() => setBearbeitet(null)}
          />
        </div>
      </AccordionField>

      <AccordionField
        label="Dämmzustand"
        open={offen === F_DAEMMUNG}
        answered={hat(F_DAEMMUNG)}
        summary={stufen[werte.insulationIdx]?.label}
        onEdit={() => setBearbeitet(F_DAEMMUNG)}
      >
        <ChoiceButtons
          options={stufen}
          columns={2}
          selected={hat(F_DAEMMUNG) ? werte.insulationIdx : null}
          onSelect={i => waehle(F_DAEMMUNG, { insulationIdx: i })}
          render={ins => ins.label}
        />
      </AccordionField>

      <AccordionField
        label="Heizsystem"
        open={offen === F_HEIZSYSTEM}
        answered={hat(F_HEIZSYSTEM)}
        summary={HEIZSYSTEM.find(h => h.id === werte.heizsystem)?.label}
        onEdit={() => setBearbeitet(F_HEIZSYSTEM)}
      >
        <ChoiceButtons
          options={HEIZSYSTEM}
          columns={3}
          selected={hat(F_HEIZSYSTEM) ? HEIZSYSTEM.findIndex(h => h.id === werte.heizsystem) : null}
          onSelect={i => waehle(F_HEIZSYSTEM, { heizsystem: HEIZSYSTEM[i].id as Heizsystem })}
          render={h => HEIZSYSTEM_SHORT[h.id]}
        />
      </AccordionField>

      {hinweis && offen === null && (
        <div className="sc-acc" style={{ fontSize: 11, color: v("--color-text-faint"), marginTop: space.xs, lineHeight: 1.5 }}>
          {hinweis}
        </div>
      )}

      {onWeissNicht && offen !== null && (
        <button
          onClick={onWeissNicht}
          style={{
            marginTop: space.md, padding: 0, border: "none", background: "transparent",
            color: v("--color-text-muted"), fontSize: 12, fontWeight: 600, cursor: "pointer",
            textDecoration: "underline", textUnderlineOffset: 3,
          }}
        >
          Weiß ich nicht — überspringen
        </button>
      )}
    </div>
  );
}
