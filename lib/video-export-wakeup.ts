import "server-only";
import { callVideoFn, videoBackend } from "./video-export-db";

/** Start the existing queue worker, not a separate render per requester. */
export async function wakeVideoWorker(): Promise<boolean> {
  if (videoBackend() === "local") return false;
  const token = process.env.VIDEO_EXPORT_DISPATCH_TOKEN;
  if (!token) { console.error("video-export wakeup: credential missing"); return false; }
  try {
    const lease = await callVideoFn<{ dispatch: boolean }>("video_worker_wakeup", {});
    if (!lease.dispatch) return true;
    const response = await fetch("https://api.github.com/repos/lechuza79/pv-rechner/actions/workflows/video-export.yml/dispatches", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28" },
      body: JSON.stringify({ ref: "main" }),
    });
    if (response.status !== 204 && response.status !== 200) throw new Error(`HTTP ${response.status}`);
    return true;
  } catch {
    // Never discard an accepted job. The scheduled worker can recover it.
    console.error("video-export wakeup failed; queued job retained");
    return false;
  }
}
