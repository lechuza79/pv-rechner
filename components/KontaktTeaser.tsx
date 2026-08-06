"use client";

// Der Kontakt-Teaser: ein Satz, der den Kontakt-Weg einleitet, darunter
// Porträt + Name und ein Textlink, der das Kontaktformular als Modal auf
// DERSELBEN Seite öffnet, statt auf /kontakt zu navigieren — der Inhalt,
// wegen dessen jemand schreibt, bleibt stehen.
//
// Verallgemeinert aus dem Hilfe-Block der Gemeinde-Seiten (GemeindeEmbedBox):
// dieselbe Fläche, derselbe Aufbau, an jeder Stelle gleich. Wer einen
// Kontakt-Einstieg braucht, nimmt diesen Baustein statt einen eigenen Kasten
// zu bauen.
//
// Bewusst ein sekundär gestalteter Knopf, kein gefüllter Akzent-Knopf: Der
// Teaser ist nie der primäre Weg einer Seite.

import { useState } from "react";
import Modal from "./Modal";
import ContactForm from "./ContactForm";
import ContactPerson from "./ContactPerson";
import { IconArrowRight } from "./Icons";
import { v, space, pad } from "../lib/theme";
import type { ContactTopic } from "../lib/contact-topics";

export default function KontaktTeaser({
  lead,
  modalTitle,
  topic,
  initialMessage,
  surface = "muted",
}: {
  /** Der Satz, der den Kontakt-Weg einleitet — Fließtext, keine Überschrift. */
  lead: string;
  /** Titel des Formular-Modals. Reiner Anzeigetext — der Mail-Betreff kommt
   *  ausschließlich aus `topic` (Allowlist, serverseitig gegengeprüft). */
  modalTitle: string;
  /** Festes Thema aus der Allowlist: daraus baut der Server den Mail-Betreff.
   *  Freitext gehört nicht in einen Mail-Header. */
  topic: ContactTopic;
  /** Vorbelegter Nachrichtentext (hier darf Kontext wie ein Ortsname stehen). */
  initialMessage?: string;
  /** Fläche des Kastens: "muted" auf normalem Seitengrund, "bg" wenn der
   *  Teaser auf einer bereits abgesetzten Karte liegt (Nachbarstufe derselben
   *  Farbfamilie — in hell wie dunkel sichtbar abgesetzt). */
  surface?: "bg" | "muted";
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ ...S.box, background: v(surface === "bg" ? "--color-bg" : "--color-bg-muted") }}>
      <p style={S.lead}>{lead}</p>
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
        title={modalTitle}
        intro={<ContactPerson note="Ich melde mich in der Regel innerhalb von 1–2 Werktagen." />}
      >
        <ContactForm initialTopic={topic} initialMessage={initialMessage} />
      </Modal>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  box: {
    padding: pad("xl"),
    borderRadius: v("--radius-md"),
  },
  // Fließtext, keine Überschrift: Größe und Farbe kommen aus der Skala, ohne
  // Fettung. Der Satz leitet den Kontakt-Weg ein, er gliedert nichts.
  lead: {
    fontSize: v("--font-size-body"),
    lineHeight: 1.6,
    color: v("--color-text-secondary"),
    margin: `0 0 ${space.lg}px`,
  },
  // Sekundäre Knopf-Variante des Projekts (wie ChartExportBar/ResultActions):
  // heller Grund, Akzent-Rahmen, Akzent-Schrift.
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
