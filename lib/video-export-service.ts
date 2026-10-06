import "server-only";
import {raceSettingsFromPeriod} from "./race-settings";

import { VIDEO_DESIGN_VERSION, VIDEO_LIMITS, VIDEO_TTL, type VideoExportParams } from "./video-export-config";
import { callVideoFn, videoBackend } from "./video-export-db";
import { emailHash, hashToken, ipHash, newToken, plausibleToken, renderCacheKey } from "./video-export-token";
import { confirmMail, failedMail, readyMail, sendVideoMail, videoLabel } from "./video-export-mail";
import { deleteVideos, openVideo } from "./video-export-storage";
import { handOffSubscription } from "./video-export-abo";
import { wakeVideoWorker } from "./video-export-wakeup";

// Orchestration of the server video export. The limits and state transitions
// themselves live in SQL (lib/video-export-sql.ts); this file validates input
// against real data, builds links and sends mails.

type Json = Record<string, any>;

export function videoExportEnabled(): boolean {
  const b = videoBackend();
  if (b === "local") return true;
  return b === "supabase" && process.env.VIDEO_EXPORT_ENABLED === "1" && !!process.env.VIDEO_EXPORT_SECRET;
}

/** Links in mails point here. No fallback to the production domain: a link
 *  built in a test environment must never reach production. */
function baseUrl(): string {
  const b = process.env.VIDEO_EXPORT_BASE_URL;
  if (!b || !/^https?:\/\/[^/]+$/.test(b)) throw new Error("VIDEO_EXPORT_BASE_URL missing (origin without path)");
  return b;
}

export type Resolved = { params: VideoExportParams; place: string; dataVersion: string; cacheKey: string; label: string };

/** Does the requested period exist in the data the page shows? */
export async function resolveVideo(params: VideoExportParams): Promise<Resolved | null> {
  if (params.widget === "regional-race") {
    const {loadRegionalRace} = await import("./regional-race-server");
    const {createHash} = await import("node:crypto");
    const race=await loadRegionalRace(params.ags,raceSettingsFromPeriod(params.period));
    if(!race) return null;
    const dataVersion=createHash("sha256").update(JSON.stringify({stand:race.stand,rows:race.rows,history:race.history})).digest("hex");
    return {params,place:race.region.name,dataVersion,cacheKey:renderCacheKey({...params,dataVersion,designVersion:VIDEO_DESIGN_VERSION}),label:`Solaranlagen im regionalen Vergleich · ${race.region.name}`};
  }
  if (!/^\d{8}$/.test(params.ags)) {
    const {loadRegionalSolar}=await import("./regional-solar-server");
    const solar=await loadRegionalSolar(params.ags);
    const month=solar?.data.monthly.find(row=>row.month===params.period);
    if(!solar || !month)return null;
    const dataVersion=`${month.solar.sourceDate}|${solar.version}`;
    return {params,place:solar.region.name,dataVersion,cacheKey:renderCacheKey({...params,dataVersion,designVersion:VIDEO_DESIGN_VERSION}),label:videoLabel({place:solar.region.name,period:params.period})};
  }
  const { ladeGemeindePaket } = await import("./gemeinde-paket-server");
  const paket = await ladeGemeindePaket(params.ags);
  const rows = (paket?.monitorPeriods as Json | undefined)?.monthly as Json[] | undefined;
  const row = rows?.find((r) => r?.solar?.month === params.period);
  if (!paket || !row) return null;
  const dataVersion = `${row.solar.sourceDate ?? "?"}|${paket.gebautAm}`;
  const cacheKey = renderCacheKey({ ...params, dataVersion, designVersion: VIDEO_DESIGN_VERSION });
  return { params, place: paket.name, dataVersion, cacheKey, label: videoLabel({ place: paket.name, period: params.period }) };
}

export type RequestOutcome = { http: 202 | 400 | 429 | 503; code: "accepted" | "invalid" | "rate_limited" | "unavailable" };

export async function requestPublicVideo(o: {
  params: VideoExportParams; email: string; ip: string | null;
  /** Optional, separate consent: subscribe to the place. Strictly opt-in. */
  subscribe?: { consentVersion: string } | null;
}): Promise<RequestOutcome> {
  if (!videoExportEnabled()) return { http: 503, code: "unavailable" };
  const resolved = await resolveVideo(o.params);
  if (!resolved) return { http: 400, code: "invalid" };
  const { token, hash } = newToken();
  const created = await callVideoFn<Json>("video_request_create", {
    email: o.email, email_hash: emailHash(o.email), ip_hash: ipHash(o.ip),
    widget: o.params.widget, ags: o.params.ags, period: o.params.period, token_hash: hash,
    cache_key: resolved.cacheKey, data_version: resolved.dataVersion,
    subscribe: !!o.subscribe, consent_version: o.subscribe?.consentVersion ?? null,
    confirm_minutes: VIDEO_TTL.confirmMinutes, mails_per_hour: VIDEO_LIMITS.mailsPerHour,
    per_ip_hour: VIDEO_LIMITS.requestsPerIpPerHour, per_email_day: VIDEO_LIMITS.requestsPerEmailPerDay,
    resend_after_minutes: VIDEO_LIMITS.resendAfterMinutes,
  });
  switch (created.result) {
    // Same answer as success: no information about someone else's address.
    case "duplicate": return { http: 202, code: "accepted" };
    case "limit_email":
    case "limit_ip": return { http: 429, code: "rate_limited" };
    case "limit_global": return { http: 503, code: "unavailable" };
    case "created": break;
    default: throw new Error(`video-export: unexpected create result ${created.result}`);
  }
  const confirmUrl = `${baseUrl()}/api/video-export/bestaetigen?t=${token}`;
  const ok = await sendVideoMail(o.email, confirmMail({ label: resolved.label, confirmUrl, subscribe: !!o.subscribe }), "confirm");
  if (!ok) {
    await callVideoFn("video_request_discard", { id: created.id });
    return { http: 503, code: "unavailable" };
  }
  return { http: 202, code: "accepted" };
}

