"use client";

import { useState } from "react";
import Modal from "../Modal";
import { v, space, pad } from "../../lib/theme";
import {
  GROESSENKLASSEN,
  GROESSENKLASSEN_WARUM,
  spanneVon,
  type Groessenklasse,
} from "../../lib/gemeindegroesse";

//
// DIE EINE ERKLÄRUNG DER GRÖSSENKLASSEN.
//
// Jede Rangliste im Atlas vergleicht innerhalb einer Größenklasse, und der
// Gruppenname allein verrät die Grenze nicht: „Gemeinden und Kleinstädte" sagt
// nicht, dass damit 5.000 bis 19.999 Einwohner gemeint sind. Wer das nicht
// weiß, liest die Liste als „alle Orte hier" und den Platz als etwas anderes,
// als er ist.
//
// WARUM EIN FENSTER UND KEIN SATZ AN JEDER LISTE (Entscheidung des Betreibers,
// 20.08.2026): Ein Satz erklärt immer nur die eine Klasse, die gerade dran ist,
// und kostet auf jeder Seite Platz. Das Fenster zeigt die ganze Einteilung,
// hebt die aktuelle hervor — und wird an einer Stelle gepflegt. Vorher stand
// die Begründung in drei handgetippten Fassungen im Code, und keine davon
// nannte die Klassen.
//
// Die Klassen selbst kommen aus GROESSENKLASSEN, die Spannen aus `spanneVon()`.
// Hier wird keine Grenze getippt: Wer den Zuschnitt ändert, ändert ihn einmal.

export default function GroessenklassenHinweis({
  aktiv,
  praefix,
}: {
  /** Die Klasse, in der die aufrufende Liste gerade vergleicht — sie wird
   *  hervorgehoben. Ohne sie zeigt das Fenster nur die Einteilung. */
  aktiv?: Groessenklasse | null;
  /** Text vor dem Verweis, z. B. „Prozentzahl: Abstand zur Spitze dieser Liste." */
  praefix?: string;
}) {
  const [offen, setOffen] = useState(false);

  return (
    <>
      <span style={S.zeile}>
        {praefix ? `${praefix} ` : ""}
        <button type="button" onClick={() => setOffen(true)} style={S.link}>
          {aktiv ? `Größenklasse: ${aktiv.label}` : "Größenklassen"}
        </button>
      </span>

      <Modal
        open={offen}
        onClose={() => setOffen(false)}
        title="Größenklassen"
        intro={GROESSENKLASSEN_WARUM}
        maxWidth={480}
      >
        <div style={S.liste}>
          {GROESSENKLASSEN.map((k) => {
            const istAktiv = aktiv?.slug === k.slug;
            return (
              <div key={k.slug} style={{ ...S.eintrag, ...(istAktiv ? S.eintragAktiv : null) }}>
                <span style={{ ...S.name, fontWeight: istAktiv ? 700 : 400 }}>{k.label}</span>
                <span style={S.spanne}>{`${spanneVon(k)} Einwohner`}</span>
              </div>
            );
          })}
        </div>
        {/* Was die Einteilung NICHT kann, gehört dazu: Ohne Einwohnerzahl gibt
            es keine Pro-Kopf-Zahl und damit keine Klasse. Das betrifft wenige
            Orte, aber wer dort steht, sucht sonst vergeblich nach seiner
            Zeile. */}
        <p style={S.fuss}>
          Orte ohne hinterlegte Einwohnerzahl stehen in keiner dieser Listen — ohne sie lässt sich
          nichts je Einwohner rechnen.
        </p>
      </Modal>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  zeile: { fontSize: 11, color: v("--color-text-muted") },
  link: {
    // Ein Verweis im Fließtext, kein Knopf: Er führt nicht weg, er erklärt.
    background: "none",
    border: "none",
    padding: 0,
    font: "inherit",
    color: "inherit",
    textDecoration: "underline",
    textDecorationStyle: "dotted",
    textUnderlineOffset: 3,
    cursor: "pointer",
  },
  liste: { display: "flex", flexDirection: "column", gap: 2 },
  eintrag: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: space.md,
    padding: pad("xs", "sm"),
    borderRadius: 8,
  },
  eintragAktiv: { background: v("--color-bg-accent") },
  name: { fontSize: v("--font-size-body"), color: v("--color-text-primary") },
  spanne: { fontFamily: v("--font-mono"), fontSize: 11, color: v("--color-text-secondary") },
  fuss: { fontSize: 11, color: v("--color-text-muted"), margin: `${space.md}px 0 0` },
};
