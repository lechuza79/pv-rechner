"use client";

import { IconArrowUp, IconArrowDown } from "./Icons";
import { v } from "../lib/theme";

/**
 * Der Sortierpfeil im Spaltenkopf — eine Quelle für Atlas-Rangliste und die
 * Tabellen des internen Bereichs.
 *
 * Er lag bis zum 28.08.2026 in der Rangliste und wurde beim Bau der
 * Admin-Tabelle beinahe ein zweites Mal erfunden (dort zunächst als getipptes
 * ▲ / ▼ statt mit unseren Icons). Herausgezogen statt kopiert — das Verhalten
 * unten ist nirgends offensichtlich und wäre in der Kopie verlorengegangen.
 *
 * DER PLATZ IST IMMER BELEGT, auch ohne sichtbaren Pfeil (`visibility` statt
 * Ausblenden). Sonst rückt die Kopfzeile bei jedem Sortierwechsel hin und her,
 * und in einer Tabelle mit engen Wertspalten verschiebt das die ganze Zeile.
 *
 * Aus derselben Erfahrung in der Rangliste: Ein Pfeil zwischen zwei
 * Spaltenköpfen liest sich optisch als zum RECHTEN gehörig. Er gehört deshalb
 * unmittelbar hinter den Titel seiner eigenen Spalte, nicht in die Lücke.
 */
export function SortPfeil({
  an,
  auf,
  size = 9,
}: {
  /** Wird gerade nach dieser Spalte sortiert? */
  an: boolean;
  /** Aufsteigend? */
  auf: boolean;
  size?: number;
}) {
  const Icon = auf ? IconArrowUp : IconArrowDown;
  return (
    <span
      aria-hidden={!an}
      data-sortpfeil={an ? "an" : "aus"}
      style={{
        display: "inline-block",
        lineHeight: 0,
        marginLeft: 2,
        color: v("--color-text-secondary"),
        flexShrink: 0,
        ...(an ? null : { visibility: "hidden" }),
      }}
    >
      <Icon size={size} />
    </span>
  );
}
