// Apply the video export schema to the LOCAL pilot database.
// Production uses GET /api/video-export/setup (not run yet — needs release).
import { Client } from "pg";
import { VIDEO_EXPORT_SQL } from "../lib/video-export-sql";

async function main() {
  const url = process.env.VIDEO_EXPORT_DATABASE_URL;
  if (!url || process.env.VERCEL) {
    console.error("VIDEO_EXPORT_DATABASE_URL (local Postgres) is required.");
    process.exit(1);
  }
  const reset = process.argv.includes("--reset");
  const client = new Client({ connectionString: url });
  await client.connect();
  if (reset) await client.query("drop table if exists video_requests, video_render_jobs cascade");
  await client.query(VIDEO_EXPORT_SQL);
  const { rows } = await client.query("select proname from pg_proc where proname like 'video_%' order by 1");
  console.log(`schema applied${reset ? " (reset)" : ""}: ${rows.map((r) => r.proname).join(", ")}`);
  await client.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
