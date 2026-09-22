// DOM-Marker der Bildexport-Systematik — bewusst ein eigenes, abhängigkeitsfreies
// Modul.
//
// Warum getrennt von lib/chart-export.ts: dort hängt `modern-screenshot` als
// Top-Level-Import dran. Wer nur einen Marker braucht (jeder InfoTooltip braucht
// EXPORT_IGNORE_ATTR), zöge sonst die komplette Bild-Maschinerie in sein Bundle —
// und damit in jede Seite, auf der irgendwo ein „?" steht (Startseite, alle
// Rechner). Eine Zeichenkette darf kein Bundle kosten.
//
// lib/chart-export.ts re-exportiert die Konstanten, damit bestehende Aufrufer
// unverändert bleiben.

/** Marker attribute: elements carrying it are excluded from a node snapshot. */
export const EXPORT_IGNORE_ATTR = 'data-sc-export-ignore';

/** Marker attribute: elements hidden on the page but revealed in the snapshot;
 * the attribute value is the `display` to apply (e.g. "flex"). */
export const EXPORT_ONLY_ATTR = 'data-sc-export-only';

/** Marker attribute: extra CSS applied to the element in the snapshot only —
 * for framing that helps a still image but would double up on the page
 * (e.g. a box around the chart area). Value is plain CSS text. */
export const EXPORT_CSS_ATTR = 'data-sc-export-css';
