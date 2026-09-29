import { NextRequest, NextResponse } from "next/server";
import { getClientIp, rateLimit } from "../../../../lib/rate-limit";
import { tokens } from "../../../../lib/theme";
import { escapeHtml } from "../../../../lib/html-escape";
import { confirmVideo, type ConfirmOutcome } from "../../../../lib/video-export-service";

// The confirmation link from the mail.
//
// GET ONLY SHOWS A BUTTON, POST REDEEMS. Mail security scanners open every
// link in a mail on arrival; a GET that starts a render would let them
// confirm on the recipient's behalf. The minimal markup is a functional
// placeholder — look and wording belong to the UI owner.

export const dynamic = "force-dynamic";

const TEXT: Record<ConfirmOutcome, { title: string; body: string }> = {
  queued: { title: "Bestätigt", body: "Ihr Video wird erstellt. Sie bekommen eine E-Mail mit dem Downloadlink, sobald es fertig ist. Sie können diese Seite schließen." },
  ready: { title: "Bestätigt", body: "Das Video lag schon bereit. Der Downloadlink ist unterwegs in Ihr Postfach." },
  already: { title: "Schon bestätigt", body: "Dieser Link wurde bereits verwendet. Die Mail mit dem Downloadlink kommt, sobald das Video fertig ist." },
  expired: { title: "Link abgelaufen", body: "Der Bestätigungslink ist abgelaufen. Bitte fordern Sie das Video auf der Seite erneut an." },
  invalid: { title: "Link ungültig", body: "Dieser Bestätigungslink ist ungültig." },
  capacity: { title: "Gerade ausgelastet", body: "Wir erstellen gerade zu viele Videos. Bitte fordern Sie es später erneut an." },
  unavailable: { title: "Nicht verfügbar", body: "Die Videoerstellung ist gerade nicht verfügbar. Bitte versuchen Sie es später erneut." },
};

function page(title: string, inner: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)} – Solar Check</title></head>` +
      `<body style="font-family:system-ui,sans-serif;max-width:520px;margin:48px auto;padding:0 16px;line-height:1.5"><h1 style="font-size:${tokens["--font-size-h2"]}">${escapeHtml(title)}</h1>${inner}<p><a href="/">Zu Solar Check</a></p></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" } },
  );
}

export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get("t") ?? "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(t)) return page(TEXT.invalid.title, `<p>${TEXT.invalid.body}</p>`, 400);
  return page("E-Mail-Adresse bestätigen",
    `<p>Bestätigen Sie Ihre Videoanfrage und, falls ausgewählt, Ihr Ortsabo.</p>` +
      `<form method="post"><input type="hidden" name="t" value="${escapeHtml(t)}"><button type="submit" style="font:inherit;padding:10px 18px">Video erstellen</button></form>`);
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "video-export-confirm", 20, 60_000);
  if (limited) return page(TEXT.unavailable.title, `<p>${TEXT.unavailable.body}</p>`, 429);
  let token: unknown = null;
  try { token = (await req.formData()).get("t"); } catch { /* not a form post */ }
  try {
    const outcome = await confirmVideo(token, getClientIp(req));
    const t = TEXT[outcome];
    return page(t.title, `<p data-video-confirm="${outcome}">${t.body}</p>`, outcome === "invalid" ? 400 : 200);
  } catch (e) {
    console.error(`video-export confirm failed: ${e instanceof Error ? e.message : String(e)}`);
    return page(TEXT.unavailable.title, `<p>${TEXT.unavailable.body}</p>`, 500);
  }
}
