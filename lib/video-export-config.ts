import {raceSettingsFromPeriod,raceQuery} from "./race-settings";
// Server-rendered widget videos: the one place for what may be rendered and
// how much of it.
//
// ALLOWLIST, NOT A URL: A request names a widget, a place and a period — never
// an address. The renderer builds the address from this table, so no request
// can point our headless browser at anything we did not list here.
//
// Each chart supplies its validated parameters and render surface here.
// Authentication, queue limits, delivery and the encoder remain shared.

/** Bump when the exported look changes; it is part of the cache key, so a
 *  finished video from the old design is never handed out for the new one. */
export const VIDEO_DESIGN_VERSION = "2026-10-01.full-bleed-video-race";

export type VideoWidgetId = "gemeinde-solar-monat" | "regional-race";

export type VideoExportParams = { widget: VideoWidgetId; ags: string; period: string };

export const VIDEO_WIDGETS: Record<VideoWidgetId, {
  /** Page that renders the accepted widget, relative to the site. */
  embedPath: (p: VideoExportParams) => string;
  /** Released places. An empty list accepts valid regions checked against real data. */
  agsAllowlist: readonly string[];
  regionPattern: RegExp;
  periodPattern: RegExp;
  periodControl: "month" | "none";
}> = {
  "gemeinde-solar-monat": {
    embedPath: (p) => /^\d{8}$/.test(p.ags) ? `/embed/gemeinde/${p.ags}/monitor` : `/embed/regional-solar/${p.ags}`,
    agsAllowlist: [],
    regionPattern: /^(de|\d{2}|\d{5}|\d{8})$/, periodPattern: /^\d{4}-(0[1-9]|1[0-2])$/, periodControl: "month",
  },
  "regional-race": {
    embedPath: (p) => `/embed/regional-race/${p.ags}${p.period==="current"?"":"?"+raceQuery(raceSettingsFromPeriod(p.period))}`,
    agsAllowlist: [],
    regionPattern: /^(de|\d{2}|\d{5})$/, periodPattern: /^(current|race_(count|kwp|per-capita)_(all|private-roofs)_(all|districts)_(none|\d{2,8}))$/, periodControl: "none",
  },
};

/** Limits. Every one is enforced inside one database transaction (see
 *  lib/video-export-sql.ts), so parallel requests cannot slip past them. */
export const VIDEO_LIMITS = {
  /** Confirmation mails to one address per 24 h. */
  requestsPerEmailPerDay: 3,
  /** Requests from one network address per hour. */
  requestsPerIpPerHour: 5,
  /** Confirmation mails site-wide per hour — caps what an attacker with many
   *  addresses and many IPs can make us send. */
  mailsPerHour: 60,
  /** A second request for the same address and video within this window
   *  answers like a success but sends nothing. */
  resendAfterMinutes: 10,
  /** Renders started site-wide per UTC day (public requests). Cost brake. */
  rendersPerDay: 40,
  /** Jobs waiting or running at once. Beyond this new work is refused. */
  maxQueue: 20,
  /** Renders running at the same time. */
  maxConcurrent: 1,
  /** Attempts per job (first try plus retries). */
  maxAttempts: 2,
} as const;

export const VIDEO_TTL = {
  /** Confirmation link. */
  confirmMinutes: 30,
  /** A running render that stops reporting is taken back after this. */
  leaseSeconds: 660,
  /** Hard ceiling for one render in the worker. */
  renderTimeoutSeconds: 600,
  /** Finished file and its download links. */
  fileDays: 7,
  /** Address kept after the request ends (delivered, failed, expired). 0 = cleared at once. */
  emailRetentionHours: 0,
  /** Request rows (hashes, states) kept for abuse limits and support. */
  requestRetentionDays: 14,
} as const;


export type ParamsCheck = { ok: true; params: VideoExportParams } | { ok: false; reason: string };

/** Shape and allowlist only. Whether the period exists is checked against the
 *  data package on the server (lib/video-export-service.ts). */
export function checkVideoParams(input: unknown): ParamsCheck {
  if (!input || typeof input !== "object") return { ok: false, reason: "body" };
  const o = input as Record<string, unknown>;
  // Own keys only: `in` would accept "__proto__" or "toString".
  if (typeof o.widget !== "string" || !Object.hasOwn(VIDEO_WIDGETS, o.widget)) return { ok: false, reason: "widget" };
  const widget = o.widget as VideoWidgetId;
  if (typeof o.ags !== "string" || !VIDEO_WIDGETS[widget].regionPattern.test(o.ags)) return { ok: false, reason: "ags" };
  const allow = VIDEO_WIDGETS[widget].agsAllowlist;
  if (allow.length && !allow.includes(o.ags)) return { ok: false, reason: "ags_not_released" };
  if (typeof o.period !== "string" || !VIDEO_WIDGETS[widget].periodPattern.test(o.period)) return { ok: false, reason: "period" };
  return { ok: true, params: { widget, ags: o.ags, period: o.period } };
}

const EMAIL = /^[^\s@<>"',;]{1,64}@[^\s@<>"',;]{1,190}\.[a-z]{2,24}$/i;

/** Normalised address or null. Lower-cased so "A@x.de" and "a@x.de" share limits. */
export function normaliseEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const e = input.trim().toLowerCase();
  if (e.length > 254 || !EMAIL.test(e)) return null;
  return e;
}
