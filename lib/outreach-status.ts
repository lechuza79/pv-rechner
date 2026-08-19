// Outreach-Status — EINE Quelle für alle Outreach-Cockpits (Kommunen,
// Versorger). Vorher lag der Katalog als Kopie im Kommunen-Cockpit und noch
// einmal als Liste in dessen API-Route; eine zweite Kopie ist hier ein Fehler,
// kein Duplikat (die Status stehen in der Datenbank und driften sonst
// gegeneinander).
//
// „gesperrt" ist ein harter Sperr-Status (nach Widerspruch/Unterlassung): kein
// Anschreiben mehr. Bewusst ein Status und kein eigenes Flag, damit ein Admin
// ihn bei Irrtum zurücknehmen kann.

import type { v } from "./theme";

type Token = Parameters<typeof v>[0];

// „bounce" ist kein Misserfolg, sondern eine Tatsache über die ADRESSE: Sie
// existiert nicht mehr oder nimmt nichts an. Ein eigener Status, weil
// „kontaktiert" hier die Unwahrheit sagt (niemand hat die Mail bekommen) und
// „offen" ebenso (ein zweiter Versuch an dieselbe Adresse ist sinnlos und
// schadet der Zustellbarkeit). Gemeinden mit diesem Status fallen aus jedem
// weiteren Lauf heraus, bis jemand eine neue Adresse einträgt.
export type OutreachStatus =
  | "offen"
  | "entwurf"
  | "kontaktiert"
  | "geantwortet"
  | "bounce"
  | "zu"
  | "gesperrt";

export const OUTREACH_STATUS: { key: OutreachStatus; label: string; color: Token; bg: Token }[] = [
  { key: "offen", label: "Offen", color: "--color-text-secondary", bg: "--color-bg-muted" },
  { key: "entwurf", label: "Entwurf", color: "--color-accent", bg: "--color-accent-dim" },
  { key: "kontaktiert", label: "Kontaktiert", color: "--color-accent-dark", bg: "--color-accent-dim" },
  { key: "geantwortet", label: "Geantwortet", color: "--color-positive", bg: "--color-bg-muted" },
  { key: "bounce", label: "Unzustellbar", color: "--color-negative", bg: "--color-bg-muted" },
  { key: "zu", label: "Zu", color: "--color-text-muted", bg: "--color-bg-muted" },
  { key: "gesperrt", label: "Gesperrt", color: "--color-negative", bg: "--color-bg-muted" },
];

export const OUTREACH_STATUS_KEYS: string[] = OUTREACH_STATUS.map((s) => s.key);

export const OUTREACH_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  OUTREACH_STATUS.map((s) => [s.key, s.label]),
);

export function isOutreachStatus(value: string): value is OutreachStatus {
  return OUTREACH_STATUS_KEYS.includes(value);
}
