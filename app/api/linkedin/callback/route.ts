import { NextRequest, NextResponse } from "next/server";
import { loginAbschliessen } from "../../../../lib/linkedin";

// Rückrufadresse der LinkedIn-Autorisierung. Diese Adresse steht im
// Entwicklerportal hinterlegt und darf sich nicht ändern.
//
// Bewusst OHNE Admin-Prüfung: LinkedIn ruft sie auf, nicht der Browser des
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
  const erwartet = req.cookies.get("li_state")?.value;
  if (!code || !state || !erwartet || state !== erwartet) {
    return NextResponse.json({ error: "Ungültiger oder abgelaufener Anmeldevorgang" }, { status: 400 });
  }

  try {
    const { name, gueltigBis } = await loginAbschliessen(code, url.origin);
    const res = NextResponse.json({
      ok: true,
      konto: name,
      gueltig_bis: gueltigBis,
      hinweis: "Der Zugang läuft ab. Vor Ablauf meldet sich der Gesundheitscheck.",
    });
    res.cookies.delete("li_state");
    return res;
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
