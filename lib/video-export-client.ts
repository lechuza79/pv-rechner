// Browser side of the server video export — the adapter the video dialog binds
// to. Resolving means ONLY "the confirmation mail was accepted", never "the
// video exists". Errors carry German display text.

export type VideoRequestParams = { widget: "gemeinde-solar-monat"; ags: string; period: string };

export class VideoRequestError extends Error {
  constructor(public code: "invalid" | "rate_limited" | "unavailable" | "failed", message: string) {
    super(message);
  }
}

const FALLBACK = "Das hat gerade nicht geklappt. Bitte versuchen Sie es erneut.";

async function fail(res: Response): Promise<never> {
  let body: { code?: string; message?: string } = {};
  try { body = await res.json(); } catch { /* not json */ }
  const code = (["invalid", "rate_limited", "unavailable"] as const).find((c) => c === body.code) ?? "failed";
  throw new VideoRequestError(code, body.message ?? FALLBACK);
}

/**
 * Visitor: send the confirmation mail.
 *
 * `subscribe` is the separate, unchecked-by-default opt-in for place updates.
 * When true, `consentVersion` must be the version of the wording the dialog
 * showed (VIDEO_ABO_EINWILLIGUNG.version); the server refuses unknown versions.
 */
export async function requestWidgetVideo(p: VideoRequestParams & { email: string; subscribe?: boolean; consentVersion?: string }): Promise<void> {
  const res = await fetch("/api/video-export/anfrage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...p, subscribe: p.subscribe === true }),
  });
  if (res.status !== 202) await fail(res);
}

/** Does this session render directly (operator, later premium)? */
export async function videoDirectAccess(): Promise<boolean> {
  try {
    const res = await fetch("/api/video-export/berechtigung", { credentials: "same-origin" });
    return res.ok && (await res.json()).direct === true;
  } catch {
    return false;
  }
}

export type VideoJob = { status: "queued" | "rendering" | "done" | "failed" | "expired" | "unknown"; progress?: number; downloadUrl?: string; error?: string | null };

/** Operator: start a render; resolves with the job id. */
export async function requestWidgetVideoAsOperator(p: VideoRequestParams): Promise<string> {
  const res = await fetch("/api/video-export/betreiber", {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(p),
  });
  if (res.status !== 202) await fail(res);
  return (await res.json()).jobId as string;
}

/** Operator: poll until the job has ended (or `signal` aborts). */
export async function pollWidgetVideo(jobId: string, o: { intervalMs?: number; signal?: AbortSignal; onStatus?: (j: VideoJob) => void } = {}): Promise<VideoJob> {
  for (;;) {
    if (o.signal?.aborted) throw new DOMException("aborted", "AbortError");
    const res = await fetch(`/api/video-export/betreiber?job=${encodeURIComponent(jobId)}`, { credentials: "same-origin", signal: o.signal });
    if (!res.ok) await fail(res);
    const job = (await res.json()) as VideoJob;
    o.onStatus?.(job);
    if (["done", "failed", "expired", "unknown"].includes(job.status)) return job;
    await new Promise((r) => setTimeout(r, o.intervalMs ?? 3000));
  }
}
