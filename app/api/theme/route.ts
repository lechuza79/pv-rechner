import { NextRequest, NextResponse } from "next/server";
import { sanitizeOverrides } from "../../../lib/theme-overrides";
import { saveThemeOverrides } from "../../../lib/theme-overrides-data";

// Admin-only: persist the theming overlay (per-stage green overrides). The site
// layout reads them server-side via the cached getSavedThemeOverrides(), so
// there is no public GET here — the admin page loads the current values as a
// server prop, and this route only writes.

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function POST(req: NextRequest) {
  const { createClient } = await import("../../../lib/supabase-server-component");
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const overrides = sanitizeOverrides((body as { overrides?: unknown })?.overrides);
  const result = await saveThemeOverrides(overrides);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Save failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, overrides });
}
