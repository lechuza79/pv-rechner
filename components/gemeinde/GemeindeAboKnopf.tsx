"use client";

import { ABO_OEFFNEN } from "../atlas/GemeindeAboBox";

/**
 * The subscribe button in the floating section bar (approved design). It
 * opens the existing subscription dialog (GemeindeAboBox) through the same
 * window event the old page's sticky bar uses — one sign-up, two triggers.
 */
export default function GemeindeAboKnopf({ name }: { name: string }) {
  return (
    <button
      type="button"
      data-page-subscribe=""
      aria-label={`${name} abonnieren`}
      title="Abonnieren"
      onClick={() => window.dispatchEvent(new Event(ABO_OEFFNEN))}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </svg>
      {/* Zwei Beschriftungen, eine sichtbar (siehe seite.css): Schmal spart der
          Knopf den Ortsnamen, damit neben ihm das Datum des nächsten Updates
          Platz hat — die Seite trägt den Namen im Titel, in der Überschrift
          und in der Krümelspur. NICHT den Namen aus dem Satz schneiden: Dann
          stand dort „abonnieren" klein. */}
      <span className="sc-abo-lang">{name} abonnieren</span>
      <span className="sc-abo-kurz">Abonnieren</span>
    </button>
  );
}
