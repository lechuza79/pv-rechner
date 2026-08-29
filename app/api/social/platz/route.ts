import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "../../../../lib/admin-guard";
import { loeschePlatz, setzePlatz, type PlatzArt } from "../../../../lib/social-plaetze";
import { socialKennzahlen } from "../../../../lib/social-kennzahlen";
import { baueAllePosts } from "../../../../lib/social-posts";
import { ladeFassungen } from "../../../../lib/social-vorlagen-db";
import { FAMILIEN } from "../../../../lib/redaktionsplan";
import { RATGEBER } from "../../../../lib/ratgeber";

// Einen Kalendertag belegen oder freigeben.
//
// NUR ADMIN-SESSION, kein Cron-Schlüssel — nicht aus Sicherheitsgründen wie bei
// der Freigabe, sondern weil das eine redaktionelle Entscheidung ist. Ein
// Automat, der sich den Kalender selbst füllt, hätte keine.
//
// JEDER VERWEIS WIRD GEGEN SEINE QUELLE GEPRÜFT. Eine Beitragskennung muss einen
// Beitrag treffen, eine Familie eine Familie, eine Adresse einen Ratgeber.
// Sonst stünde im Kalender ein Platz, der auf nichts zeigt — und das fiele erst
// auf, wenn jemand ihn senden will.

export const dynamic = "force-dynamic";

const ARTEN: PlatzArt[] = ["post", "datenstory", "individuell"];

export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    datum?: string;
    art?: string;
    postId?: string;
    familie?: string;
    kategorie?: string;
    titel?: string;
    slug?: string;
    loeschen?: boolean;
  };

  if (!body.datum || !/^\d{4}-\d{2}-\d{2}$/.test(body.datum)) {
    return NextResponse.json({ error: "Kein gültiger Tag" }, { status: 400 });
  }

  if (body.loeschen) {
    try {
      await loeschePlatz(body.datum);
      return NextResponse.json({ ok: true, geloescht: true });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
  }

  const art = body.art as PlatzArt | "artikel" | undefined;
  if (!art || (!ARTEN.includes(art as PlatzArt) && art !== "artikel")) {
    return NextResponse.json({ error: "Unbekannte Art" }, { status: 400 });
  }

  try {
    if (art === "post") {
      if (!body.postId) return NextResponse.json({ error: "Kein Beitrag gewählt" }, { status: 400 });
      const posts = baueAllePosts(await socialKennzahlen(), await ladeFassungen());
      const post = posts.find((p) => p.id === body.postId);
      if (!post) return NextResponse.json({ error: "Unbekannte Post-Kennung" }, { status: 404 });
      await setzePlatz({
        datum: body.datum,
        art: "post",
        post_id: post.id,
        familie: null,
        kategorie: null,
        titel: post.titel,
      });
      return NextResponse.json({ ok: true });
    }

    if (art === "datenstory") {
      const familie = FAMILIEN.find((f) => f.schluessel === body.familie);
      if (!familie) return NextResponse.json({ error: "Unbekannte Geschichten-Familie" }, { status: 400 });
      // „spaeter" ist im Katalog eine bewusst zurückgestellte Familie. Sie
      // planbar zu machen hieße, eine Entscheidung zu überfahren, die anderswo
      // schon getroffen wurde.
      if (familie.zustand === "spaeter") {
        return NextResponse.json({ error: `„${familie.name}" ist zurückgestellt.` }, { status: 400 });
      }
      await setzePlatz({
        datum: body.datum,
        art: "datenstory",
        post_id: null,
        familie: familie.schluessel,
        kategorie: null,
        titel: body.titel?.trim() || familie.name,
      });
      return NextResponse.json({ ok: true });
    }

    if (art === "artikel") {
      const ratgeber = RATGEBER.find((r) => r.slug === body.slug);
      if (!ratgeber) return NextResponse.json({ error: "Unbekannter Ratgeber" }, { status: 404 });
      await setzePlatz({
        datum: body.datum,
        art: "individuell",
        post_id: null,
        familie: null,
        kategorie: "artikel",
        titel: `Ratgeber featuren: ${ratgeber.title}`,
      });
      return NextResponse.json({ ok: true });
    }

    // individuell
    if (!body.titel?.trim()) {
      return NextResponse.json({ error: "Ohne Arbeitstitel ist der Platz leer" }, { status: 400 });
    }
    const familie = FAMILIEN.find((f) => f.schluessel === body.kategorie);
    if (!familie) return NextResponse.json({ error: "Unbekannte Kategorie" }, { status: 400 });
    await setzePlatz({
      datum: body.datum,
      art: "individuell",
      post_id: null,
      familie: null,
      kategorie: familie.schluessel,
      titel: body.titel.trim(),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
