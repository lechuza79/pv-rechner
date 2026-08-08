"use client";
// Dach → Ertrag: Dachform, Ausrichtung und Neigung — DER gemeinsame Baustein.
//
// Gleiches Bedienmuster wie components/GebaeudeField: offen steht immer nur die
// erste unbeantwortete Frage, beantwortete klappen zu einer schmalen Zeile mit
// Wert und Stift ein.
//
// Die NEIGUNG ist bewusst keine Pflichtfrage. Gemessen an der Matrix liegen
// zwischen 30° und 50° nach Süden ganze 1 Prozentpunkt — die typische Neigung
// der Dachform reicht dort völlig. Nach Norden sind es bis zu 27 Punkte
// (Pultdach, 5° gegen 30°); dort klappt die Frage von selbst auf, weil Raten
// teuer wird. Sonst ist sie eine Verfeinerung für die, die es genau wissen.
//
// Beim Flachdach lautet die Frage anders: nicht „wie steil", sondern ob die
// Module aufgeständert sind — eine Entscheidung, die man kennt, und nach Süden
// 9 Punkte wert. Die Stufen kommen aus lib/dach-ertrag.ts, nicht von hier.
import { AccordionField, ChoiceButtons } from "./AccordionField";
import PresetNumberInput from "./PresetNumberInput";
import { v, space } from "../lib/theme";
import { DACHARTEN } from "../lib/constants";
import { dachErlaubtNord, neigungsStufen, neigungLohntNachfrage } from "../lib/dach-ertrag";
import { TILT_ORIENTATIONS, type TiltOrientation } from "../lib/tilt-config";

export const DACH_FIELDS = ["dach-form", "dach-ausrichtung", "dach-neigung"] as const;
const [F_FORM, F_AUSRICHTUNG, F_NEIGUNG] = DACH_FIELDS;

