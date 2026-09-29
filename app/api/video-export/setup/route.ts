import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";
import { VIDEO_EXPORT_SQL } from "../../../../lib/video-export-sql";

// Create the video export tables and functions in production. Idempotent.
// Auslösen: Authorization: Bearer $CRON_SECRET
//
// NOT RUN YET (29.09.2026): creating tables in the shared production database
// is part of the release, not of the pilot. The storage bucket is created in
// the same step (private, no public access).

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  const { error } = await supabase.rpc("exec_sql", { sql: VIDEO_EXPORT_SQL });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const bucket = await supabase.storage.createBucket("widget-videos", { public: false, fileSizeLimit: "50MB", allowedMimeTypes: ["video/mp4"] });
  const bucketOk = !bucket.error || /exists/i.test(bucket.error.message);
  return NextResponse.json({ ok: bucketOk, bucket: bucket.error?.message ?? "created" }, { status: bucketOk ? 200 : 500 });
}
