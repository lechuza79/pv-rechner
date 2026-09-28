import "server-only";
import { supabase } from "./supabase-server";
import { withDbTimeout, DB_SOFT_READ_TIMEOUT_MS } from "./db-timeout";
import { heuteInBerlin } from "./zeit";
import {
  ANGEBOT_CHECK_ZAEHLEN_RPC,
  angebotCheckTageslimit,
  kontingentPruefen,
  type KontingentUrteil,
} from "./angebot-check-kontingent";

// The database side of the global daily cap (see lib/angebot-check-kontingent.ts).
//
// Short budget: a failure here costs the user nothing but a 503, and waiting
// longer only holds a function slot while the database is unwell. No database
// configured at all → "unerreichbar", i.e. the route stays closed.

/** Counts one offer check for today (German time) if the cap allows it. */
export async function angebotCheckKontingent(jetzt: Date = new Date()): Promise<KontingentUrteil> {
  const db = supabase;
  if (!db) return "unerreichbar";
  return kontingentPruefen(
    async (tag, limit) => {
      const { data, error } = await withDbTimeout(
        db.rpc(ANGEBOT_CHECK_ZAEHLEN_RPC, { p_tag: tag, p_limit: limit }),
        "angebot-check kontingent",
        DB_SOFT_READ_TIMEOUT_MS,
      );
      if (error) throw new Error(error.message);
      return data;
    },
    heuteInBerlin(jetzt),
    angebotCheckTageslimit(),
  );
}
