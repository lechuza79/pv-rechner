"use client";

import { useState } from "react";
import Modal from "../Modal";
import { v, space, pad } from "../../lib/theme";
import {
  GROESSENKLASSEN,
  GROESSENKLASSEN_WARUM,
  GROESSENKLASSE_BY_SLUG,
  spanneVon,
  type Groessenklasse,
} from "../../lib/gemeindegroesse";

//
// DER KLASSENNAME IST DER VERWEIS.
//
// Jede Rangliste im Atlas vergleicht innerhalb einer Größenklasse, und der Name
// allein verrät die Grenze nicht: „Gemeinden und Kleinstädte" sagt nicht, ab
// und bis zu welcher Einwohnerzahl er gilt. Wer das nicht weiß, liest die Liste
// als „alle Orte hier" und den Platz als etwas anderes, als er ist.
//
// KEIN ERKLÄRENDER SATZ DANEBEN (Entscheidung des Betreibers, 20.08.2026). Ein
// erster Versuch schrieb die Spanne als Zusatz unter die Liste — das war ein
// vierter handgetippter Satz und erklärte immer nur die eine Klasse, die gerade
// dran ist. Stattdessen wird der Name, der ohnehin dasteht, anklickbar: gleiche
// Zeile, kein zusätzlicher Text, und dahinter die ganze Einteilung.
//
// Die Klassen kommen aus GROESSENKLASSEN, die Spannen aus `spanneVon()`. Hier
// wird keine Grenze getippt: Wer den Zuschnitt ändert, ändert ihn einmal.

export default function GroessenklasseLink({
  klasse,
  slug,
  text,
}: {
  /** Die Klasse, um die es geht — sie wird im Fenster hervorgehoben. */
  klasse?: Groessenklasse;
  /**
   * Oder ihr Kürzel, wo der Aufrufer die Klasse nicht typisiert hat.
   *
   * Die Ranglisten-Seiten filtern über RANKING-FELDER, und das ist nicht
   * dasselbe: Neben den Größenklassen stehen dort ROLLEN (Landeshauptstädte,
   * kreisfreie Städte). Für die gibt es keine Einwohner-Spanne, also auch
   * nichts zu erklären — der Name bleibt dann schlichter Text, statt ein
   * Fenster zu öffnen, das von etwas anderem handelt.
   */
  slug?: string;
  /** Abweichender Text, falls die Stelle die Langform zeigt (Name samt Spanne,
   *  siehe `klasseLangform`). Ohne ihn steht der Name. */
  text?: string;
}) {
  const [offen, setOffen] = useState(false);
  const k = klasse ?? (slug ? GROESSENKLASSE_BY_SLUG[slug] : undefined);
  if (!k) return <>{text ?? slug ?? ""}</>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        style={S.link}
        title="Was die Größenklassen bedeuten"
      >
        {text ?? k.label}
      </button>

      <Modal
        open={offen}
        onClose={() => setOffen(false)}
        title="Größenklassen"
        intro={GROESSENKLASSEN_WARUM}
        maxWidth={480}
      >
        <div style={S.liste}>
          {GROESSENKLASSEN.map((kl) => {
            const istAktiv = k.slug === kl.slug;
            return (
              <div key={kl.slug} style={{ ...S.eintrag, ...(istAktiv ? S.eintragAktiv : null) }}>
                <span style={{ ...S.name, fontWeight: istAktiv ? 700 : 400 }}>{kl.label}</span>
                <span style={S.spanne}>{`${spanneVon(kl)} Einwohner`}</span>
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
  link: {
    // Ein Verweis IM Text, kein Knopf: Er führt nicht weg, er erklärt. Deshalb
    // erbt er Größe, Gewicht und Farbe von der Stelle, an der er steht — die
    // Überschrift der Liste soll eine Überschrift bleiben.
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
