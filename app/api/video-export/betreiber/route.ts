import { NextRequest, NextResponse } from "next/server";
import { checkVideoParams } from "../../../../lib/video-export-config";
import { videoDirectAccess, videoDirectRecipient } from "../../../../lib/video-export-entitlement";
import { jobStatus, operatorCreate } from "../../../../lib/video-export-service";

// Entitled sessions: start directly, with automatic delivery to the verified account.
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store" };

export async function POST(req: NextRequest) {
  if (!(await videoDirectAccess())) return NextResponse.json({ code: "forbidden" }, { status: 403, headers: noStore });
  const recipient = await videoDirectRecipient();
  if (!recipient) return NextResponse.json({ code: "unavailable", message: "Bitte bestätigen Sie zuerst die E-Mail-Adresse Ihres Kontos." }, { status: 403, headers: noStore });
  let body: unknown;
  try { body = await req.json(); } catch { body = null; }
  const check = checkVideoParams(body);
  if (!check.ok) return NextResponse.json({ code: "invalid", reason: check.reason }, { status: 400, headers: noStore });
  try {
    const r = await operatorCreate(check.params, recipient);
    return NextResponse.json(r, { status: r.http, headers: noStore });
  } catch (e) {
    console.error(`video-export operator failed: ${e instanceof Error ? e.message : String(e)}`);
    return NextResponse.json({ code: "failed" }, { status: 500, headers: noStore });
  }
}

export async function GET(req: NextRequest) {
  if (!(await videoDirectAccess())) return NextResponse.json({ code: "forbidden" }, { status: 403, headers: noStore });
  const id = req.nextUrl.searchParams.get("job") ?? "";
  const s = await jobStatus(id);
  const downloadUrl = s.status === "done" ? `/api/video-export/datei?job=${id}` : undefined;
  return NextResponse.json({ status: s.status, progress: s.progress ?? 0, error: s.error ?? null, downloadUrl, renderMs: s.render_ms ?? null, bytes: s.bytes ?? null }, { headers: noStore });
}
