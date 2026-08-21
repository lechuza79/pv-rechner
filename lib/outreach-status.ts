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
  | "veroeffentlicht"
  | "bounce"
  | "zu"
  | "gesperrt";

export const OUTREACH_STATUS: { key: OutreachStatus; label: string; color: Token; bg: Token }[] = [
  { key: "offen", label: "Offen", color: "--color-text-secondary", bg: "--color-bg-muted" },
  { key: "entwurf", label: "Entwurf", color: "--color-accent", bg: "--color-accent-dim" },
  { key: "kontaktiert", label: "Kontaktiert", color: "--color-accent-dark", bg: "--color-accent-dim" },
  { key: "geantwortet", label: "Geantwortet", color: "--color-positive", bg: "--color-bg-muted" },
  // DAS IST DAS ERGEBNIS, auf das der ganze Durchgang zielt: Die Gemeinde hat
  // die Meldung veröffentlicht. Bis zum 20.08.2026 gab es dafür keinen Status —
  // eine Veröffentlichung war von einer freundlichen Antwort nicht zu
  // unterscheiden, obwohl nur die eine den Link auf einer Amtsseite erzeugt.
  { key: "veroeffentlicht", label: "Veröffentlicht", color: "--color-positive", bg: "--color-accent-dim" },
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

// ─── „Nicht beantwortet" ist eine ABLEITUNG, kein Status ─────────────────────
//
// Er ergibt sich vollständig aus zwei Feldern, die ohnehin gepflegt werden:
// angeschrieben, keine Antwort, und das ist lange genug her. Ihn zu SPEICHERN
// hieße, eine dritte Wahrheit neben `contacted_at` und `responded_at` zu führen
// — sie wäre in dem Moment falsch, in dem eine Antwort eintrifft und niemand
// den Status nachzieht. Genau die Fehlerklasse, die dieses Projekt beim
// Förder-Prüfdatum schon einmal teuer bezahlt hat.
//
// Die Frist ist kein Naturgesetz, sondern eine Beobachtung: Nidda hat am selben
// Tag geantwortet, die zweite Rückfrage kam am Morgen danach. Wer nach zwei
// Wochen nichts geschickt hat, schickt erfahrungsgemäß nichts mehr — bis dahin
// steht die Gemeinde schlicht auf „kontaktiert".
export const UNBEANTWORTET_TAGE = 14;

/** Schlüssel für den abgeleiteten Filter — bewusst KEIN Wert von `OutreachStatus`. */
export const UNBEANTWORTET = "unbeantwortet";

export function istUnbeantwortet(
  zeile: { outreach_status: string; contacted_at: string | null; responded_at: string | null },
  jetzt: Date,
): boolean {
  if (zeile.outreach_status !== "kontaktiert") return false;
  if (!zeile.contacted_at || zeile.responded_at) return false;
  const tage = (jetzt.getTime() - new Date(zeile.contacted_at).getTime()) / 86_400_000;
  return tage >= UNBEANTWORTET_TAGE;
}
