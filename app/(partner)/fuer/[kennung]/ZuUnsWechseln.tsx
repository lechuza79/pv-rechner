"use client";

import { v, iconSizes } from "../../../../lib/theme";
import { IconClose } from "../../../../components/Icons";

/**
 * Verlässt die betriebseigene Ansicht und öffnet dieselbe Rechnung auf
 * solar-check.io.
 *
 * ── Warum der Zustand mitgeht ──────────────────────────────────────────────
 * Ohne die Adressparameter landete der Nutzer wieder bei Frage eins — er
 * hätte seine Rechnung verloren, nur weil er den Rahmen wechselt. Deshalb
 * liest der Knopf die aktuelle Adresse und schreibt nur den Pfad um.
 *
 * ── Warum es ein Client-Element ist ────────────────────────────────────────
 * Der Server kennt die Parameter zwar auch, aber nicht die, die der Nutzer
 * seither im Rechner gedreht hat. Auf dem Client ist es die Adresse, die
 * gerade gilt.
 */
export default function ZuUnsWechseln() {
  const wechseln = () => {
    const suche = typeof window !== "undefined" ? window.location.search : "";
    window.location.href = `/photovoltaik-rechner${suche}`;
  };

  return (
    <button
      type="button"
      onClick={wechseln}
      // Ein blankes Kreuz heißt für Bildschirmleser nichts. Der Name sagt, was
      // wirklich passiert — nicht „schließen", sondern ein Ortswechsel.
      aria-label="Diese Ansicht verlassen und die Rechnung auf solar-check.io öffnen"
      title="Auf solar-check.io öffnen"
      style={S.knopf}
    >
      <IconClose size={iconSizes.md} />
    </button>
  );
}

const S = {
  knopf: {
    width: 32,
    height: 32,
    flexShrink: 0,
    borderRadius: v("--radius-sm"),
    border: "none",
    background: "transparent",
    color: v("--color-text-faint"),
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
