// End-to-end pilot of the server video export against a LOCAL setup.
//
// Drives the real HTTP routes of a running dev server, the real local
// database and the real worker (headless Chromium + the page's own MP4
// export). Prints one line per check; exits non-zero on the first failure.
//
// Requires (local only): a dev server on VIDEO_EXPORT_BASE_URL started with
// the same VIDEO_EXPORT_* variables, VIDEO_EXPORT_DATABASE_URL, VIDEO_MAIL_SINK,
// VIDEO_EXPORT_DIR, VIDEO_EXPORT_RENDER_ORIGIN.
//
//   npx tsx scripts/video-export-pilot.ts [--skip-render]

import { readdir, readFile, rm, stat } from "fs/promises";
import { spawn } from "child_process";
import path from "path";
import { Client } from "pg";
import { VIDEO_EXPORT_SQL } from "../lib/video-export-sql";
import { AKTUELLE_EINWILLIGUNG } from "../lib/abo-einwilligung";

const BASE = process.env.VIDEO_EXPORT_BASE_URL!;
const SINK = process.env.VIDEO_MAIL_SINK!;
const DB = process.env.VIDEO_EXPORT_DATABASE_URL!;
const FILES = process.env.VIDEO_EXPORT_DIR!;
// Fresh network addresses per run: the dev server in-memory window remembers earlier runs.
const NET = `198.18.${Math.floor(Math.random() * 250)}`;
const P = { widget: "gemeinde-solar-monat", ags: "06440016", period: process.env.PILOT_PERIOD ?? "2026-08" };

let db: Client;
const ok = (msg: string) => console.log(`✓ ${msg}`);
function check(cond: unknown, msg: string): asserts cond {
  if (!cond) { console.error(`✗ ${msg}`); process.exit(1); }
  ok(msg);
}
const q = async (sql: string, args: unknown[] = []) => (await db.query(sql, args)).rows;

async function request(email: string, ip: string, params = P) {
  const res = await fetch(`${BASE}/api/video-export/anfrage`, {
    method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ ...params, email }),
  });
  return { status: res.status, body: await res.json() };
}

async function mails(): Promise<{ file: string; to: string; kind: string; text: string }[]> {
  const files = (await readdir(SINK).catch(() => [])).sort();
  return Promise.all(files.map(async (f) => ({ file: f, ...JSON.parse(await readFile(path.join(SINK, f), "utf8")) })));
}
async function lastMail(to: string, kind: string) {
  return (await mails()).filter((m) => m.to === to && m.kind === kind).at(-1);
}
const tokenIn = (text: string, route: string) => text.match(new RegExp(`${route}\\?t=([A-Za-z0-9_-]{43})`))?.[1];

async function confirm(token: string, ip = "198.51.100.1") {
  const res = await fetch(`${BASE}/api/video-export/bestaetigen`, {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "x-forwarded-for": ip }, body: `t=${token}`,
  });
  return (await res.text()).match(/data-video-confirm="([a-z]+)"/)?.[1] ?? `http_${res.status}`;
}

