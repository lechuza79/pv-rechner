import { NextRequest, NextResponse } from "next/server";
import { GET as generationHandler } from "../api/energy/generation/route";

// The homepage charts read today's generation from this path (the design
// package's helper proxied it). Same data as /api/energy/generation.
//
// THE HANDLER IS CALLED IN-PROCESS, NEVER OVER HTTP AGAINST OUR OWN PUBLIC
// URL. A serverless function does not behave like a browser, so the bot
// protection answers its request itself: measured 21.09.2026 with a neutral
// user agent, solar-check.io/homepage-energy returns "<!DOCTYPE html" instead
// of data. When that answer carries HTTP 200 (a challenge page does), r.ok is
// true and r.json() throws on the first character — seven 500s on this path
// between 07:30 and 08:57 on 20.09.2026, logged as
// `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`.
// When it carries 429 (what the measurement hit), the round-trip degrades to
// a silent 502 and the homepage charts stay empty.
//
// Same class as the OG image that fetched its own font over the public domain
// (08.09.2026) — and /scene-data already states the rule in this repo:
// "Shared server readers avoid HTTP requests back into our own deployment."
// The fix belongs in the code, not in a firewall exception list: such a list
// would have to name every path a function ever calls on itself, and goes
// stale at the next one.
export async function GET(req: NextRequest) {
  // A FRESH request on the generation path, not the incoming one: the old
  // round-trip fetched the bare path, so the homepage always got the one
  // default answer (Germany, 24 h, trimmed tail). Passing `req` through would
  // forward ?hours=/?start= and turn this alias into a second, unintended
  // parameter surface. The original headers ride along so the rate limiter
  // inside the handler still sees the real caller rather than this route.
  const inner = new NextRequest(new URL("/api/energy/generation", req.nextUrl.origin), { headers: req.headers });
  const r = await generationHandler(inner).catch(() => null);
  if (!r || !r.ok) return NextResponse.json({ error: "Unavailable" }, { status: 502 });
  return NextResponse.json(await r.json(), { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
}
