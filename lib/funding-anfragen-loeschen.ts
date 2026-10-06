import "server-only";
import { supabase } from "./supabase-server";
import { DB_READ_TIMEOUT_MS, withDbTimeout } from "./db-timeout";
import { anfrageLoeschGrenze } from "./funding-anfragen-frist";

/**
 * Clears recipient address and mail texts of funding inquiries whose answer
 * (or, without an answer, whose sending) is older than three years. Program
 * id, subject, reason and all dates stay: they record THAT and WHEN we asked,
 * which also keeps the "never ask the same programme twice" guard working.
 *
 * `empfaenger` and `text` are NOT NULL columns, so they are set to an empty
 * string; `antwort_notiz` is nullable and set to null. Idempotent: rows that
 * are already cleared (`text` = '') are not touched again.
 *
 * Two queries instead of one condition over two columns — the same pattern as
 * the abo cleanup in lib/gemeinde-abo.ts. The selection rule is
 * `anfrageLoeschfaellig` in lib/funding-anfragen-frist.ts and tested there.
 */
export async function fundingAnfragenAufraeumen(jetztMs: number): Promise<number> {
  if (!supabase) return 0;
  const grenze = anfrageLoeschGrenze(jetztMs);
  const leeren = { empfaenger: "", text: "", antwort_notiz: null };

  const { data: mitAntwort, error: e1 } = await withDbTimeout(
    supabase
      .from("funding_anfragen")
      .update(leeren)
      .not("antwort_am", "is", null)
      .lt("antwort_am", grenze)
      .neq("text", "")
      .select("id"),
    "funding-anfragen-texte-mit-antwort",
    DB_READ_TIMEOUT_MS,
  );
  if (e1) throw new Error(`funding_anfragen (mit Antwort): ${e1.message}`);

  const { data: ohneAntwort, error: e2 } = await withDbTimeout(
    supabase
      .from("funding_anfragen")
      .update(leeren)
      .is("antwort_am", null)
      .lt("gesendet_am", grenze)
      .neq("text", "")
      .select("id"),
    "funding-anfragen-texte-ohne-antwort",
    DB_READ_TIMEOUT_MS,
  );
  if (e2) throw new Error(`funding_anfragen (ohne Antwort): ${e2.message}`);

  return (mitAntwort ?? []).length + (ohneAntwort ?? []).length;
}
