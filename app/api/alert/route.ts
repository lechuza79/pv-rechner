import { NextResponse } from "next/server";
import { buildAlertMail, decideDelivery, type AlertPayload } from "../../../lib/alert-format";

// ─── Generic watcher alert (email via Resend) ────────────────────────────────
// A single endpoint the scheduled-task watchers (CO2, EEG, Wärmepumpe, Förder)
// call at the end of a run to deliver their report to ADMIN_EMAILS — same inbox
// as the monthly price report, so a found discrepancy actually reaches a human
// instead of waiting in the app sidebar.
//
// THIS ENDPOINT IS THE GATE, NOT A PIPE (28.07.2026). Every watcher used to send
// its full run log here, and the operator got seven "action required" mails in
// three days for findings that were either self-healed or addressed to Claude.
// A gate that only forwards what needs a human decision is the only thing that
// keeps the one mail that matters from being filtered away. The shaping and the
// send/skip decision live in lib/alert-format.ts so they can be tested without
// hitting Resend.
//
// The watchers run locally (Claude Code) and authenticate with CRON_SECRET, which
// they read from .env.local. The RESEND_API_KEY lives only on Vercel and never
// leaves the server — the caller only needs CRON_SECRET.
//
// Auth: Authorization: Bearer $CRON_SECRET
// Body: { subject, decisions?, done?, details?, audience?, force?, body?, tag? }
// Query: ?dryRun=1 renders without sending.

const CRON_SECRET = process.env.CRON_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM ?? "Solar Check <onboarding@resend.dev>";
const RECIPIENTS = Array.from(new Set((process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean)));

export async function POST(req: Request) {
  if (!CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: AlertPayload;
  try {
    payload = (await req.json()) as AlertPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const delivery = decideDelivery(payload);
  if (delivery.problem) {
    return NextResponse.json({ error: delivery.problem }, { status: 400 });
  }

  const mail = buildAlertMail(payload);
  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";

  // Nicht zu versenden ist der Normalfall, kein Fehler: ein Lauf ohne Entscheidung
  // für den Betreiber ist ein guter Lauf. Der Aufrufer bekommt den Grund zurück
  // und protokolliert ihn — die Meldung landet im Wochenbericht, nicht im Postfach.
  if (!delivery.send) {
    console.log(`[Watcher Alert] Nicht versendet (${delivery.reason}): ${mail.subject}`);
    return NextResponse.json({ skipped: true, reason: delivery.reason, subject: mail.subject });
  }

  if (dryRun) {
    return NextResponse.json({ dryRun: true, subject: mail.subject, recipients: RECIPIENTS, html: mail.html });
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
      body: JSON.stringify({ from: RESEND_FROM, to: RECIPIENTS, subject: mail.subject, html: mail.html }),
    });

    if (!send.ok) {
      const detail = await send.text();
      console.error(`[Watcher Alert] Resend failed ${send.status}: ${detail}`);
      return NextResponse.json({ error: "Send failed", status: send.status, detail }, { status: 502 });
    }

    console.log(`[Watcher Alert] Sent "${mail.subject.slice(0, 60)}" to ${RECIPIENTS.join(", ")}`);
    return NextResponse.json({ success: true, sentTo: RECIPIENTS, subject: mail.subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[Watcher Alert] Exception: ${message}`);
    return NextResponse.json({ error: "Send failed", details: message }, { status: 500 });
  }
}
