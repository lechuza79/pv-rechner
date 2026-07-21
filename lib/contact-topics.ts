// Selectable subjects for the /kontakt form. Shared between the client form
// (dropdown options) and /api/contact (server-side allowlist — the subject
// line of the outgoing mail is built from this list, never from free text).
export const CONTACT_TOPICS = [
  "Allgemeine Frage",
  "Widget einbetten",
  // Eigener Punkt neben "Widget einbetten": kommunale Anfragen sind das
  // Outreach-Ziel und sollen im Postfach ohne Lesen der Nachricht erkennbar
  // sein. Der Gemeindename gehört NICHT hier rein — er wird im Nachrichtentext
  // vorbelegt, damit der Mail-Betreff aus dieser Allowlist bleibt.
  "Widget für eine Kommune",
  "Neues Widget anfragen",
  "Kooperation / Partnerschaft",
  "Feature vorschlagen",
  "Fehler melden",
  "Presse- / Datenanfrage",
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const DEFAULT_CONTACT_TOPIC: ContactTopic = CONTACT_TOPICS[0];

export function isContactTopic(value: unknown): value is ContactTopic {
  return typeof value === "string" && (CONTACT_TOPICS as readonly string[]).includes(value);
}
