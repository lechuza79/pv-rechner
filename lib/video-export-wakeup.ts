import "server-only";
import { callVideoFn, videoBackend } from "./video-export-db";
import { dispatchWorkflow } from "./github-dispatch";

/** Start the existing queue worker, not a separate render per requester. */
export async function wakeVideoWorker(): Promise<boolean> {
  if (videoBackend() === "local") return false;
  const token = process.env.VIDEO_EXPORT_DISPATCH_TOKEN;
  if (!token) { console.error("video-export wakeup: credential missing"); return false; }
  try {
    const lease = await callVideoFn<{ dispatch: boolean }>("video_worker_wakeup", {});
    if (!lease.dispatch) return true;
    await dispatchWorkflow("video-export.yml", token);
    return true;
  } catch {
    // Never discard an accepted job. The scheduled worker can recover it.
    console.error("video-export wakeup failed; queued job retained");
    return false;
  }
}
