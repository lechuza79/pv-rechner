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
      {/* Der Ortsname spart sich schmal weg (siehe seite.css): Die Seite trägt
          ihn im Titel, in der Überschrift und in der Krümelspur, und nur so
          bleibt neben dem Knopf Platz für das Datum des nächsten Updates. */}
      <span>
        <span className="sc-abo-ort">{name} </span>abonnieren
      </span>
    </button>
  );
}
