import { NextRequest, NextResponse } from "next/server";
import { istAdminOderCron } from "../../../../lib/admin-guard";
import { ladeBildHoch, posteText } from "../../../../lib/linkedin";
import { pruefungGueltig } from "../../../../lib/social-pruefung";

// Veröffentlichung eines Beitrags mit Bild.
//
// Der Weg ist bewusst so: Das Bild wird im Browser aus der Karte aufgenommen,
// die dort ohnehin steht, und hier hochgereicht. Ein zweiter Renderweg auf dem
// Server hieße, dass das veröffentlichte Bild ein anderes ist als das
// abgenommene — und genau diese Sorte Unterschied merkt niemand, bis er im Feed
// steht.
//
// Ohne bestandene Prüfung geht nichts raus. Die Prüfung liegt am Post und wird
// hier noch einmal befragt, nicht nur in der Oberfläche: Eine Sperre, die nur
// der Knopf kennt, ist keine.

export const dynamic = "force-dynamic";

/** Vercel-Funktionen haben ein Größenlimit für Anfragen; ein PNG dieser Karte
 *  liegt bei rund 200 KB, die Grenze hier ist großzügig darüber. */
const MAX_BILD_BYTES = 4_000_000;

export async function POST(req: NextRequest) {
  if (!(await istAdminOderCron(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    postId?: string;
    text?: string;
    bildBase64?: string;
    bildAlt?: string;
    ersterKommentar?: string;
  };

  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "Kein Text übergeben" }, { status: 400 });
  if (!body.postId) return NextResponse.json({ error: "Keine Post-Kennung übergeben" }, { status: 400 });

  const pruefung = await pruefungGueltig(body.postId, text);
  if (!pruefung.ok) {
    return NextResponse.json({ error: pruefung.grund }, { status: 409 });
  }

  try {
    let bildUrn: string | undefined;
    if (body.bildBase64) {
      const bytes = Buffer.from(body.bildBase64, "base64");
      if (bytes.byteLength > MAX_BILD_BYTES) {
        return NextResponse.json({ error: "Bild zu groß" }, { status: 413 });
      }
      if (!body.bildAlt?.trim()) {
        // Ein Diagramm ohne Alternativtext ist für Screenreader eine leere
        // Fläche. Die Zahl darin interessiert dieselben Leute.
        return NextResponse.json({ error: "Bildbeschreibung fehlt" }, { status: 400 });
      }
      bildUrn = await ladeBildHoch(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    }

    const ergebnis = await posteText(text, {
      bildUrn,
      bildAlt: body.bildAlt,
      ersterKommentar: body.ersterKommentar,
    });
    return NextResponse.json({ ok: true, ...ergebnis });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
