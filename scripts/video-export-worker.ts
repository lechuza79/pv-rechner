// Render queued widget videos — independent of any visitor's browser tab.
//
// Takes one job at a time from the queue (lib/video-export-sql.ts), opens the
// allowlisted embed page in headless Chromium, runs the page's OWN video export
// through components/VideoRenderBridge.tsx, captures the shared export DOM,
// encodes H.264 with FFmpeg and mails every
// confirmed requester. Then expires old files and links.
//
//   npm run video:worker            one pass: cleanup, render ≤ 1 job, notify
//   npm run video:worker -- --loop  keep polling (local pilot)
//
// Needs: VIDEO_EXPORT_RENDER_ORIGIN (site to render from), the database and
// storage variables of lib/video-export-db.ts / -storage.ts, mail settings.

import { mkdtemp, readFile, rm } from "fs/promises";
import { execFile, spawn } from "child_process";
import { hostname, tmpdir } from "os";
import path from "path";
import { chromium } from "playwright";
import { VIDEO_LIMITS, VIDEO_TTL, VIDEO_WIDGETS, checkVideoParams, type VideoWidgetId } from "../lib/video-export-config";
import { callVideoFn, closeVideoDb } from "../lib/video-export-db";
import { cleanupVideos, notifyFinished } from "../lib/video-export-service";
import { objectPath, putVideo } from "../lib/video-export-storage";
import { formatStoryDate } from "../lib/story-format";

type Job = { id: string; cache_key: string; widget: VideoWidgetId; ags: string; period: string; attempts: number };

const WORKER = `${hostname()}-${process.pid}`;
/** Layout width the card is rendered at. Output size follows the card, not the viewport. */
const VIEWPORT = { width: 1280, height: 1100 };

function origin(): string {
  const o = process.env.VIDEO_EXPORT_RENDER_ORIGIN;
  if (!o || !/^https?:\/\/[^/]+$/.test(o)) throw new Error("VIDEO_EXPORT_RENDER_ORIGIN missing (origin without path)");
  return o;
}

function probe(file: string): Promise<{ duration: number; width: number; height: number; codec: string } | null> {
  return new Promise((resolve) => {
    execFile("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height:format=duration", "-of", "json", file],
      (err, out) => {
        if (err) return resolve(null);
        try {
          const j = JSON.parse(out);
          resolve({ duration: Number(j.format.duration), width: j.streams[0].width, height: j.streams[0].height, codec: j.streams[0].codec_name });
        } catch { resolve(null); }
      });
  });
}

async function render(job: Job): Promise<{ bytes: Buffer; info: Record<string, unknown> }> {
  const def = VIDEO_WIDGETS[job.widget];
  if (!def || !checkVideoParams(job).ok) throw new Error("not_allowlisted");
  const url = `${origin()}${def.embedPath(job)}?scVideoRender=1`;
  const dir = await mkdtemp(path.join(tmpdir(), "sc-video-"));
  const browser = await chromium.launch({ headless: true });
  // Closing the browser cancels both rendering and download on timeout.
  const deadline = setTimeout(() => { void browser.close().catch(() => {}); }, VIDEO_TTL.renderTimeoutSeconds * 1000);
  try {
    const context = await browser.newContext({
      viewport: VIEWPORT, deviceScaleFactor: 1.5, acceptDownloads: true,
      // Our own automation identity, like the health check (firewall exception).
      // Exactly the health check's string: the firewall exception may match it verbatim.
      userAgent: "solar-check-health-check",
    });
    const page = await context.newPage();
    const captureSession = await context.newCDPSession(page);
    page.setDefaultTimeout(60_000);
    const res = await page.goto(url, { waitUntil: "domcontentloaded" });
    if (!res || !res.ok()) throw new Error(`page_http_${res?.status() ?? "none"}`);
    const card = page.locator(`[data-widget-id="${job.widget}"]`).first();
    await card.locator("[data-chart-animation]").first().waitFor();
    if (job.widget === "regional-race") await card.locator(".district-race-row").first().waitFor();
    await page.waitForFunction(() => document.documentElement.dataset.scVideoBridge === "ready");
    // Choose the period with the page's own month control, like a visitor.
    if (def.periodControl === "month") {
    const select = card.locator('select[aria-label="Monat"]');
    if ((await select.inputValue()) !== job.period) {
      const options = await select.locator("option").evaluateAll((o) => o.map((x) => (x as HTMLOptionElement).value));
      if (!options.includes(job.period)) throw new Error("period_not_on_page");
      await select.selectOption(job.period);
    }
    // The export-only state line must name the requested month before we record.
    const want = formatStoryDate(job.period);
    await card.locator("[data-sc-export-only]").filter({ hasText: want }).first().waitFor({ state: "attached" });
    }
    // Native Chromium capture uses the same export DOM as PNGs. Avoid serializing
    // all styles/fonts into an SVG for every frame of a long racing chart.
    const started = Date.now();
    const fps=30;
    const meta=await page.evaluate(widgetId=>window.__scVideoFrame!({widgetId,timeMs:0}),job.widget);
    const frames=Math.ceil(meta.durationMs/1000*fps);
    const file=path.join(dir,"out.mp4");
    const encoder=spawn("ffmpeg",["-y","-loglevel","error","-f","image2pipe","-framerate",String(fps),"-i","pipe:0","-an","-c:v","libx264","-preset","veryfast","-crf","18","-pix_fmt","yuv420p","-vf","pad=ceil(iw/2)*2:ceil(ih/2)*2:color=white","-movflags","+faststart",file],{stdio:["pipe","ignore","pipe"]});
    let encoderError="";
    encoder.stderr.on("data",chunk=>{encoderError+=chunk.toString();});
    const encoded=new Promise<void>((resolve,reject)=>{
      encoder.on("error",reject);
      encoder.on("close",code=>code===0?resolve():reject(new Error(`encoder failed: ${encoderError.slice(-500)}`)));
    });
    // Observe failures immediately while the frame loop is still writing.
    void encoded.catch(()=>{});
    let lastProgress=-1;
    try {
      for(let frame=0;frame<frames;frame++) {
        if(frame) await page.evaluate(({widgetId,timeMs})=>window.__scVideoFrame!({widgetId,timeMs}),{widgetId:job.widget,timeMs:frame*1000/fps});
        // The timeline is already settled by __scVideoFrame. Playwright's
        // screenshot adds per-frame waits and expensive PNG compression.
        // Capture the same pixels losslessly through Chromium, with fast PNG
        // compression; FFmpeg still encodes the unchanged 30 fps output.
        const screenshot=await captureSession.send("Page.captureScreenshot",{
          format:"png",optimizeForSpeed:true,fromSurface:true,
          clip:{x:0,y:0,width:Math.ceil(meta.width),height:Math.ceil(meta.height),scale:1.5},
        });
        const png=Buffer.from(screenshot.data,"base64");
        await new Promise<void>((resolve,reject)=>encoder.stdin.write(png,error=>error?reject(error):resolve()));
        const progress=Math.min(99,Math.round((frame+1)/frames*100));
        if(progress!==lastProgress) {await callVideoFn("video_job_progress",{id:job.id,worker:WORKER,progress});lastProgress=progress;}
      }
      encoder.stdin.end();
      await encoded;
    } finally {if(encoder.exitCode===null) encoder.kill();}
    const bytes = await readFile(file);
    if (bytes.length < 10_000 || bytes.subarray(4, 8).toString("latin1") !== "ftyp") throw new Error("not_mp4");
    const probed = await probe(file);
    if (probed && (probed.codec !== "h264" || !(probed.duration > 1))) throw new Error(`bad_stream_${probed.codec}`);
    return { bytes, info: { encodeMs: Date.now() - started, card: meta, probe: probed } };
  } finally {
    clearTimeout(deadline);
    await browser.close().catch(() => {});
    await rm(dir, { recursive: true, force: true });
  }
}

