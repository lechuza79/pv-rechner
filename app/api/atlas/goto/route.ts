import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "../../../../lib/rate-limit";
import { atlasPathForRegionId } from "../../../../lib/atlas";

// AGS → canonical Solar-Atlas page. The homepage map links a Gemeinde here by
// its 8-digit AGS; the server resolves the slug path and redirects. This keeps
// the ~11.000-entry slug table on the server instead of shipping it to every
// browser, and gives the map a plain <a href> that also works without JS.

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "atlas-goto");
  if (limited) return limited;

  const ags = (req.nextUrl.searchParams.get("ags") ?? "").trim();
  // Bundesland (2), Kreis (5) or Gemeinde (8) — all numeric AGS.
  if (!/^\d{2}(\d{3}(\d{3})?)?$/.test(ags)) {
    return NextResponse.redirect(new URL("/solar-atlas", req.url));
  }

  let path: string | null = null;
  try {
    path = await atlasPathForRegionId(ags);
  } catch {
    path = null;
  }

  return NextResponse.redirect(new URL(path ?? "/solar-atlas", req.url));
}
