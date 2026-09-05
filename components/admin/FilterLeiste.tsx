"use client";

import { v, pad, space } from "../../lib/theme";

/**
 * Die Filterleiste über einer Tabelle des internen Bereichs — eine Reihe von
 * Schaltern, von denen genau einer aktiv ist.
 *
 * Jeder Eintrag trägt seine Anzahl. Ohne sie muss man jeden Filter einmal
 * anklicken, um zu sehen, ob dahinter etwas liegt — und ein Filter, der auf
 * eine leere Liste führt, sieht aus wie ein Fehler.
 *
 * Bewusst Schalter und keine Auswahlliste: Bei fünf Zuständen ist die Zahl
 * daneben die eigentliche Auskunft, und die verschwindet in einer zugeklappten
 * Liste.
 */
export interface FilterEintrag {
  key: string;
  label: string;
  anzahl: number;
}

export function FilterLeiste({
  eintraege,
  aktiv,
  onWechsel,
}: {
  eintraege: FilterEintrag[];
  aktiv: string;
  onWechsel: (key: string) => void;
}) {
  return (
    <div
      role="tablist"
      style={{ display: "flex", gap: space.xs, flexWrap: "wrap", marginBottom: space.lg }}
    >
      {eintraege.map((e) => {
        const an = e.key === aktiv;
        return (
          <button
            key={e.key}
            type="button"
            role="tab"
            aria-selected={an}
            onClick={() => onWechsel(e.key)}
            // Ein Filter ohne Einträge bleibt sichtbar, aber nicht bedienbar:
            // Ihn wegzulassen ließe die Leiste bei jedem Datenstand anders
            // aussehen, und man würde nicht merken, dass es den Zustand gibt.
            disabled={e.anzahl === 0}
            style={{
              font: "inherit",
              fontSize: v("--font-size-small"),
              fontWeight: an ? 600 : 400,
              color: an
                ? v("--color-bg")
                : e.anzahl === 0
                  ? v("--color-text-muted")
                  : v("--color-text-secondary"),
              background: an ? v("--color-accent") : v("--color-bg-muted"),
              border: `1px solid ${an ? v("--color-accent") : v("--color-border-muted")}`,
              borderRadius: v("--radius-sm"),
              padding: pad("xs", "md"),
              cursor: e.anzahl === 0 ? "default" : "pointer",
              opacity: e.anzahl === 0 ? 0.55 : 1,
            }}
          >
            {e.label}
            <span style={{ marginLeft: 6, opacity: 0.75, fontVariantNumeric: "tabular-nums" }}>
              {e.anzahl}
            </span>
          </button>
        );
      })}
    </div>
  );
}
