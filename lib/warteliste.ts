import "server-only";

// ─── Waitlist (e.g. "Angebotscheck — Demnächst") ─────────────────────────────
//
// Double opt-in like the town subscription (lib/gemeinde-abo.ts), deliberately
// NOT stored in that table: a waitlist has no town, promises exactly ONE
// message (the launch), and its entries must never reach the town send run.
// Same rules otherwise, and for the same reasons:
//   - one ACTIVE entry per list and address (partial unique index); signing
//     up again resends the confirmation instead of adding a row,
//   - a confirmed entry never gets a second confirmation mail,
//   - an unsubscribed entry is never revived: it stays as proof of consent,
//     and a new signup gets a new row and a NEW confirmation,
//   - the answer to the outside is always the same (no lookup service).

import { supabase } from "./supabase-server";
import { DB_READ_TIMEOUT_MS, withDbTimeout } from "./db-timeout";
import { NACHWEIS_JAHRE, UNBESTAETIGT_MAX_TAGE, normalisiereEmail } from "./gemeinde-abo";
import type { WartelisteName } from "./warteliste-einwilligung";

export type WartelisteStatus = "ausstehend" | "bestaetigt" | "abgemeldet";

export type WartelisteEintrag = {
  id: string;
  liste: WartelisteName;
  email: string;
  status: WartelisteStatus;
  erstelltAm: string;
};

/**
 * No second confirmation mail to the same address within this window.
 *
 * Longer than the town subscription's two minutes: there, five open town
 * entries per address cap the total; here the unique index leaves ONE row, so
 * the resend window is the only cap on how often a stranger can make us mail
 * someone.
 */
export const WARTELISTE_SPERRE_MS = 10 * 60 * 1000;

const SPALTEN = "id,liste,email,status,erstellt_am";
type Zeile = { id: string; liste: string; email: string; status: string; erstellt_am: string };
const aus = (z: Zeile): WartelisteEintrag => ({
  id: z.id,
  liste: z.liste as WartelisteName,
  email: z.email,
  status: z.status as WartelisteStatus,
  erstelltAm: z.erstellt_am,
});

export type WartelisteAnlage =
  | { art: "bestaetigung-noetig"; eintrag: WartelisteEintrag }
  | { art: "still" }
  | { art: "keine-db" };

export async function wartelisteEintragen(o: {
  liste: WartelisteName;
  email: string;
  jetztIso: string;
  einwilligungVersion: string;
}): Promise<WartelisteAnlage> {
  if (!supabase) return { art: "keine-db" };
  const email = normalisiereEmail(o.email);

  const { data: vorhanden } = await withDbTimeout(
    supabase
      .from("warteliste")
      .select(SPALTEN)
      .eq("liste", o.liste)
      .eq("email", email)
      .neq("status", "abgemeldet")
      .maybeSingle(),
    "warteliste-lesen",
    DB_READ_TIMEOUT_MS,
  );

  if (vorhanden) {
    const e = aus(vorhanden as Zeile);
    if (e.status === "bestaetigt") return { art: "still" };
    const zuletzt = Date.parse(e.erstelltAm);
    if (Number.isFinite(zuletzt) && Date.parse(o.jetztIso) - zuletzt < WARTELISTE_SPERRE_MS) {
      return { art: "still" };
    }
    const { data, error } = await withDbTimeout(
      supabase
        .from("warteliste")
        .update({
          status: "ausstehend",
          erstellt_am: o.jetztIso,
          einwilligung_version: o.einwilligungVersion,
          versand_beleg: null,
        })
        .eq("id", e.id)
        .select(SPALTEN)
        .single(),
      "warteliste-aufwecken",
      DB_READ_TIMEOUT_MS,
    );
    if (error || !data) throw new Error(`Warteliste: Eintrag nicht erneuert: ${error?.message}`);
    return { art: "bestaetigung-noetig", eintrag: aus(data as Zeile) };
  }

  const { data, error } = await withDbTimeout(
    supabase
      .from("warteliste")
      .insert({
        liste: o.liste,
        email,
        status: "ausstehend",
        erstellt_am: o.jetztIso,
        einwilligung_version: o.einwilligungVersion,
      })
      .select(SPALTEN)
      .single(),
    "warteliste-anlegen",
    DB_READ_TIMEOUT_MS,
  );
  if (error || !data) throw new Error(`Warteliste: Eintrag nicht angelegt: ${error?.message}`);
  return { art: "bestaetigung-noetig", eintrag: aus(data as Zeile) };
}

