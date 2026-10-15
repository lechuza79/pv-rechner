import { NextResponse } from "next/server";
import { dispatchWorkflow } from "../../../../lib/github-dispatch";

// Hourly trigger for the live-weather snapshot (wetter-schnappschuss.yml).
//
// WHY A VERCEL CRON AND NOT ONLY THE GITHUB SCHEDULE: the workflow is scheduled
// "20 * * * *", but GitHub starts it every four to eight hours (measured
// 24.09.–07.10.2026: 60 starts in 13 days instead of ~310). One failed run on
// top of that left the page on a 12-hour-old model run on 07.10.2026. Vercel
// crons start on time; the GitHub schedule stays as the fallback.
//
// Auth: Vercel sends Authorization: Bearer $CRON_SECRET. The route takes no
// input — it can only ever start this one workflow on main.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = process.env.VIDEO_EXPORT_DISPATCH_TOKEN;
  if (!token) return NextResponse.json({ error: "dispatch credential missing" }, { status: 500 });
  try {
    await dispatchWorkflow("wetter-schnappschuss.yml", token);
    return NextResponse.json({ dispatched: true });
  } catch (error) {
    // The message carries only the HTTP status, never the credential.
    return NextResponse.json({ error: `dispatch failed: ${(error as Error).message}` }, { status: 502 });
  }
}
