// Local check of the operator path below the session gate: start a render
// without mail, run the worker, open the file by job id.
//   npx tsx --conditions react-server scripts/video-export-operator-check.ts
import { spawnSync } from "child_process";
import { jobStatus, openByJob, operatorCreate } from "../lib/video-export-service";
import { closeVideoDb } from "../lib/video-export-db";

async function main() {
  const params = { widget: "gemeinde-solar-monat" as const, ags: "06440016", period: process.env.PILOT_PERIOD ?? "2026-08" };
  const created = await operatorCreate(params);
  console.log("operator create:", JSON.stringify(created));
  if (!created.jobId) throw new Error("no job");
  if (created.status !== "done") {
    const w = spawnSync("npx", ["tsx", "--conditions", "react-server", "scripts/video-export-worker.ts"], { stdio: "inherit", env: process.env });
    if (w.status !== 0) throw new Error("worker failed");
  }
  const s = await jobStatus(created.jobId);
  const file = await openByJob(created.jobId);
  const bytes = file && "bytes" in file ? file.bytes : null;
  console.log(`job status: ${s.status}, render ${s.render_ms} ms; direct file: ${bytes ? `${bytes.length} bytes, ${bytes.subarray(4, 8).toString("latin1")}` : "none"}`);
  const again = await operatorCreate(params);
  console.log("operator create again (dedupe):", JSON.stringify(again));
  await closeVideoDb();
  if (s.status !== "done" || !bytes || again.jobId !== created.jobId || again.status !== "done") process.exit(1);
  console.log("operator path: ok");
}
main().catch(async (e) => { console.error(e); await closeVideoDb(); process.exit(1); });
