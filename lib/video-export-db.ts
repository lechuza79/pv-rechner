import "server-only";

// Transport to the SQL functions in lib/video-export-sql.ts. Two backends,
// one logic: the functions are the same, only the wire differs.
//
//   production  Supabase rpc(name, { p }) with the service key
//   local pilot VIDEO_EXPORT_DATABASE_URL → plain Postgres (never on Vercel)
//
// The local backend exists because the pilot must not create tables in the
// shared production database before the operator releases it.

export type VideoFn =
  | "video_request_create" | "video_request_discard" | "video_request_confirm" | "video_operator_create"
  | "video_job_progress" | "video_job_status" | "video_job_claim" | "video_job_finish" | "video_pending_notifications"
  | "video_request_notified" | "video_download" | "video_job_file" | "video_cleanup";

type Json = Record<string, unknown>;

let pool: import("pg").Pool | null = null;

function localUrl(): string | null {
  const url = process.env.VIDEO_EXPORT_DATABASE_URL;
  if (!url) return null;
  if (process.env.VERCEL) throw new Error("video-export: local database URL is not allowed on Vercel");
  return url;
}

export function videoBackend(): "local" | "supabase" | "none" {
  if (localUrl()) return "local";
  return process.env.SUPABASE_SERVICE_KEY && (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)
    ? "supabase" : "none";
}

export async function callVideoFn<T = Json>(name: VideoFn, p: Json): Promise<T> {
  const url = localUrl();
  if (url) {
    if (!pool) {
      const { Pool } = await import("pg");
      pool = new Pool({ connectionString: url, max: 4 });
    }
    const res = await pool.query(`select ${name}($1::jsonb) as r`, [JSON.stringify(p)]);
    return res.rows[0].r as T;
  }
  // Production path: reuses the service-key client of the project.
  if (process.env.VIDEO_EXPORT_ENABLED !== "1") throw new Error("video-export: disabled");
  const { supabase } = await import("./supabase-server");
  if (!supabase) throw new Error("video-export: database not configured");
  const { data, error } = await supabase.rpc(name, { p });
  if (error) throw new Error(`video-export/${name}: ${error.message}`);
  return data as T;
}

/** For scripts: close the local pool so the process can exit. */
export async function closeVideoDb(): Promise<void> {
  if (pool) { await pool.end(); pool = null; }
}

/** Read display context only. Never expose recipient details to the browser. */
export async function videoConfirmationContext(hash: string): Promise<{ widget: string; ags: string; period: string; token_expires_at: string; status: string } | null> {
  const url = localUrl();
  if (url) {
    if (!pool) {
      const { Pool } = await import("pg");
      pool = new Pool({ connectionString: url, max: 4 });
    }
    const result = await pool.query("select widget, ags, period, token_expires_at, status from video_requests where token_hash=$1", [hash]);
    return result.rows[0] ?? null;
  }
  if (process.env.VIDEO_EXPORT_ENABLED !== "1") return null;
  const { supabase } = await import("./supabase-server");
  if (!supabase) return null;
  const { data, error } = await supabase.from("video_requests").select("widget,ags,period,token_expires_at,status").eq("token_hash", hash).maybeSingle();
  if (error) throw new Error("Video confirmation context unavailable");
  return data;
}
