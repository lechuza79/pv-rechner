import { NextResponse } from "next/server";

// ─── Per-IP rate limit for public data endpoints ─────────────────────────────
//
// Protects the *outbound* side of the app: the API routes that serve our
// curated/aggregated datasets (energy mix, MaStR aggregates, market prices,
// feed-in rates, funding). Anyone can call these URLs directly, so without a
// limit a single script could enumerate and download the whole dataset in
// minutes. A generous per-IP sliding window lets real users (a handful of calls
// per page) through untouched while forcing a scraper into a slow crawl.
//
// Deliberately in-memory (per serverless instance, resets on cold start): same
// pragmatic trade-off as the contact form — no new infrastructure, and it still
// raises the bar substantially. It composes with the CDN cache: cache *hits*
// are served at the edge and never reach this code, so only cache misses (new
// param combinations — exactly the enumeration case) are counted.
//
// IPs are held transiently in memory for security throttling only (never
// logged, never persisted) — the same lawful-basis footing as the existing
// contact-form limiter.

type Timestamps = number[];
const namespaces = new Map<string, Map<string, Timestamps>>();

function getClientIp(req: Request): string | null {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  // No forwarded IP → almost always an internal/SSR fetch, not an external
  // client (Vercel always sets x-forwarded-for for real traffic). Returning
  // null makes the caller skip the limit, so server-side rendering and
  // route-to-route calls never throttle themselves.
  return null;
}

/**
 * Returns a 429 response if the caller has exceeded `max` requests within
 * `windowMs` for the given `namespace`, otherwise null (proceed).
 *
 * @param namespace  logical bucket, e.g. "energy-generation" — keeps unrelated
 *                   endpoints on independent windows.
 * @param max        allowed requests per window per IP (default 120).
 * @param windowMs   window length in ms (default 60s).
 */
export function rateLimit(
  req: Request,
  namespace: string,
  max = 120,
  windowMs = 60_000,
): NextResponse | null {
  const ip = getClientIp(req);
  if (!ip) return null; // internal / unattributable call — don't throttle

  let bucket = namespaces.get(namespace);
  if (!bucket) {
    bucket = new Map();
    namespaces.set(namespace, bucket);
  }

  const now = Date.now();

  // Sweep fully-expired IPs occasionally so the map can't grow without bound
  // (x-forwarded-for is attacker-controlled, so distinct keys are cheap).
  if (bucket.size > 5000) {
    bucket.forEach((times, key) => {
      if (times.every((t) => now - t >= windowMs)) bucket!.delete(key);
    });
  }

  const timestamps = (bucket.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= max) {
    bucket.set(ip, timestamps);
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte einen Moment warten." },
      { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } },
    );
  }

  timestamps.push(now);
  bucket.set(ip, timestamps);
  return null;
}
