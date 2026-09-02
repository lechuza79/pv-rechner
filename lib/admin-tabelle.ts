import type { CSSProperties } from "react";
import { v, pad } from "./theme";

// Das Tabellen-Aussehen der Admin-Ansichten, an EINER Stelle.
//
// WOZU: Die Stile lagen als lokale Konstanten in jeder Admin-Seite. Solange es
// eine Seite war, war das keine Kopie; mit der zweiten wurde es eine, und die
// dritte hätte wieder anders ausgesehen. Bei einem Aussehen ist eine zweite
// Fassung kein Duplikat, sondern die Stelle, an der beide auseinanderlaufen —
// dieselbe Begründung wie bei den Einheiten-Formatierern.
//
// Nur das GRUNDGERÜST steht hier: Kopfzeile, Zelle, Rahmen. Was eine einzelne
// Tabelle zusätzlich braucht (rechtsbündige Zahlen, feste Spaltenbreiten),
// setzt sie sich selbst dazu — sonst wächst hier eine Sammlung von
// Sonderfällen, die niemand mehr überblickt.

/** Die Tabelle selbst. `minWidth` je nach Spaltenzahl dazusetzen. */
export const adminTabelle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: v("--font-size-small"),
};

/** Kopfzelle: klein, gesperrt, auf gedämpftem Grund. */
export const adminTh: CSSProperties = {
  textAlign: "left",
  fontSize: v("--font-size-caption"),
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: v("--color-text-muted"),
  padding: pad("sm", "md"),
  background: v("--color-bg-muted"),
  whiteSpace: "nowrap",
};

/** Inhaltszelle. */
export const adminTd: CSSProperties = {
  padding: pad("sm", "md"),
  verticalAlign: "top",
};

/** Trennlinie über einer Zeile — als eigener Wert, damit nicht jede Ansicht
 *  ihre eigene Linie erfindet. */
export const adminZeile: CSSProperties = {
  borderTop: `1px solid ${v("--color-border")}`,
};
