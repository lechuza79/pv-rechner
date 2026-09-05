import { NextRequest, NextResponse } from "next/server";
import { loginAbschliessen } from "../../../../lib/instagram";

// Rückrufadresse der Instagram-Autorisierung. Diese Adresse steht im
// Entwicklerportal hinterlegt und darf sich nicht ändern.
//
// Bewusst OHNE Admin-Prüfung: Instagram ruft sie auf, nicht der Browser des
// Betreibers mit seiner Session. Der Schutz ist der Zufallswert aus dem
// Cookie, den nur bekommt, wer den Start-Aufruf als Admin gemacht hat.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const fehler = url.searchParams.get("error");
  if (fehler) {
    return NextResponse.json(
      { error: fehler, beschreibung: url.searchParams.get("error_description") },
      { status: 400 },
    );
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const erwartet = req.cookies.get("ig_state")?.value;
  if (!code || !state || !erwartet || state !== erwartet) {
    return NextResponse.json({ error: "Ungültiger oder abgelaufener Anmeldevorgang" }, { status: 400 });
  }

  try {
    const { name, gueltigBis } = await loginAbschliessen(code, url.origin);
    const res = NextResponse.json({
      ok: true,
      konto: name,
      gueltig_bis: gueltigBis,
      hinweis:
        "Der Zugang gilt 60 Tage und lässt sich verlängern, solange er gültig und mindestens einen Tag alt ist.",
    });
    res.cookies.delete("ig_state");
    return res;
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
