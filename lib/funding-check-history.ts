import { alleZeilen } from "./skript-umgebung";
import type { SupabaseClient } from "@supabase/supabase-js";

export type FundingCheckRow = {
  program_id: string;
  checked_at: string;
  source: string;
};

/** Read every check; an unpaged request silently hid 209 of 1,209 rows. */
export async function loadFundingCheckHistory(db: SupabaseClient): Promise<FundingCheckRow[]> {
  return alleZeilen<FundingCheckRow>(db, "funding_checks", "program_id, checked_at, source");
}