async function onePass(): Promise<"rendered" | "idle"> {
  const cleaned = await cleanupVideos();
  if (cleaned.deleted) console.log(`cleanup: ${cleaned.deleted} expired file(s) deleted`);
  const claim = await callVideoFn<{ result: string; job?: Job }>("video_job_claim", {
    worker: WORKER, lease_seconds: VIDEO_TTL.leaseSeconds, max_concurrent: VIDEO_LIMITS.maxConcurrent, max_attempts: VIDEO_LIMITS.maxAttempts,
  });
  if (claim.result !== "claimed" || !claim.job) {
    const n = await notifyFinished();
    if (n.sent || n.failed) console.log(`notify: ${n.sent} sent, ${n.failed} failed`);
    return "idle";
  }
  const job = claim.job;
  const t0 = Date.now();
  const cpu0 = process.cpuUsage();
  console.log(`job ${job.id.slice(0, 8)}: ${job.widget} ${job.ags} ${job.period} (attempt ${job.attempts})`);
  try {
    const out = await render(job);
    const obj = objectPath(job.widget, job.cache_key);
    await putVideo(obj, out.bytes);
    const renderMs = Date.now() - t0;
    const fin = await callVideoFn<{ result: string }>("video_job_finish", {
      id: job.id, worker: WORKER, ok: true, object_path: obj, bytes: out.bytes.length, render_ms: renderMs, file_days: VIDEO_TTL.fileDays,
    });
    const cpu = process.cpuUsage(cpu0);
    console.log(`job ${job.id.slice(0, 8)}: ${fin.result} in ${renderMs} ms, ${out.bytes.length} bytes, worker cpu ${Math.round((cpu.user + cpu.system) / 1000)} ms, ${JSON.stringify(out.info)}`);
  } catch (e) {
    // Error codes only — never page content or addresses.
    const code = (e instanceof Error ? e.message : String(e)).replace(/[^\w:.-]+/g, " ").slice(0, 120);
    const fin = await callVideoFn<{ result: string }>("video_job_finish", {
      id: job.id, worker: WORKER, ok: false, error: code, max_attempts: VIDEO_LIMITS.maxAttempts,
    });
    console.error(`job ${job.id.slice(0, 8)}: ${fin.result} (${code})`);
  }
  const n = await notifyFinished();
  if (n.sent || n.failed) console.log(`notify: ${n.sent} sent, ${n.failed} failed`);
  return "rendered";
}

async function main() {
  const loop = process.argv.includes("--loop");
  // Scheduled runs: drain the queue, then stop; never past the time budget.
  const untilIdle = process.argv.includes("--until-idle");
  const maxMin = Number(process.argv.find((a) => a.startsWith("--max-minutes="))?.split("=")[1] ?? 0);
  const deadline = maxMin > 0 ? Date.now() + maxMin * 60_000 : Infinity;
  for (;;) {
    const r = await onePass();
    if (Date.now() + VIDEO_TTL.renderTimeoutSeconds * 1000 > deadline) break;
    if (untilIdle && r === "rendered") continue;
    if (!loop) break;
    if (r === "idle") await new Promise((res) => setTimeout(res, 3000));
  }
  await closeVideoDb();
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e);
  await closeVideoDb();
  process.exit(1);
});
