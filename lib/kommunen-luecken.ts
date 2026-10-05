/**
 * Gaps in districts that already received letters: every town there that has
 * NOT been written to, with the one reason why.
 *
 * WHY THIS EXISTS (operator, 05.10.2026: "wir müssen die Lücken sauber
 * dokumentieren, um den Überblick zu behalten"). The gaps were a byproduct of
 * each batch — a missing address, no first place, a wind town, holidays — and
 * the reason lived only in the session that drew the batch. Measured, not
 * registered: the reason is derived from the database each time, so it cannot
 * go stale the way a hand-kept list would.
 *
 * Pure: the caller supplies the hook, the wind flag and the holiday window.
 */
import { empfaengerFuerBrief } from "./kommunen-presse";
import { postfachBefund } from "./outreach-mail";
import { darfInDenVersand } from "./outreach-wiedervorlage";
import { STATUS_BOUNCE_BEHOBEN } from "./outreach-bounce";

export type LueckenZeile = {
  region_id: string;
  name: string;
  outreach_status: string;
  kampagne: string | null;
  contacted_at: string | null;
  notes: string | null;
  rollen_email: string | null;
  presse_email: string | null;
  klima_email: string | null;
  presse_kontakt_email: string | null;
  verwaltung_domain: string | null;
  rollen_email_quelle?: string | null;
};

export type LueckenUmfeld = {
  /** Merged into another municipality, per the official change list. */
  aufgeloest: boolean;
  /** Hook kind from the award index; only "sieger" carries a letter. */
  hookKind: string | null;
  windgemeinde: boolean;
  /** Holiday window of the state on the planned send day. */
  ferien: { frei: boolean; grund?: string; wiederFrei?: string | null };
};

/** Order is the order of the checks: the first that applies is THE reason. */
export const LUECKEN_GRUENDE = {
  "kein-ziel": "kein Ziel (aufgelöst oder gemeindefrei)",
  gesperrt: "gesperrt (Widerspruch oder dauerhaft unzustellbar)",
  "keine-adresse": "keine verwendbare Adresse",
  "kein-aufhaenger": "kein Platz-1-Aufhänger",
  windgemeinde: "Windgemeinde, wartet auf Windräder auf der Seite",
  eingeplant: "in einem Schub eingeplant, noch nicht verschickt",
  nachholen: "Brief kam nicht an, neue Adresse liegt vor",
  ferien: "Schulferien im Land",
  bereit: "versandbereit",
} as const;
export type LueckenGrund = keyof typeof LUECKEN_GRUENDE;

export type Luecke = { grund: LueckenGrund; detail: string | null };

/** null = this town is not a gap: it was written to. */
export function lueckeVon(z: LueckenZeile, u: LueckenUmfeld): Luecke | null {
  const stand = z.notes?.match(/Kontaktstand: ([a-z-]+)/)?.[1] ?? null;
  if (u.aufgeloest || stand === "aufgeloest" || stand === "gemeindefrei") {
    return { grund: "kein-ziel", detail: stand };
  }

  const wieder = darfInDenVersand(z);
  if (!wieder.nimm) {
    // Written to and delivered: not a gap. Only the bounce cap lands here too.
    if (z.outreach_status === STATUS_BOUNCE_BEHOBEN) return { grund: "gesperrt", detail: wieder.grund };
    return null;
  }
  if (z.outreach_status !== "offen" && z.outreach_status !== STATUS_BOUNCE_BEHOBEN) {
    return { grund: "gesperrt", detail: z.outreach_status };
  }

  const ziel = empfaengerFuerBrief({
    rollenEmail: z.rollen_email,
    presseEmail: z.presse_email,
    klimaEmail: z.klima_email,
    presseKontaktEmail: z.presse_kontakt_email,
    rollenQuelle: z.rollen_email_quelle,
  });
  if (!ziel.email) return { grund: "keine-adresse", detail: stand ?? "keine Adresse gefunden" };
  const befund = postfachBefund(ziel.email, z.name, z.verwaltung_domain, { belegteRolle: ziel.belegt });
  if (!befund.ok) return { grund: "keine-adresse", detail: `${ziel.email}: ${befund.grund}` };

  if (u.hookKind !== "sieger") return { grund: "kein-aufhaenger", detail: u.hookKind ?? "kein Rang" };
  if (u.windgemeinde) return { grund: "windgemeinde", detail: null };
  if (z.outreach_status === STATUS_BOUNCE_BEHOBEN) return { grund: "nachholen", detail: ziel.email };
  if (z.kampagne) return { grund: "eingeplant", detail: z.kampagne };
  if (!u.ferien.frei) {
    return { grund: "ferien", detail: u.ferien.wiederFrei ? `frei ab ${u.ferien.wiederFrei}` : u.ferien.grund ?? null };
  }
  return { grund: "bereit", detail: ziel.email };
}