export type ConfirmOutcome = "queued" | "ready" | "already" | "expired" | "invalid" | "capacity" | "unavailable";

export async function confirmVideo(token: unknown, ip: string | null = null): Promise<ConfirmOutcome> {
  if (!videoExportEnabled()) return "unavailable";
  if (!plausibleToken(token)) return "invalid";
  const r = await callVideoFn<Json>("video_request_confirm", { token_hash: hashToken(token), ...capacity() });
  const outcome = mapConfirm(r);
  // Opted in: hand the now confirmed address to the existing subscription
  // functions, preserving duplicate handling without a second confirmation mail.
  if (r.subscribe?.email) {
    await handOffSubscription({ ags: r.subscribe.ags, email: r.subscribe.email, consentVersion: r.subscribe.consent_version, ip });
  }
  // A finished video is reused at once: the ready mail goes out now.
  if (outcome === "ready") await notifyFinished();
  if (outcome === "queued") await wakeVideoWorker();
  return outcome;
}

function capacity() {
  return { max_queue: VIDEO_LIMITS.maxQueue, renders_per_day: VIDEO_LIMITS.rendersPerDay, design_version: VIDEO_DESIGN_VERSION };
}

function mapConfirm(r: Json): ConfirmOutcome {
  switch (r.result) {
    case "queued": return "queued";
    case "ready": return "ready";
    case "already": return "already";
    case "expired": return "expired";
    case "invalid": return "invalid";
    default: return String(r.result).startsWith("capacity") ? "capacity" : "unavailable";
  }
}

export async function operatorCreate(params: VideoExportParams, recipient?: string): Promise<{ http: number; jobId?: string; status?: string; code?: string }> {
  if (!videoExportEnabled()) return { http: 503, code: "unavailable" };
  const resolved = await resolveVideo(params);
  if (!resolved) return { http: 400, code: "invalid" };
  const r = await callVideoFn<Json>("video_operator_create", {
    cache_key: resolved.cacheKey, widget: params.widget, ags: params.ags, period: params.period,
    data_version: resolved.dataVersion, ...capacity(),
    ...(recipient ? { email: recipient, email_hash: emailHash(recipient), token_hash: newToken().hash } : {}),
  });
  if (String(r.result).startsWith("capacity")) return { http: 503, code: "capacity" };
  if (r.result === "ready") await notifyFinished();
  else await wakeVideoWorker();
  return { http: 202, jobId: r.job_id, status: r.result === "ready" ? "done" : "queued" };
}

export async function jobStatus(id: string): Promise<Json> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return { status: "unknown" };
  return callVideoFn<Json>("video_job_status", { id });
}

type FileOut = { bytes: Buffer; filename: string } | { url: string; filename: string } | null;

function filenameFor(f: Json): string {
  return `solar-check-${f.widget}-${f.ags}-${f.period}.mp4`;
}

export async function openByDownloadToken(token: unknown): Promise<FileOut> {
  if (!videoExportEnabled() || !plausibleToken(token)) return null;
  const f = await callVideoFn<Json>("video_download", { download_hash: hashToken(token) });
  if (!f.object_path) return null;
  const filename = filenameFor(f);
  return { ...(await openVideo(f.object_path, filename)), filename };
}

export async function openByJob(id: string): Promise<FileOut> {
  if (!videoExportEnabled() || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const f = await callVideoFn<Json>("video_job_file", { id });
  if (!f.object_path) return null;
  const filename = filenameFor(f);
  return { ...(await openVideo(f.object_path, filename)), filename };
}

/** Tell every confirmed requester whose job has ended. Idempotent. */
export async function notifyFinished(): Promise<{ sent: number; failed: number }> {
  const rows = await callVideoFn<Json[]>("video_pending_notifications", {});
  let sent = 0, failed = 0;
  const labels = new Map<string, string>();
  for (const r of rows) {
    const key = `${r.widget}|${r.ags}|${r.period}`;
    if (!labels.has(key)) {
      const {getRegionByIdUncached} = await import("./atlas");
      const region = await getRegionByIdUncached(r.ags).catch(() => null);
      labels.set(key, videoLabel({widget:r.widget, place:region?.name ?? r.ags, period:r.period}));
    }
    const label = labels.get(key)!;
    if (r.job_status === "done") {
      const { token, hash } = newToken();
      const ok = await sendVideoMail(r.email, readyMail({
        label, downloadUrl: `${baseUrl()}/api/video-export/datei?t=${token}`, expiresAt: new Date(r.expires_at),
      }), "ready");
      if (ok) { await callVideoFn("video_request_notified", { request_id: r.request_id, download_hash: hash }); sent++; }
      else failed++;
    } else {
      const ok = await sendVideoMail(r.email, failedMail({ label }), "failed");
      if (ok) { await callVideoFn("video_request_notified", { request_id: r.request_id, download_hash: null }); sent++; }
      else failed++;
    }
  }
  return { sent, failed };
}

export async function cleanupVideos(): Promise<{ deleted: number }> {
  const r = await callVideoFn<Json>("video_cleanup", {
    email_retention_hours: VIDEO_TTL.emailRetentionHours, request_retention_days: VIDEO_TTL.requestRetentionDays,
  });
  const paths = (r.delete_paths as (string | null)[]).filter((p): p is string => !!p);
  await deleteVideos(paths);
  return { deleted: paths.length };
}
