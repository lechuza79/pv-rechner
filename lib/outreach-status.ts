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

export type OutreachStatus = "offen" | "entwurf" | "kontaktiert" | "geantwortet" | "zu" | "gesperrt";

export const OUTREACH_STATUS: { key: OutreachStatus; label: string; color: Token; bg: Token }[] = [
  { key: "offen", label: "Offen", color: "--color-text-secondary", bg: "--color-bg-muted" },
  { key: "entwurf", label: "Entwurf", color: "--color-accent", bg: "--color-accent-dim" },
  { key: "kontaktiert", label: "Kontaktiert", color: "--color-accent-dark", bg: "--color-accent-dim" },
  { key: "geantwortet", label: "Geantwortet", color: "--color-positive", bg: "--color-bg-muted" },
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
