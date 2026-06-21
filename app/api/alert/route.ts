import { NextResponse } from "next/server";

// ─── Generic watcher alert (email via Resend) ────────────────────────────────
// A single endpoint the scheduled-task watchers (CO2, EEG, Wärmepumpe, Förder)
// call at the end of a run to deliver their report to ADMIN_EMAILS — same inbox
// as the monthly price report, so a found discrepancy actually reaches a human
// instead of waiting in the app sidebar.
//
// The watchers run locally (Claude Code) and authenticate with CRON_SECRET, which
// they read from .env.local. The RESEND_API_KEY lives only on Vercel and never
// leaves the server — the caller only needs CRON_SECRET.
//
// Auth: Authorization: Bearer $CRON_SECRET
// Body: { subject: string, body: string, tag?: string }   (body = plain text)
// Query: ?dryRun=1 renders without sending.

const CRON_SECRET = process.env.CRON_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM ?? "Solar Check <onboarding@resend.dev>";
const RECIPIENTS = Array.from(new Set((process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean)));

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: Request) {
  if (!CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { subject?: unknown; body?: unknown; tag?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const subjectRaw = typeof payload.subject === "string" ? payload.subject.trim() : "";
  const bodyRaw = typeof payload.body === "string" ? payload.body.trim() : "";
  const tag = typeof payload.tag === "string" ? payload.tag.trim().slice(0, 40) : "";

  if (!subjectRaw || !bodyRaw) {
    return NextResponse.json({ error: "subject and body are required" }, { status: 400 });
  }

  const subject = `Solar Check – Wächter: ${subjectRaw.slice(0, 140)}`;
  // Preserve the watcher's line breaks; escape so report text can't inject markup.
  const bodyHtml = escapeHtml(bodyRaw.slice(0, 20000)).replace(/\n/g, "<br>");

  const html = `<div style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;color:#3F3F3F">
    <h2 style="margin:0 0 4px">Solar Check – Wächter-Meldung</h2>
    ${tag ? `<p style="color:#777;margin:0 0 16px;font-size:13px">Quelle: ${escapeHtml(tag)}</p>` : ""}
    <div style="font-size:14px;line-height:1.7;white-space:normal">${bodyHtml}</div>
    <p style="color:#949494;font-size:12px;margin-top:20px">Automatisch erzeugt von einem solar-check.io-Wächter. Diese Meldung ändert keine Daten — sie schlägt nur vor; Sichtung + Freigabe durch einen Menschen.</p>
  </div>`;

  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";
  if (dryRun) {
    return NextResponse.json({ dryRun: true, subject, recipients: RECIPIENTS, html });
  }

  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }
  if (RECIPIENTS.length === 0) {
    return NextResponse.json({ error: "No recipients (set ADMIN_EMAILS)" }, { status: 500 });
  }

  try {
    const send = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: RESEND_FROM, to: RECIPIENTS, subject, html }),
    });

    if (!send.ok) {
      const detail = await send.text();
      console.error(`[Watcher Alert] Resend failed ${send.status}: ${detail}`);
      return NextResponse.json({ error: "Send failed", status: send.status, detail }, { status: 502 });
    }

    console.log(`[Watcher Alert] Sent "${subjectRaw.slice(0, 60)}" to ${RECIPIENTS.join(", ")}`);
    return NextResponse.json({ success: true, sentTo: RECIPIENTS, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[Watcher Alert] Exception: ${message}`);
    return NextResponse.json({ error: "Send failed", details: message }, { status: 500 });
  }
}
