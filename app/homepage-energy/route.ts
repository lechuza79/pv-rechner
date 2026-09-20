import { NextRequest, NextResponse } from "next/server";

// The homepage charts read today's generation from this path (the design
// package's helper proxied it). Same data as /api/energy/generation.
export async function GET(req: NextRequest) {
  const r = await fetch(req.nextUrl.origin + "/api/energy/generation", { signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!r || !r.ok) return NextResponse.json({ error: "Unavailable" }, { status: 502 });
  return NextResponse.json(await r.json(), { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
}
