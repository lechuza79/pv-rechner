"use client";

import { v, space, pad } from "../../lib/theme";

/**
 * Die Pillenreihe der Redaktion: eine Wahl, mehrere Möglichkeiten, alle sichtbar.
 *
 * Sie stand bis zum 07.09.2026 viermal wortgleich im Code — Bildform,
 * Farbschema, Bearbeitungsstand und jetzt die Ausgabeform. Vier Kopien
 * derselben Pille sind der Weg, auf dem sich zwei davon irgendwann in Abstand,
 * Rundung oder Aktiv-Farbe unterscheiden, ohne dass es jemand beschließt.
 *
 * Bewusst KNÖPFE, keine Links: Der Zustand lebt in der Ansicht, nicht in der
 * Adresse. Wo er in der Adresse steht (Quellenwahl, Kategorien), sind es Links,
 * und das ist eine andere Sache.
 */
export function Umschalter<T extends string>({
  eintraege,
  wert,
  onWaehle,
  label,
  ariaLabel,
}: {
  eintraege: { wert: T; text: string; zusatz?: string }[];
  wert: T;
  onWaehle: (w: T) => void;
  /** Die Frage über der Reihe. Fehlt sie, steht die Reihe für sich. */
  label?: string;
  ariaLabel?: string;
}) {
  return (
    <div>
      {label && (
        <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginBottom: space.xs }}>
          {label}
        </div>
      )}
      <div
        role="group"
        aria-label={ariaLabel ?? label}
        style={{ display: "flex", gap: space.xs, flexWrap: "wrap", alignItems: "center" }}
      >
        {eintraege.map((e) => {
          const aktiv = e.wert === wert;
          return (
            <button
              key={e.wert}
              type="button"
              aria-pressed={aktiv}
              onClick={() => onWaehle(e.wert)}
              style={{
                padding: pad("xs", "md"),
                borderRadius: v("--radius-sm"),
                border: `1px solid ${aktiv ? v("--color-accent") : v("--color-border")}`,
                background: aktiv ? v("--color-accent-dim") : "transparent",
                color: aktiv ? v("--color-accent") : v("--color-text-secondary"),
                cursor: "pointer",
                fontSize: v("--font-size-small"),
              }}
            >
              {e.text}
              {e.zusatz !== undefined && <span style={{ color: v("--color-text-muted") }}> {e.zusatz}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
