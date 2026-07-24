"use client";

// Der Hilfe-Weg im Lead-Kasten einer Gemeinde-Seite: Porträt, Name und ein
// Textlink, der das Kontaktformular als Modal auf derselben Seite öffnet, statt
// auf /kontakt zu navigieren — die Zahlen, wegen derer jemand schreibt, bleiben
// stehen, und es entsteht gar kein "Wie komme ich hier wieder weg"-Problem.
//
// Bewusst ein Textlink, kein zweiter Knopf: Primär ist "selbst einbetten", das
// hier ist das Angebot für alle, die es nicht selbst machen wollen.
//
// Nur dieser Teil ist ein Client-Component, der Kasten drumherum bleibt
// serverseitig gerendert.

import { useState } from "react";
import Modal from "../Modal";
import ContactForm from "../ContactForm";
import ContactPerson from "../ContactPerson";
import { IconArrowRight } from "../Icons";
import { v, space, pad } from "../../lib/theme";

export default function GemeindeKontaktButton({ name }: { name: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Porträt + Name sagen bereits "hier antwortet ein Mensch" — eine
          zusätzliche Zusage darunter wäre an dieser Stelle nur Text. */}
      <ContactPerson>
        <button type="button" onClick={() => setOpen(true)} style={S.trigger}>
          Kontakt aufnehmen <IconArrowRight size={14} />
        </button>
      </ContactPerson>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        // Reiner Anzeigetext. Der Mail-Betreff kommt AUSSCHLIESSLICH aus der
        // Themen-Allowlist (initialTopic unten, serverseitig gegengeprüft) —
        // der Gemeindename darf hier stehen, aber niemals in einen Mail-Header.
        title={`Fragen zum Widget für ${name}`}
        intro={<ContactPerson note="Ich melde mich in der Regel innerhalb von 1–2 Werktagen." />}
      >
        <ContactForm
          // Festes Thema aus der Allowlist: daraus baut der Server den
          // Mail-Betreff. Der Gemeindename steht im Nachrichtentext, nie im
          // Betreff — Freitext gehört nicht in einen Mail-Header.
          initialTopic="Widget für eine Kommune"
          initialMessage={`Wir möchten die Solar-Zahlen für ${name} auf unserer Website einbinden.\n\n`}
        />
      </Modal>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  // Sekundäre Knopf-Variante des Projekts (wie ChartExportBar/ResultActions):
  // heller Grund, Akzent-Rahmen, Akzent-Schrift. Der gefüllte Akzent-Knopf
  // bleibt dem primären Weg vorbehalten — hier muss die Rangfolge sichtbar
  // bleiben: erst selbst einbetten, dann Hilfe holen.
  trigger: {
    display: "inline-flex",
    alignItems: "center",
    gap: space.sm,
    fontFamily: "inherit",
    fontSize: v("--font-size-small"),
    fontWeight: 700,
    color: v("--color-accent"),
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border-accent")}`,
    borderRadius: v("--radius-md"),
    padding: pad("md", "lg"),
    marginTop: space.md,
    cursor: "pointer",
  },
};
