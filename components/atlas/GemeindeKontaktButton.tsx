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
import { v } from "../../lib/theme";

export default function GemeindeKontaktButton({ name }: { name: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Porträt + Name sagen bereits "hier antwortet ein Mensch" — eine
          zusätzliche Zusage darunter wäre an dieser Stelle nur Text. */}
      <ContactPerson>
        <button type="button" onClick={() => setOpen(true)} style={S.trigger}>
          Kontakt aufnehmen
        </button>
      </ContactPerson>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Widget einrichten lassen"
        intro={
          <ContactPerson
            note={`Ich melde mich in der Regel innerhalb von 1–2 Werktagen. Die Angaben zu ${name} sind schon eingetragen — ergänzen Sie einfach, worum es geht.`}
          />
        }
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
  trigger: {
    display: "block",
    fontFamily: "inherit",
    fontSize: 13,
    color: v("--color-accent"),
    fontWeight: 600,
    background: "none",
    border: "none",
    padding: 0,
    marginTop: 2,
    cursor: "pointer",
    textAlign: "left",
    textDecoration: "underline",
    textUnderlineOffset: 3,
  },
};
