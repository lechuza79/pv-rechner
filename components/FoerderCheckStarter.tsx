"use client";
import { useEffect, useState } from "react";
import ActionButton from "./ActionButton";
import Modal from "./Modal";
import FoerderFlow from "./FoerderFlow";
import { IconArrowRight } from "./Icons";
import { iconSizes } from "../lib/theme";
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
/** Ereignis, mit dem der Förder-Check von anderer Stelle geöffnet wird. */
export const FOERDER_CHECK_OEFFNEN = "sc:foerder-check-oeffnen";

export default function FoerderCheckStarter({
  programme,
  ortName,
  variant = "primary",
  showArrow = true,
}: {
  programme: FundingProgram[];
  ortName: string;
  variant?: "primary" | "secondary";
  showArrow?: boolean;
}) {
  const [offen, setOffen] = useState(false);

  // Von außen öffnen: Die klebende Leiste am Seitenfuß bietet den Förder-Check
  // als zweiten Weg an, steht aber in einem anderen Zweig des Baums. Statt den
  // Zustand nach oben zu ziehen (und damit die halbe Seite zur
  // Client-Komponente zu machen) hört diese Komponente auf ein Ereignis.
  // Bewusst klein gehalten: EIN Ereignisname, eine Richtung, kein Rückkanal.
  useEffect(() => {
    const auf = () => setOffen(true);
    window.addEventListener(FOERDER_CHECK_OEFFNEN, auf);
    return () => window.removeEventListener(FOERDER_CHECK_OEFFNEN, auf);
  }, []);

  return (
    <>
      <ActionButton variant={variant} onClick={() => setOffen(true)}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          Förder-Check starten {showArrow && <IconArrowRight size={iconSizes.sm} />}
        </span>
      </ActionButton>
      <Modal
        open={offen}
        onClose={() => setOffen(false)}
        title={`Förder-Check ${ortName}`}
        maxWidth={620}
      >
        <FoerderFlow programme={programme} ortName={ortName} imFenster />
      </Modal>
    </>
  );
}
