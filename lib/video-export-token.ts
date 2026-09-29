import "server-only";

import { createHash, createHmac, randomBytes } from "crypto";

// Links and hashes of the video export.
//
// Links carry a random token, the database only its SHA-256 — a leaked table
// holds no usable link. Addresses and network addresses are kept for limits
// only as a keyed hash (HMAC), so the table cannot be matched against a list
// of addresses without the secret. The network hash also carries the UTC day:
// it throttles within a day and cannot follow anyone across days.
//
// OWN SECRET, like the subscription links (lib/abo-token.ts): it must not be
// the cron key, and a missing one throws instead of falling back to a known
// value.

function secret(): string {
  const s = process.env.VIDEO_EXPORT_SECRET;
  if (!s || s.length < 16) throw new Error("VIDEO_EXPORT_SECRET missing or shorter than 16 characters");
  return s;
}

export function newToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** A token must look like one before we spend a database call on it. */
export function plausibleToken(t: unknown): t is string {
  return typeof t === "string" && /^[A-Za-z0-9_-]{43}$/.test(t);
}

export function emailHash(email: string): string {
  return createHmac("sha256", secret()).update(`email:${email}`).digest("hex");
}

export function ipHash(ip: string | null, now = new Date()): string | null {
  if (!ip) return null;
  return createHmac("sha256", secret()).update(`ip:${now.toISOString().slice(0, 10)}:${ip}`).digest("hex");
}

/** Cache key of a render: same widget, place, period, data and design → same video. */
export function renderCacheKey(p: { widget: string; ags: string; period: string; dataVersion: string; designVersion: string }): string {
  return createHash("sha256")
    .update([p.widget, p.ags, p.period, p.dataVersion, p.designVersion].join("|"))
    .digest("hex");
}
