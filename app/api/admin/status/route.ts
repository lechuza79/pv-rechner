import { NextResponse } from "next/server";

// Whether the current session belongs to an admin. Used by the header to show
// the "Admin" entry only to admins — client-side, so the public pages stay
// static and the admin e-mail list never ships to the browser.

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function GET() {
  const { createClient } = await import("../../../../lib/supabase-server-component");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email?.toLowerCase() || "");
  return NextResponse.json({ isAdmin });
}
