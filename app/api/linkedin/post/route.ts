import { NextRequest, NextResponse } from "next/server";
import { istAdminOderCron } from "../../../../lib/admin-guard";
import { ladeBildHoch, posteText } from "../../../../lib/linkedin";
import { pruefungGueltig, fassungsAbdruck } from "../../../../lib/social-pruefung";
import { socialKennzahlen } from "../../../../lib/social-kennzahlen";
import { baueAllePosts } from "../../../../lib/social-posts";
import { ladeFassungen } from "../../../../lib/social-vorlagen-db";
import { pruefeMechanisch, sperren } from "../../../../lib/social-mechanik";

// Veröffentlichung eines Beitrags mit Bild.
//
// Das Bild wird im Browser aus der Karte aufgenommen, die dort ohnehin steht,
// und hier hochgereicht. Ein zweiter Renderweg auf dem Server hieße, dass das
// veröffentlichte Bild ein anderes ist als das abgenommene — und genau diese
// Sorte Unterschied merkt niemand, bis er im Feed steht.
//
// DER TEXT KOMMT NICHT VOM BROWSER. Er wird hier neu gebaut, aus denselben
// Kennzahlen und derselben gespeicherten Fassung wie in der Ansicht. Sonst wäre
// die Prüfung nur so gut wie das, was der Aufrufer behauptet: Wer den geprüften
// Text schickt und ein anderes Bild aufnimmt, käme durch.
//
// Das Bild lässt sich so nicht absichern — es entsteht im Browser. Absicherbar
// ist der Abgleich: Der Aufrufer schickt den Abdruck der Fassung, die er
// aufgenommen hat, und wir halten ihn gegen unseren eigenen. Weicht er ab, hat
// der Browser einen alten Stand, und wir senden nicht.

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
    /** Abdruck der Fassung, die der Browser aufgenommen hat. */
    fassung?: string;
    bildBase64?: string;
    bildAlt?: string;
    ersterKommentar?: string;
  };

  if (!body.postId) return NextResponse.json({ error: "Keine Post-Kennung übergeben" }, { status: 400 });

  let post;
  let kennzahlen;
  try {
    kennzahlen = await socialKennzahlen();
    post = baueAllePosts(kennzahlen, await ladeFassungen()).find((p) => p.id === body.postId);
  } catch (err) {
    return NextResponse.json({ error: `Zahlen nicht abrufbar: ${(err as Error).message}` }, { status: 503 });
  }
  if (!post) return NextResponse.json({ error: "Unbekannte Post-Kennung" }, { status: 404 });

  const fassung = { text: post.text, bild: post.bild };
  const abdruck = fassungsAbdruck(fassung);
  // PFLICHT, nicht optional. Vorher stand hier `if (body.fassung && …)` — wer
  // das Feld wegließ, übersprang die Prüfung ersatzlos. Damit war folgender
  // Weg offen: Ein Tab steht auf altem Datenstand und hat das Bild dazu
  // aufgenommen; in einem zweiten wird nach einer Datenbewegung neu geprüft und
  // freigegeben. Der erste sendet ohne Abdruck — veröffentlicht wird der neue
  // Text mit dem alten Bild, beide Prüfungen grün. Genau die Fehlerklasse, die
  // dieses Projekt als schwerste führt: eine Aussage, die nicht zur Zahl
  // daneben passt. Gefunden von einem adversarialen Prüfer.
  if (!body.fassung) {
    return NextResponse.json(
      { error: "Kein Fassungs-Abdruck übergeben — ohne ihn ist nicht belegbar, was aufgenommen wurde." },
      { status: 400 },
    );
  }
  if (body.fassung !== abdruck) {
    return NextResponse.json(
      {
        error:
          "Der Browser zeigt einen anderen Stand als die Ablage — vermutlich hat sich der Datenstand bewegt. Seite neu laden und noch einmal ansehen.",
      },
      { status: 409 },
    );
  }

  // DIE MECHANIK SPERRT HIER, nicht erst in der Oberfläche.
  //
  // Sie läuft gegen die Fassung, die WIRKLICH rausgeht, und gegen den
  // Datenstand von jetzt — nicht gegen eine Werkbank, die jemand starten muss.
  // Genau das war der Unterschied, an dem die bisherige Prüfung hing: Eine
  // Regel, die nur läuft, wenn sie jemand aufruft, ist keine Sperre.
  //
  // Sie steht VOR der Freigabeprüfung: Ein Beitrag mit einem mechanischen
  // Widerspruch soll das erfahren, auch wenn er noch gar keine Freigabe hat —
  // sonst schickt man erst jemanden zum Prüfen und erfährt danach, dass die
  // Zahlen sich widersprechen.
  const mechanik = sperren(pruefeMechanisch(post, kennzahlen));
  if (mechanik.length) {
    return NextResponse.json(
      { error: `Mechanische Prüfung: ${mechanik.map((b) => b.text).join(" · ")}` },
      { status: 409 },
    );
  }

  const pruefung = await pruefungGueltig(post.id, fassung);
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

    const ergebnis = await posteText(post.text, {
      bildUrn,
      bildAlt: body.bildAlt,
      ersterKommentar: body.ersterKommentar,
    });
    return NextResponse.json({ ok: true, ...ergebnis });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