function worker(env: Record<string, string> = {}): Promise<{ code: number; out: string; ms: number; maxRssKb: number | null }> {
  return new Promise((resolve) => {
    const t0 = Date.now();
    // /usr/bin/time -l reports the peak memory of the whole process tree root.
    const child = spawn("/usr/bin/time", ["-l", "npx", "tsx", "--conditions", "react-server", "scripts/video-export-worker.ts"], {
      env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => {
      const rss = out.match(/(\d+)\s+maximum resident set size/);
      resolve({ code: code ?? 1, out, ms: Date.now() - t0, maxRssKb: rss ? Math.round(Number(rss[1]) / 1024 / 1024) : null }); // macOS reports bytes → MB
    });
  });
}

async function main() {
  for (const v of ["VIDEO_EXPORT_BASE_URL", "VIDEO_MAIL_SINK", "VIDEO_EXPORT_DATABASE_URL", "VIDEO_EXPORT_DIR", "VIDEO_EXPORT_RENDER_ORIGIN"]) {
    if (!process.env[v]) throw new Error(`${v} missing`);
  }
  db = new Client({ connectionString: DB });
  await db.connect();
  await q("drop table if exists video_requests, video_render_jobs cascade");
  await db.query(VIDEO_EXPORT_SQL);
  await rm(SINK, { recursive: true, force: true });
  await rm(FILES, { recursive: true, force: true });
  ok("fresh local database, empty mail sink and file store");

  // ── Request and confirmation ──────────────────────────────────────────────
  const r1 = await request("anna@example.org", `${NET}.1`);
  check(r1.status === 202 && r1.body.code === "accepted", "request → 202 accepted (confirmation mail only)");
  const m1 = await lastMail("anna@example.org", "confirm");
  const t1 = m1 && tokenIn(m1.text, "bestaetigen");
  check(t1, "confirmation mail in sink with a one-time link");
  check((await q("select count(*)::int n from video_render_jobs"))[0].n === 0, "no render job before confirmation");

  const bad = await request("anna@example.org", `${NET}.1`, { ...P, period: "1999-01" });
  check(bad.status === 400, "unknown period → 400, no mail");
  const notAllowed = await request("anna@example.org", `${NET}.1`, { ...P, ags: "09162000" });
  check(notAllowed.status === 400, "municipality outside the pilot allowlist → 400");
  const urlParam = await fetch(`${BASE}/api/video-export/anfrage`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ widget: "https://evil.example/", ags: P.ags, period: P.period, email: "x@example.org" }) });
  check(urlParam.status === 400, "arbitrary widget/URL → 400");

  const dup = await request("anna@example.org", `${NET}.1`);
  check(dup.status === 202 && (await mails()).filter((m) => m.to === "anna@example.org").length === 1,
    "identical request within 10 min → same answer, no second mail");

  const scan = await fetch(`${BASE}/api/video-export/bestaetigen?t=${t1}`);
  const stillPending = (await q("select status from video_requests where email_hash is not null and status='pending'")).length;
  check(scan.status === 200 && stillPending >= 1, "GET of the link (mail scanner) does not confirm");

  const [c1, c2] = await Promise.all([confirm(t1!), confirm(t1!)]);
  check([c1, c2].sort().join(",") === "already,queued", `two parallel confirmations → one job (${c1}, ${c2})`);
  check((await q("select count(*)::int n from video_render_jobs"))[0].n === 1, "exactly one render job");

  const r2 = await request("ben@example.org", `${NET}.2`);
  const t2 = tokenIn((await lastMail("ben@example.org", "confirm"))!.text, "bestaetigen")!;
  check(r2.status === 202 && (await confirm(t2)) === "queued", "second person, same video → joins the queued job");
  check((await q("select count(*)::int n from video_render_jobs"))[0].n === 1, "deduplicated: still one render job");

  // ── Optional subscription (separate consent) ─────────────────────────────
  const handoffs = async (to: string) => (await mails()).filter((m) => m.to === to && m.kind === "abo-handoff");
  check(!(await handoffs("anna@example.org")).length && !(await handoffs("ben@example.org")).length,
    "without the box: video only, nothing handed to the subscription");
  const badConsent = await fetch(`${BASE}/api/video-export/anfrage`, { method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `${NET}.7` },
    body: JSON.stringify({ ...P, email: "fritz@example.org", subscribe: true, consentVersion: "1900-01-01" }) });
  check(badConsent.status === 400 && !(await lastMail("fritz@example.org", "confirm")), "opt-in with unknown consent wording → 400, nothing sent");
  const sub = await fetch(`${BASE}/api/video-export/anfrage`, { method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `${NET}.8` },
    body: JSON.stringify({ ...P, email: "gina@example.org", subscribe: true, consentVersion: AKTUELLE_EINWILLIGUNG.version }) });
  const tg = tokenIn((await lastMail("gina@example.org", "confirm"))!.text, "bestaetigen")!;
  check(sub.status === 202 && !(await handoffs("gina@example.org")).length, "opt-in: nothing handed on before the address is confirmed");
  const [g1, g2] = await Promise.all([confirm(tg), confirm(tg)]);
  const gh = await handoffs("gina@example.org");
  check([g1, g2].sort().join(",") === "already,queued" && gh.length === 1 && (gh[0] as any).body.einwilligung === AKTUELLE_EINWILLIGUNG.version,
    "after confirmation: handed to the existing subscription signup exactly once, with the shown consent version");
  check((await q("select count(*)::int n from video_render_jobs"))[0].n === 1, "the opted-in request joined the same video job");

  // ── Limits under parallel load ────────────────────────────────────────────
  const burst = await Promise.all(Array.from({ length: 12 }, (_, i) => request(`burst${i}@example.org`, `${NET}.50`)));
  const accepted = burst.filter((b) => b.status === 202).length;
  const rows = (await q("select count(*)::int n from video_requests where created_at > now() - interval '1 minute' and email like 'burst%'"))[0].n;
  check(accepted === 5 && rows === 5, `12 parallel requests from one network → exactly 5 accepted and stored (${accepted}/${rows})`);
  const perEmail = [];
  for (let i = 0; i < 4; i++) {
    await q("update video_requests set created_at = created_at - interval '11 minutes' where email = 'carl@example.org'");
    perEmail.push((await request("carl@example.org", `${NET}.${60 + i}`)).status);
  }
  check(perEmail.join(",") === "202,202,202,429", `same address a 4th time in 24 h → 429 (${perEmail.join(",")})`);
  const mailsBefore = (await mails()).length;
  await q(`insert into video_requests (email_hash, widget, ags, period, cache_key, data_version, token_hash, token_expires_at, status)
           select 'filler'||g, 'x','x','x','x','x', 'filler'||g, now(), 'expired' from generate_series(1, 60) g`);
  const glob = await request("dora@example.org", `${NET}.99`);
  check(glob.status === 503 && (await mails()).length === mailsBefore, "site-wide mail cap reached → 503, nothing sent");
  await q("delete from video_requests where email_hash like 'filler%' or email like 'burst%' or email = 'carl@example.org'");

  // ── Render ────────────────────────────────────────────────────────────────
  if (process.argv.includes("--skip-render")) { await db.end(); return; }
  const w = await worker();
  console.log(w.out.split("\n").filter((l) => l.startsWith("job") || l.startsWith("notify")).map((l) => `   ${l}`).join("\n"));
  const job = (await q("select * from video_render_jobs"))[0];
  check(w.code === 0 && job.status === "done", `worker rendered the job (${w.ms} ms wall, peak RSS worker process ${w.maxRssKb ?? "?"} MB)`);
  const stored = path.join(FILES, job.object_path);
  check(!/@|anna|ben/.test(job.object_path) && (await stat(stored)).size === Number(job.bytes), `stored as ${job.object_path} (${job.bytes} bytes, no personal data in path)`);
  const readyA = await lastMail("anna@example.org", "ready");
  const readyB = await lastMail("ben@example.org", "ready");
  check(readyA && readyB, "both requesters got a ready mail with a download link");
  check((await q("select count(*)::int n from video_requests where email in ('anna@example.org','ben@example.org')"))[0].n === 0,
    "addresses cleared after delivery");
  const dlToken = tokenIn(readyA!.text, "datei")!;
  const dl = await fetch(`${BASE}/api/video-export/datei?t=${dlToken}`);
  const bytes = Buffer.from(await dl.arrayBuffer());
  check(dl.status === 200 && dl.headers.get("content-type") === "video/mp4" && bytes.subarray(4, 8).toString("latin1") === "ftyp",
    `download link → MP4 (${bytes.length} bytes, ${dl.headers.get("content-disposition")})`);

  // Reuse: a finished video is handed out again without rendering.
  await request("emil@example.org", `${NET}.3`);
  const t3 = tokenIn((await lastMail("emil@example.org", "confirm"))!.text, "bestaetigen")!;
  check((await confirm(t3)) === "ready" && (await lastMail("emil@example.org", "ready")), "same video later → ready mail at once, no new render");
  check((await q("select count(*)::int n, max(attempts)::int a from video_render_jobs"))[0].n === 1, "still one render job");

  // Operator path: no mail, direct file; the routes refuse without entitlement.
  const op = await fetch(`${BASE}/api/video-export/betreiber`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(P) });
  const opFile = await fetch(`${BASE}/api/video-export/datei?job=${job.id}`);
  check(op.status === 403 && opFile.status === 404, "operator routes without admin session → refused");

  // ── Failure path: page unreachable → retry → failed mail ──────────────────
  await q(`insert into video_render_jobs (cache_key, widget, ags, period, data_version, design_version, source, status)
           values ('f'||repeat('0',63), 'gemeinde-solar-monat', '06440016', '1999-01', 'x', 'x', 'public', 'queued')`);
  const failJob = (await q("select id from video_render_jobs where period='1999-01'"))[0].id;
  await q(`insert into video_requests (email, email_hash, widget, ags, period, cache_key, data_version, token_hash, token_expires_at, status, job_id)
           values ('fail@example.org','h','gemeinde-solar-monat','06440016','1999-01','x','x','failtoken', now(), 'confirmed', $1)`, [failJob]);
  const f1 = await worker();
  const f2 = await worker();
  const fj = (await q("select status, attempts, error from video_render_jobs where id=$1", [failJob]))[0];
  check(f1.code === 0 && f2.code === 0 && fj.status === "failed" && fj.attempts === 2, `period missing on page → retried once, then failed (${fj.error})`);
  check(await lastMail("fail@example.org", "failed"), "requester got a failure mail");

  // ── Stale lease and cleanup ───────────────────────────────────────────────
  await q("update video_render_jobs set status='rendering', worker='ghost', attempts=1, lease_until=now()-interval '1 minute' where id=$1", [failJob]);
  await callClaim();
  const requeued = (await q("select status from video_render_jobs where id=$1", [failJob]))[0].status;
  check(requeued === "queued" || requeued === "rendering", `lost worker's lease expired → job taken back (${requeued})`);
  await q("update video_render_jobs set status='failed' where id=$1", [failJob]);
  await q("update video_render_jobs set expires_at = now() - interval '1 second' where id=$1", [job.id]);
  await worker();
  const gone = await fetch(`${BASE}/api/video-export/datei?t=${dlToken}`);
  const fileLeft = await stat(stored).then(() => true, () => false);
  check(gone.status === 404 && !fileLeft, "after expiry: link 404 and file deleted");
  await db.end();
  console.log("pilot: all checks passed");
}

async function callClaim() {
  await q(`select video_job_claim('{"worker":"pilot-check","lease_seconds":300,"max_concurrent":1,"max_attempts":2}'::jsonb)`);
}

main().catch(async (e) => { console.error(e); process.exit(1); });
