import { NextRequest, NextResponse } from "next/server";
import { getClientIp, rateLimit } from "../../../../lib/rate-limit";
import { checkVideoParams, normaliseEmail } from "../../../../lib/video-export-config";
import { requestPublicVideo } from "../../../../lib/video-export-service";
import { einwilligungsFassung } from "../../../../lib/abo-einwilligung";

// Public: ask for a video by mail. Success (202) means "the confirmation mail
// was accepted" — never "the video exists". The durable limits live in the
// database; this in-memory window only blunts bursts before they get there.

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  invalid: "Für dieses Diagramm lässt sich gerade kein Video anfordern.",
  rate_limited: "Zu viele Anfragen. Bitte versuchen Sie es später erneut.",
  unavailable: "Die Videoerstellung ist gerade nicht verfügbar. Bitte versuchen Sie es später erneut.",
  failed: "Das hat gerade nicht geklappt. Bitte versuchen Sie es erneut.",
};

function answer(status: number, code: string) {
  return NextResponse.json({ code, message: MESSAGES[code] ?? null }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "video-export-request", 10, 60_000);
  if (limited) return answer(429, "rate_limited");
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return answer(400, "invalid"); }
  // Honeypot for scripted form posts; answered like a success.
  if (typeof body.website === "string" && body.website) return answer(202, "accepted");
  const check = checkVideoParams(body);
  const email = normaliseEmail(body.email);
  if (!check.ok || !email) return answer(400, "invalid");
  // Optional subscription: only a literal true counts, and only with a consent
  // wording we can prove the dialog showed. An unknown version is refused
  // rather than silently replaced by today's text.
  const subscribe = body.subscribe === true;
  const consentVersion = typeof body.consentVersion === "string" ? body.consentVersion : null;
  if (subscribe && !einwilligungsFassung(consentVersion)) return answer(400, "invalid");
  try {
    const out = await requestPublicVideo({
      params: check.params, email, ip: getClientIp(req), subscribe: subscribe ? { consentVersion: consentVersion! } : null,
    });
    return answer(out.http, out.code);
  } catch (e) {
    console.error(`video-export request failed: ${e instanceof Error ? e.message : String(e)}`);
    return answer(500, "failed");
  }
}
