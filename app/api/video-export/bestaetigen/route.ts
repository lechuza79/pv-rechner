import { NextRequest, NextResponse } from "next/server";
import { getClientIp, rateLimit } from "../../../../lib/rate-limit";
import { confirmVideo } from "../../../../lib/video-export-service";
import { videoConfirmationContext } from "../../../../lib/video-export-db";
import { plausibleToken, hashToken } from "../../../../lib/video-export-token";
import { getGemeindePfad, getRegionById } from "../../../../lib/atlas";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" };

// GET is read-only: scanners may follow the redirect but cannot confirm.
// All visible states belong to the shared site modal, never raw API HTML.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t") ?? "";
  let context = null;
  let unavailable = false;
  try { if (plausibleToken(token)) context = await videoConfirmationContext(hashToken(token)); } catch { unavailable = true; }
  if (req.nextUrl.searchParams.get("view") === "json") {
    if (unavailable) return NextResponse.json({ outcome: "unavailable" }, { status: 503, headers });
    if (!context) return NextResponse.json({ outcome: "invalid" }, { headers });
    const region = await getRegionById(context.ags).catch(() => null);
    return NextResponse.json({
      place: region?.name ?? "", period: context.period,
      outcome: context.status === "pending" ? (Date.parse(context.token_expires_at) < Date.now() ? "expired" : "pending") : "already",
    }, { headers });
  }
  const path = context ? await getGemeindePfad(context.ags).catch(() => null) : null;
  const target = path ? `/solar-atlas/${path.bundesland}/${path.kreis}/${path.gemeinde}` : context ? `/embed/gemeinde/${context.ags}/monitor` : "/solar-atlas";

  // Fragments keep the confirmation credential out of page requests/referrers.
  const fragment = `video-confirm=${plausibleToken(token) ? token : "invalid"}`;
  return new NextResponse(null, { status: 303, headers: { ...headers, Location: `${target}#${fragment}` } });
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "video-export-confirm", 20, 60_000);
  if (limited) return NextResponse.json({ outcome: "unavailable" }, { status: 429, headers });
  let token: unknown = null;
  try { token = (await req.formData()).get("t"); } catch { /* Invalid input is handled by the service. */ }
  try {
    const outcome = await confirmVideo(token, getClientIp(req));
    return NextResponse.json({ outcome }, { headers });
  } catch {
    return NextResponse.json({ outcome: "unavailable" }, { status: 503, headers });
  }
}
