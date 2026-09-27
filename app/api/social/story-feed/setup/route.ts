import { NextRequest, NextResponse } from "next/server";
import { istAdminOderCron } from "../../../../../lib/admin-guard";
import { supabase } from "../../../../../lib/supabase-server";
import { STORY_FEED_DDL } from "../../../../../lib/orts-story-feed-db";

export async function POST(req: NextRequest) {
  if (!(await istAdminOderCron(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!supabase) return NextResponse.json({ error: "Datenbank nicht konfiguriert" }, { status: 503 });
  const { error } = await supabase.rpc("exec_sql", { sql: STORY_FEED_DDL });
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
}
