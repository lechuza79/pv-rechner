"use client";

import { useState } from "react";

/**
 * Der Intro-Absatz der Gemeinde-Seite. Auf dem Handy zu lang, deshalb dort
 * eingeklappt: die ersten Zeilen bleiben stehen, der Rest wird ausgeblendet
 * (weicher Verlauf) und über „Weiterlesen" aufgeklappt.
 *
 * WICHTIG: Der VOLLE Text steht immer im DOM (nur per CSS-Höhe beschnitten) —
 * für Suchmaschinen und Vorlesetools bleibt er vollständig lesbar. Auf breiten
 * Schirmen ist ohnehin kein Beschnitt aktiv (Media Query), der Knopf ist dort
 * ausgeblendet.
 */
export default function CollapsibleIntro({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`intro-clamp${open ? " intro-open" : ""}`}>
      <p className="intro-text">{children}</p>
      <button type="button" className="intro-more" onClick={() => setOpen(true)}>
        Weiterlesen
      </button>
    </div>
  );
}