/** Store the mail server id of the confirmation mail. Never throws. */
export async function wartelisteBelegSetzen(id: string, beleg: string): Promise<void> {
  if (!supabase) return;
  try {
    await withDbTimeout(
      supabase.from("warteliste").update({ versand_beleg: beleg }).eq("id", id),
      "warteliste-beleg",
      DB_READ_TIMEOUT_MS,
    );
  } catch (e) {
    console.error("[Warteliste] Versandbeleg nicht gespeichert:", e);
  }
}

export async function wartelisteBestaetigen(
  id: string,
  jetztIso: string,
): Promise<{ ok: true; eintrag: WartelisteEintrag } | { ok: false; grund: "unbekannt" | "keine-db" }> {
  if (!supabase) return { ok: false, grund: "keine-db" };
  const { data: vorhanden } = await withDbTimeout(
    supabase.from("warteliste").select(SPALTEN).eq("id", id).maybeSingle(),
    "warteliste-bestaetigen-lesen",
    DB_READ_TIMEOUT_MS,
  );
  if (!vorhanden) return { ok: false, grund: "unbekannt" };
  const e = aus(vorhanden as Zeile);
  // Opened twice (mail scanner, back button): same friendly page. An entry
  // that was unsubscribed in between is NOT revived by an old link.
  if (e.status !== "ausstehend") return { ok: true, eintrag: e };
  const { data, error } = await withDbTimeout(
    supabase
      .from("warteliste")
      .update({ status: "bestaetigt", bestaetigt_am: jetztIso })
      .eq("id", id)
      .select(SPALTEN)
      .single(),
    "warteliste-bestaetigen",
    DB_READ_TIMEOUT_MS,
  );
  if (error || !data) throw new Error(`Warteliste: Bestätigung fehlgeschlagen: ${error?.message}`);
  return { ok: true, eintrag: aus(data as Zeile) };
}

/**
 * The confirmation mail did not go out: release the resend lock, otherwise a
 * retry within WARTELISTE_SPERRE_MS answers "check your inbox" and sends
 * nothing. Backdating also lets the daily cleanup remove the row — no mail
 * left, so there is nothing to prove.
 */
export async function wartelisteVersandFehlgeschlagen(id: string): Promise<void> {
  if (!supabase) return;
  try {
    await withDbTimeout(
      supabase.from("warteliste").update({ erstellt_am: new Date(0).toISOString() }).eq("id", id).eq("status", "ausstehend"),
      "warteliste-versand-fehlgeschlagen",
      DB_READ_TIMEOUT_MS,
    );
  } catch (e) {
    console.error("[Warteliste] Sperre nicht gelöst:", e);
  }
}

/** Unsubscribe. The row stays as proof of consent (see lib/gemeinde-abo.ts). */
export async function wartelisteAbmelden(id: string, jetztIso: string): Promise<void> {
  if (!supabase) return;
  await withDbTimeout(
    supabase.from("warteliste").update({ status: "abgemeldet", abgemeldet_am: jetztIso }).eq("id", id),
    "warteliste-abmelden",
    DB_READ_TIMEOUT_MS,
  );
}

/**
 * Keep the two published promises (privacy policy, confirmation mail):
 * unconfirmed entries go after UNBESTAETIGT_MAX_TAGE; the proof of an
 * unsubscribed entry goes on 31 Dec of the third year after the last mail
 * (or the confirmation, if no mail was ever sent); never-confirmed
 * unsubscribed rows go at once.
 */
export async function wartelisteAufraeumen(jetztMs: number): Promise<number> {
  if (!supabase) return 0;
  const grenze = new Date(jetztMs - UNBESTAETIGT_MAX_TAGE * 86_400_000).toISOString();
  const stichtag = `${new Date(jetztMs).getUTCFullYear() - NACHWEIS_JAHRE}-01-01T00:00:00.000Z`;
  const laeufe = [
    supabase.from("warteliste").delete().eq("status", "ausstehend").lt("erstellt_am", grenze).select("id"),
    supabase
      .from("warteliste")
      .delete()
      .eq("status", "abgemeldet")
      .not("letzte_mail_am", "is", null)
      .lt("letzte_mail_am", stichtag)
      .select("id"),
    supabase
      .from("warteliste")
      .delete()
      .eq("status", "abgemeldet")
      .is("letzte_mail_am", null)
      .lt("bestaetigt_am", stichtag)
      .select("id"),
    supabase.from("warteliste").delete().eq("status", "abgemeldet").is("bestaetigt_am", null).select("id"),
  ];
  let n = 0;
  for (const [i, lauf] of laeufe.entries()) {
    const { data } = await withDbTimeout(lauf, `warteliste-aufraeumen-${i}`, DB_READ_TIMEOUT_MS);
    n += data?.length ?? 0;
  }
  return n;
}
