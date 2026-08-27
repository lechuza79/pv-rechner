"use client";

import { useId, useState } from "react";
import { v, space } from "../lib/theme";
import { FundingConditions, FundingRates } from "./FundingProgramParts";
import { type FundingProgram, type FundingTechnik } from "../lib/funding-programs";

/**
 * Beschriftung der Filter — bewusst NICHT `FUNDING_TECHNIK_LABEL`.
 *
 * Dort heißt „pv" schlicht „Photovoltaik", und das ist im Rechner-Satz
 * („kein Programm für Photovoltaik") auch richtig. Nebeneinander gestellt wäre
 * es irreführend: Ein Balkonkraftwerk IST Photovoltaik, die beiden läsen sich
 * als Ober- und Unterbegriff statt als Alternative. Was sie unterscheidet, ist
 * der Ort — Dach oder Balkon.
 */
const FILTER_LABEL: Record<FundingTechnik, string> = {
  pv: "Dachanlage",
  balkon: "Balkonkraftwerk",
  waermepumpe: "Wärmepumpe",
};

/** So viele Bedingungen stehen offen, bevor der Rest hinter „mehr" verschwindet. */
const BEDINGUNGEN_SICHTBAR = 5;

/**
 * Bedingungen und Konditionen eines Programms, filterbar nach Technik.
 *
 * WARUM (26.08.2026): Niddas Karte zeigte neun Bedingungen in einer Liste,
 * darunter „mindestens 4 kWp" und „höchstens zwei Module je Haushalt". Für sich
 * genommen stimmt beides; nebeneinander schließen sie einander aus. Wer sein
 * Balkonkraftwerk plante, las eine Mindestgröße, die ihn gar nicht betrifft, und
 * rechnete sich heraus — eine Bedingung am falschen Ort ist eine falsche
 * Auskunft, nicht bloß eine überflüssige.
 *
 * FILTER, NICHT REITER, und der Standard ist UNGEFILTERT (Betreiber-Entscheidung
 * 26.08.2026). Der Unterschied ist mehr als ein Wort: Reiter zeigen immer nur
 * einen Ausschnitt, also stünde beim Laden die Hälfte der Bedingungen weder auf
 * der Seite noch im ausgelieferten HTML. Ein Filter beginnt vollständig und
 * grenzt auf Wunsch ein. Ein zweiter Klick auf denselben Knopf hebt ihn wieder
 * auf — dafür braucht es keinen dritten Knopf „alle".
 *
 * KEINE FILTER, WO ES NICHTS ZU TRENNEN GIBT. 85 der 110 Programme fördern genau
 * eine Technik. Und auch bei mehreren erscheinen sie nur, wenn wirklich etwas
 * technikgebunden ist — sonst zeigte jeder Filter dasselbe, was schlimmer ist als
 * keiner: Es sieht nach einem Unterschied aus, den es nicht gibt.
 */
export default function FundingTechnikTabs({
  program,
  datenBoxStyle,
  knopfStil,
}: {
  program: FundingProgram;
  /** Rahmen der beiden Spalten — kommt von der Seite, damit die Karte gleich aussieht. */
  datenBoxStyle: React.CSSProperties;
  /**
   * Aussehen der Filter im ABGEWÄHLTEN Zustand — dasselbe wie beim Verweis auf
   * die Amtsseite oben. Beide sind Nebenwege neben dem einen primären Knopf und
   * sollen als dieselbe Sorte Element lesbar sein; durchgereicht statt hier
   * nachgebaut, weil zwei Fassungen desselben Knopfes auseinanderlaufen.
   */
  knopfStil: React.CSSProperties;
}) {
  const techniken = (program.foerdert ?? ["pv"]) as FundingTechnik[];
  // Gibt es überhaupt etwas zu trennen? Geprüft wird die Wirkung, nicht die
  // Absicht: Ein `foerdert` mit zwei Einträgen genügt nicht, solange keine
  // einzige Zeile auf eine Technik zeigt.
  const trennbar =
    techniken.length > 1 &&
    (program.conditions.some((c) => typeof c !== "string") || program.rates.some((r) => r.nur));

  const [filter, setFilter] = useState<FundingTechnik | null>(null);
  const id = useId();
  const gezeigt = trennbar && filter ? filter : undefined;

  return (
    <>
      {trennbar && (
        <div style={{ display: "flex", alignItems: "center", gap: space.sm, marginTop: space.lg, flexWrap: "wrap" }}>
          <span style={{ fontSize: "var(--font-size-caption)", fontWeight: 700, color: v("--color-text-secondary") }}>
            Gefördert werden:
          </span>
          {techniken.map((t) => {
            const an = t === filter;
            return (
              <button
                key={t}
                aria-pressed={an}
                aria-controls={`${id}-inhalt`}
                onClick={() => setFilter(an ? null : t)}
                style={{
                  ...knopfStil,
                  cursor: "pointer",
                  ...(an
                    ? { border: "1px solid transparent", background: v("--color-accent"), color: v("--color-text-on-accent") }
                    : {}),
                }}
              >
                {FILTER_LABEL[t]}
              </button>
            );
          })}
        </div>
      )}

      <div
        id={`${id}-inhalt`}
        className="foerder-spalten"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          alignItems: "stretch",
          marginTop: trennbar ? 16 : 36,
        }}
      >
        <div style={datenBoxStyle}>
          <FundingConditions
            conditions={program.conditions}
            eligibility={program.eligibility}
            technik={gezeigt}
            zeigeErste={BEDINGUNGEN_SICHTBAR}
          />
        </div>
        <div style={datenBoxStyle}>
          <FundingRates rates={program.rates} bordered label="Konditionen" technik={gezeigt} />
          {program.maxFoerderung && istDachSicht(gezeigt) && (
            /* Wie eine Konditionszeile gesetzt, nicht als Fließtext: Es IST eine
               Kondition — Beschriftung links, Betrag rechts in der Zahlen-Schrift. */
            <FundingRates rates={[{ label: "Höchstbetrag", value: program.maxFoerderung.replace(/^max\.\s*/, "") }]} />
          )}
        </div>
      </div>
    </>
  );
}

/**
 * Der Gesamt-Höchstbetrag beschreibt in aller Regel die Dachanlage.
 *
 * Bei Nidda stand er als „1.500 € (Dachanlage + Speicher)" auch unter dem
 * Balkonkraftwerk und behauptete dort einen Deckel, der siebeneinhalbmal über
 * dem echten liegt (200 €). Ein Betrag am falschen Ort ist schlimmer als keiner:
 * Er sieht aus wie eine Auskunft.
 *
 * Ungefiltert wird er weiter gezeigt — dort steht er neben allen Sätzen und ist
 * durch seinen eigenen Zusatz („Dachanlage + Speicher") eindeutig.
 */
function istDachSicht(technik: FundingTechnik | undefined): boolean {
  return technik === undefined || technik === "pv" || technik === "waermepumpe";
}
