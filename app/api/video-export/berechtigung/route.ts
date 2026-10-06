import { NextResponse } from "next/server";
import { videoDirectAccess } from "../../../../lib/video-export-entitlement";

// Does this session start renders directly (no mail)? The menu asks once.
export const dynamic = "force-dynamic";

export async function GET() {
  const direct = await videoDirectAccess();
  return NextResponse.json({ direct }, { headers: { "Cache-Control": "private, no-store" } });
}
