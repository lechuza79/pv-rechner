import { NextRequest, NextResponse } from "next/server";
import { istAdminOderCron } from "../../../../lib/admin-guard";
import { posteBild } from "../../../../lib/instagram";
import { legeBildAb } from "../../../../lib/social-bildablage";
import { pruefungGueltig, fassungsAbdruck } from "../../../../lib/social-pruefung";
import { socialKennzahlen } from "../../../../lib/social-kennzahlen";
import { baueAllePosts } from "../../../../lib/social-posts";
import { ladeFassungen } from "../../../../lib/social-vorlagen-db";
import { pruefeMechanisch, sperren } from "../../../../lib/social-mechanik";
import { ersterVersand, schonGesendet, schreibeVersand } from "../../../../lib/social-versand-log";
import { HALTBARKEIT_VORGABE, darfNachgereichtWerden } from "../../../../lib/social-haltbarkeit";
import { FAMILIEN } from "../../../../lib/redaktionsplan";
import { heuteInBerlin } from "../../../../lib/zeit";

// Veröffentlichung eines Beitrags auf Instagram.
//
// DIESELBEN SPERREN WIE BEI LINKEDIN, in derselben Reihenfolge: Abgleich der
// Fassung, mechanische Prüfung, Freigabe, Doppelversand. Sie hier zu lockern,
// weil es „nur" der zweite Kanal ist, hieße, dass eine ungeprüfte Zahl über den
// Nebeneingang hinausgeht.
//
// DREI UNTERSCHIEDE, alle aus der Schnittstelle:
//
// 1. DAS BILD IST PFLICHT. Instagram kennt keinen reinen Textbeitrag — ohne
//    Bild gäbe es nichts zu veröffentlichen.
// 2. ES MUSS ERST ÖFFENTLICH LIEGEN. Instagram nimmt keine Bilddaten entgegen,
//    sondern holt sie von einer Adresse ab. Deshalb der Umweg über die Ablage.
// 3. JPEG. Der Browser nimmt für diesen Weg als JPEG auf, nicht als PNG.
//
// Der TEXT kommt wie bei LinkedIn nicht vom Browser, sondern wird hier neu
// gebaut — sonst wäre die Prüfung nur so gut wie das, was der Aufrufer
// behauptet.

export const dynamic = "force-dynamic";

/** Eine Kartenaufnahme liegt bei einigen hundert Kilobyte; die Grenze ist
 *  großzügig darüber und schützt die Funktion vor einem Fehlgriff. */
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

  // Der Beitrag muss für diesen Kanal überhaupt vorgesehen sein. Ohne die
  // Prüfung ginge jede Story auf Instagram, auch die, für die dort bewusst kein
  // Platz ist.
  if (!post.kanal.includes("instagram")) {
    return NextResponse.json(
      { error: "Dieser Beitrag ist nicht für Instagram vorgesehen." },
      { status: 409 },
    );
  }

  const fassung = { text: post.text, bild: post.bild };
  const abdruck = fassungsAbdruck(fassung);
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

  const mechanik = sperren(pruefeMechanisch(post, kennzahlen));
  if (mechanik.length) {
    return NextResponse.json(
      { error: `Mechanische Prüfung: ${mechanik.map((b) => b.text).join(" · ")}` },
      { status: 409 },
    );
  }

  // DIE FREIGABE GILT DEM INHALT, NICHT DEM KANAL — und deshalb steht hier
  // dieselbe Prüfung wie bei LinkedIn, ohne Kanal-Zusatz. Ob eine Zahl stimmt
  // und ob eine Rechtsaussage trägt, hängt nicht daran, wo sie erscheint. Trägt
  // Instagram einen eigenen Text, ist das eine andere Fassung mit eigenem
  // Abdruck und braucht damit von selbst eine eigene Freigabe.
  const pruefung = await pruefungGueltig(post.id, fassung);
  if (!pruefung.ok) {
    return NextResponse.json({ error: pruefung.grund }, { status: 409 });
  }


  // NACHREICHEN AUF EINEM SPÄTEREN KANAL. Kommt ein Kanal dazu, liegt es nahe,
  // die schon gesendeten Beiträge dort nachzureichen — und für einen Teil von
  // ihnen wäre das falsch. „251.000 neue Anlagen in zwölf Monaten" ist im
  // November eine andere Aussage als im September, auch wenn kein Wort sich
  // ändert; ein Strukturbefund trägt dagegen über Jahre.
  //
  // Der Fingerabdruck fängt das NICHT: Er merkt, wenn sich die Zahlen bewegen,
  // nicht, wenn dieselbe Zahl ein anderes Zeitfenster meint.
  //
  // Die Frist hängt an der Kategorie, nicht am einzelnen Beitrag — sie ist eine
  // Eigenschaft der Gattung. Ohne Angabe gilt die vorsichtige Vorgabe.
  const haltbarkeit =
    FAMILIEN.find((f) => f.schluessel === post.kategorie)?.haltbarkeit ?? HALTBARKEIT_VORGABE;
  const nachreichen = darfNachgereichtWerden(
    haltbarkeit,
    await ersterVersand(post.id, abdruck),
    heuteInBerlin(),
  );
  if (!nachreichen.darf) {
    return NextResponse.json({ error: nachreichen.grund }, { status: 409 });
  }
  const bereits = await schonGesendet(post.id, abdruck, "instagram");
  if (bereits) {
    return NextResponse.json(
      {
        error: `Diese Fassung ging auf Instagram bereits am ${new Date(bereits.gesendet_am).toLocaleString("de-DE")} raus.`,
        extern: bereits.extern_id,
      },
      { status: 409 },
    );
  }

  if (!body.bildBase64) {
    return NextResponse.json(
      { error: "Ohne Bild geht auf Instagram nichts — die Plattform kennt keinen reinen Textbeitrag." },
      { status: 400 },
    );
  }
  if (!body.bildAlt?.trim()) {
    return NextResponse.json({ error: "Bildbeschreibung fehlt" }, { status: 400 });
  }

  try {
    const bytes = Buffer.from(body.bildBase64, "base64");
    if (bytes.byteLength > MAX_BILD_BYTES) {
      return NextResponse.json({ error: "Bild zu groß" }, { status: 413 });
    }

    const bildUrl = await legeBildAb(
      post.id,
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
      new Date().toISOString(),
    );

    const ergebnis = await posteBild(bildUrl, post.text, { bildAlt: body.bildAlt });

    // SOFORT NACH dem Aufruf protokollieren. Scheitert das Schreiben, ist der
    // Beitrag trotzdem draußen — dann muss der Fehler laut sein, damit niemand
    // ein zweites Mal sendet.
    let protokollFehler: string | null = null;
    try {
      await schreibeVersand({
        post_id: post.id,
        fassung_fingerabdruck: abdruck,
        extern_id: ergebnis.id || null,
        kanal: "instagram",
      });
    } catch (err) {
      protokollFehler = (err as Error).message;
    }

    return NextResponse.json({
      ok: true,
      ...ergebnis,
      ...(protokollFehler
        ? {
            warnung: `Der Beitrag ist DRAUSSEN, aber das Versandprotokoll konnte nicht geschrieben werden (${protokollFehler}). Nicht erneut senden — die Doppelversand-Sperre greift jetzt nicht.`,
          }
        : {}),
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