/** Was die Ausrichtung für den Ertrag bedeutet — Klartext statt Himmelsrichtung
 *  allein, damit die Wahl nicht wie eine Geschmacksfrage aussieht. */
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
  neigungGrad,
  setNeigungGrad,
  beantwortet,
  markiereBeantwortet,
  bearbeitet,
  setBearbeitet,
  hinweis,
  onWeissNicht,
}: {
  dachartIdx: number | null;
  setDachartIdx: (i: number) => void;
  ausrichtung: TiltOrientation | null;
  setAusrichtung: (o: TiltOrientation | null) => void;
  /** null = nicht angegeben → es gilt die typische Neigung der Dachform. */
  neigungGrad: number | null;
  setNeigungGrad: (g: number | null) => void;
  beantwortet: ReadonlySet<string>;
  markiereBeantwortet: (key: string) => void;
  bearbeitet: string | null;
  setBearbeitet: (key: string | null) => void;
  hinweis?: string;
  /** Gesetzt → „Weiß ich nicht" erscheint. Im Ergebnis weglassen. */
  onWeissNicht?: () => void;
}) {
  const hat = (k: string) => beantwortet.has(k);
  const stufen = neigungsStufen(dachartIdx);
  const dach = dachartIdx !== null ? DACHARTEN[dachartIdx] : null;

  // Die Neigung zählt nur als offene Frage, wenn sie hier überhaupt etwas
  // bewegt — sonst wäre sie ein Pflichtschritt für einen Prozentpunkt.
  const neigungOffenNoetig = neigungLohntNachfrage(ausrichtung) && !hat(F_NEIGUNG);
  const naechsteOffene = !hat(F_FORM)
    ? F_FORM
    : !hat(F_AUSRICHTUNG)
      ? F_AUSRICHTUNG
      : neigungOffenNoetig
        ? F_NEIGUNG
        : null;
  const offen = bearbeitet && (DACH_FIELDS as readonly string[]).includes(bearbeitet)
    ? bearbeitet
    : naechsteOffene;

  const neigungSummary = () => {
    if (!dach) return "";
    // Die Annahme wird in derselben Sprache beschrieben wie die Auswahl. Beim
    // Flachdach sind die Optionen „Flach aufgelegt" und „Aufgeständert" — dort
    // wäre „typisch 10°" eine Antwort auf eine Frage, die gar nicht gestellt
    // wird (die Modellannahme dahinter IST eine Aufständerung, siehe DACHARTEN).
    if (neigungGrad == null) {
      return dach.aufgestaendert ? "üblich: aufgeständert" : `typisch ${dach.typNeigung}°`;
    }
    const stufe = stufen.find(s => s.grad === neigungGrad);
    return stufe ? stufe.label : `${neigungGrad}°`;
  };

  return (
    <div>
      <AccordionField
        label="Dachform"
        open={offen === F_FORM}
        answered={hat(F_FORM)}
        summary={dach?.label}
        onEdit={() => setBearbeitet(F_FORM)}
      >
        <ChoiceButtons
          options={DACHARTEN}
          columns={2}
          selected={hat(F_FORM) ? dachartIdx : null}
          onSelect={i => {
            setDachartIdx(i);
            // Aufgeständert kennt kein Nord, und die Neigungsstufen sind je
            // Dachform andere — beides zurücksetzen statt einen Wert stehen zu
            // lassen, der zur neuen Form nicht passt.
            if (!dachErlaubtNord(i) && ausrichtung === "nord") setAusrichtung(null);
            setNeigungGrad(null);
            markiereBeantwortet(F_FORM);
          }}
          render={d => d.label}
        />
      </AccordionField>

      <AccordionField
        label="Ausrichtung"
        open={offen === F_AUSRICHTUNG}
        answered={hat(F_AUSRICHTUNG)}
        summary={TILT_ORIENTATIONS.find(o => o.key === ausrichtung)?.label}
        onEdit={() => setBearbeitet(F_AUSRICHTUNG)}
      >
        <ChoiceButtons
          options={TILT_ORIENTATIONS.filter(o => dachErlaubtNord(dachartIdx) || o.key !== "nord")}
          columns={2}
          selected={
            hat(F_AUSRICHTUNG)
              ? TILT_ORIENTATIONS.filter(o => dachErlaubtNord(dachartIdx) || o.key !== "nord")
                  .findIndex(o => o.key === ausrichtung)
              : null
          }
          onSelect={i => {
            const liste = TILT_ORIENTATIONS.filter(o => dachErlaubtNord(dachartIdx) || o.key !== "nord");
            setAusrichtung(liste[i].key);
            markiereBeantwortet(F_AUSRICHTUNG);
          }}
          render={o => o.label}
        />
        <div style={{ fontSize: 11, color: v("--color-text-faint"), marginTop: space.sm, lineHeight: 1.5 }}>
          {ausrichtung ? AUSRICHTUNG_SUB[ausrichtung] : "Wohin zeigt die Fläche mit den Modulen?"}
        </div>
      </AccordionField>

      {hat(F_AUSRICHTUNG) && stufen.length > 0 && (
        <AccordionField
          label={dach?.aufgestaendert ? "Montage" : "Dachneigung"}
          open={offen === F_NEIGUNG}
          /* Sichtbar als Zeile, sobald die Ausrichtung steht — auch unbeantwortet.
             Sonst käme niemand an die Frage heran, wo sie nicht von selbst
             aufklappt (also überall außer Nord), und die Verfeinerung wäre für
             genau die Leute unerreichbar, für die es sie gibt. Die Zeile trägt
             dann die geltende Annahme („typisch 35°"). */
          answered={hat(F_AUSRICHTUNG)}
          summary={neigungSummary()}
          onEdit={() => setBearbeitet(F_NEIGUNG)}
        >
          <div style={{ display: "flex", gap: space.sm, alignItems: "center", flexWrap: "wrap" }}>
            {stufen.map(s => {
              const aktiv = hat(F_NEIGUNG) && neigungGrad === s.grad;
              return (
                <button
                  key={s.grad}
                  onClick={() => { setNeigungGrad(s.grad); markiereBeantwortet(F_NEIGUNG); }}
                  title={s.sub}
                  style={{
                    padding: "7px 12px", borderRadius: v("--radius-sm"), fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: aktiv ? v("--color-accent-dim") : v("--color-bg-muted"),
                    border: aktiv ? `1.5px solid ${v("--color-accent")}` : `1.5px solid ${v("--color-border")}`,
                    color: aktiv ? v("--color-accent") : v("--color-text-muted"),
                  }}
                >
                  {s.label}
                </button>
              );
            })}
            {/* Freie Gradzahl neben den Schnellwahlen. Die Stufen sind Übliches,
                keine Grenze: wer seine Neigung kennt (10° statt 15° bei einer
                Aufständerung, 38° statt 35° beim Satteldach), trägt sie ein.
                Die Matrix rundet auf ihre nächste Zeile — bewusst keine
                Interpolation, das wäre Scheingenauigkeit. */}
            <PresetNumberInput
              value={neigungGrad ?? dach?.typNeigung ?? 35}
              presets={stufen.map(s => s.grad)}
              min={0}
              max={90}
              unit="°"
              onCommit={n => { setNeigungGrad(n); markiereBeantwortet(F_NEIGUNG); }}
              onFocus={() => setBearbeitet(F_NEIGUNG)}
              onBlur={() => setBearbeitet(null)}
            />
          </div>
          <div style={{ fontSize: 11, color: v("--color-text-faint"), marginTop: space.sm, lineHeight: 1.5 }}>
            {hat(F_NEIGUNG)
              /* Sobald etwas angegeben ist, wäre „ohne Angabe rechnen wir mit …"
                 schlicht falsch — der Satz beschriebe einen Zustand, der nicht
                 mehr gilt. Dann zählt nur noch, was die Zahl bewirkt. */
              ? "Die Matrix rundet auf die nächste dokumentierte Neigung — ein Grad mehr oder weniger ändert nichts."
              : neigungLohntNachfrage(ausrichtung)
                ? "Nach Norden entscheidet die Neigung am meisten: flach bringt deutlich mehr als steil."
                : dach?.aufgestaendert
                  /* Beim Flachdach ist die Annahme eine Aufständerung, keine
                     Gradzahl — sie muss auch so beschrieben werden. */
                  ? "Ohne Angabe rechnen wir mit einer üblichen Aufständerung. Eigene Gradzahl geht auch."
                  : `Ohne Angabe rechnen wir mit ${dach?.typNeigung}° — bei dieser Ausrichtung macht die Neigung kaum einen Unterschied.`}
          </div>
        </AccordionField>
      )}

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
