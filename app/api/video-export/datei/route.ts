import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "../../../../lib/rate-limit";
import { isAdminSession } from "../../../../lib/admin-guard";
import { openByDownloadToken, openByJob } from "../../../../lib/video-export-service";

// The finished MP4. Two keys open it: the download token from the mail, or
// (for the operator) the job id with an admin session. In production the
// answer is a redirect to a signed storage URL that lives five minutes.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "video-export-file", 30, 60_000);
  if (limited) return limited;
  const job = req.nextUrl.searchParams.get("job");
  let file;
  try {
    file = job ? ((await isAdminSession()) ? await openByJob(job) : null) : await openByDownloadToken(req.nextUrl.searchParams.get("t"));
  } catch (e) {
    console.error(`video-export file failed: ${e instanceof Error ? e.message : String(e)}`);
    return new NextResponse("Nicht verfügbar", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!file) return new NextResponse("Dieser Link ist abgelaufen oder ungültig.", { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
  if ("url" in file) return NextResponse.redirect(file.url, { status: 302, headers: { "Cache-Control": "no-store" } });
  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(file.bytes.length),
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
