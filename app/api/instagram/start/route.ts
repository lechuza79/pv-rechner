import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "../../../../lib/admin-guard";
import { anmeldeAdresse, instagramKonfiguriert } from "../../../../lib/instagram";

// Startet die einmalige Autorisierung. Nur für eine Admin-Session — wer diese
// Adresse aufrufen kann, verknüpft ein Konto mit unserem Versand.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!instagramKonfiguriert()) {
    return NextResponse.json(
      { error: "INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET fehlen in der Umgebung" },
      { status: 500 },
    );
  }

  // Zufallswert gegen untergeschobene Rückrufe: Er wandert als Cookie mit und
  // muss beim Rückruf wieder auftauchen.
  const state = crypto.randomUUID();
  const origin = new URL(req.url).origin;
  const res = NextResponse.redirect(anmeldeAdresse(origin, state));
  res.cookies.set("ig_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/instagram",
    maxAge: 600,
  });
  return res;
}
