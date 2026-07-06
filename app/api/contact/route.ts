import { NextResponse } from "next/server";

// ─── Contact form submission (email via Resend) ──────────────────────────────
// Public-facing counterpart to /api/alert: same Resend send pattern (from
// address, ADMIN_EMAILS recipients), but reachable by anyone via the /kontakt
// form instead of authenticated watchers. Satisfies the §5 DDG requirement for
// a second, fast contact channel alongside the email address in the Impressum.
//
// Body: { name?: string, email: string, message: string, website?: string }
//   "website" is a honeypot — real users never see or fill this field; bots
//   that auto-fill all inputs do, so a non-empty value is silently accepted
//   without sending anything.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM ?? "Solar Check <onboarding@resend.dev>";
const RECIPIENTS = Array.from(new Set((process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean)));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 5000;

// ─── Simple in-memory per-IP rate limit (5 requests / hour) ──────────────────
// Resets on cold start / new deployment — acceptable for a low-traffic contact
// form; a persistent store would be overkill for this volume.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) ?? []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX) {
    requestLog.set(ip, timestamps);
    return true;
  }
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return false;
}

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Zu viele Anfragen. Bitte versuch es in einer Stunde erneut." }, { status: 429 });
  }

  let payload: { name?: unknown; email?: unknown; message?: unknown; website?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  // Honeypot: bots that fill every field trip this. Return success without
  // sending anything, so the bot doesn't learn to skip the field.
  const honeypot = typeof payload.website === "string" ? payload.website.trim() : "";
  if (honeypot) {
    return NextResponse.json({ success: true });
  }

  const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 200) : "";
  const email = typeof payload.email === "string" ? payload.email.trim().slice(0, 320) : "";
  const message = typeof payload.message === "string" ? payload.message.trim() : "";

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Bitte gib eine gültige E-Mail-Adresse an." }, { status: 400 });
  }
  if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) {
    return NextResponse.json({ error: `Die Nachricht muss zwischen ${MESSAGE_MIN} und ${MESSAGE_MAX} Zeichen lang sein.` }, { status: 400 });
  }

  if (!RESEND_API_KEY) {
    console.error("[Contact] RESEND_API_KEY not configured");
    return NextResponse.json({ error: "Der Versand ist aktuell nicht verfügbar. Schreib uns bitte direkt per E-Mail." }, { status: 500 });
  }
  if (RECIPIENTS.length === 0) {
    console.error("[Contact] No recipients (ADMIN_EMAILS not set)");
    return NextResponse.json({ error: "Der Versand ist aktuell nicht verfügbar. Schreib uns bitte direkt per E-Mail." }, { status: 500 });
  }

  const subject = `Solar Check – Kontaktformular${name ? ` von ${name.slice(0, 60)}` : ""}`;
  const bodyHtml = escapeHtml(message).replace(/\n/g, "<br>");

  const html = `<div style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;color:#3F3F3F">
    <h2 style="margin:0 0 4px">Neue Nachricht über das Kontaktformular</h2>
    <p style="color:#777;margin:0 0 16px;font-size:13px">
      ${name ? `Von: ${escapeHtml(name)}<br>` : ""}E-Mail: ${escapeHtml(email)}
    </p>
    <div style="font-size:14px;line-height:1.7;white-space:normal">${bodyHtml}</div>
  </div>`;

  try {
    const send = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: RESEND_FROM, to: RECIPIENTS, subject, html, reply_to: email }),
    });

    if (!send.ok) {
      const detail = await send.text();
      console.error(`[Contact] Resend failed ${send.status}: ${detail}`);
      return NextResponse.json({ error: "Senden fehlgeschlagen. Bitte versuch es später erneut." }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const messageText = err instanceof Error ? err.message : "Unknown error";
    console.error(`[Contact] Exception: ${messageText}`);
    return NextResponse.json({ error: "Senden fehlgeschlagen. Bitte versuch es später erneut." }, { status: 500 });
  }
}
