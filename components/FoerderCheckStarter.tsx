"use client";
import { useState } from "react";
import Modal from "./Modal";
import FoerderFlow from "./FoerderFlow";
import { IconArrowRight } from "./Icons";
import { v, iconSizes, space, pad } from "../lib/theme";
import type { FundingProgram } from "../lib/funding-programs";

/**
 * Einstieg in den Förder-Check aus der Förderkarte heraus.
 *
 * Der Check steht bewusst NICHT als offener Abschnitt auf der Seite: Er ist
 * kein Inhalt zum Lesen, sondern ein Werkzeug, das man startet. Aufgeklappt
 * unterhalb der Karte stand er als zweites, konkurrierendes Angebot da und
 * schob die Beispielrechnungen nach unten, obwohl ihn niemand angefordert
 * hatte. Im Fenster ist er da, wenn er gebraucht wird, und sonst nicht.
 */
export default function FoerderCheckStarter({
  programme,
  ortName,
}: {
  programme: FundingProgram[];
  ortName: string;
}) {
  const [offen, setOffen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOffen(true)} style={knopf}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          Förder-Check starten <IconArrowRight size={iconSizes.sm} />
        </span>
      </button>
      <Modal
        open={offen}
        onClose={() => setOffen(false)}
        title={`Bekommst du die Förderung in ${ortName}?`}
        maxWidth={620}
      >
        <FoerderFlow programme={programme} ortName={ortName} />
      </Modal>
    </>
  );
}

const knopf: React.CSSProperties = {
  alignSelf: "flex-start",
  marginTop: space.md,
  padding: pad("sm", "lg"),
  borderRadius: v("--radius-md"),
  fontSize: "var(--font-size-body)",
  fontWeight: 700,
  background: v("--color-accent"),
  color: v("--color-text-on-accent"),
  border: "none",
  cursor: "pointer",
};
