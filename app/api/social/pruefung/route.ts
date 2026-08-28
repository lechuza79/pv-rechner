import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "../../../../lib/admin-guard";
import { fassungsAbdruck, speicherePruefung } from "../../../../lib/social-pruefung";
import { istPruefArt, pruefeBefund } from "../../../../lib/social-pruefung-kern";
import { socialKennzahlen } from "../../../../lib/social-kennzahlen";
import { baueAllePosts } from "../../../../lib/social-posts";
import { ladeFassungen } from "../../../../lib/social-vorlagen-db";

// Eine Prüfung erteilen: die Aussage eines Menschen über eine konkrete Fassung.
//
// NUR EINE ADMIN-SESSION, ausdrücklich NICHT `istAdminOderCron`. Alle übrigen
// Social-Routen lassen den Cron-Schlüssel zu, weil sie Arbeit erledigen, die
// auch ohne Browser laufen muss. Hier wäre er das Gegenteil einer Sicherung: Ein
// Automat, der sich seine eigenen Freigaben ausstellt, ist keine Prüfung,
// sondern eine Schleife. Der Sendeweg DARF später am Schlüssel hängen — er liest
// Freigaben, er erteilt keine.
//
// DER ABDRUCK KOMMT NICHT VOM BROWSER. Er wird hier aus denselben Kennzahlen und
// derselben gespeicherten Fassung neu gebaut wie beim Senden. Sonst könnte ein
// Aufrufer eine Freigabe für eine beliebige Zeichenkette hinterlegen und damit
// die Sperre für den echten Beitrag öffnen — die Prüfung wäre nur so gut wie
// das, was der Aufrufer behauptet.
//
// Der Aufrufer schickt seinen Abdruck trotzdem mit, und zwar PFLICHT: Er ist die
// Aussage „ich habe genau das angesehen". Weicht er ab, hat der Browser einen
// alten Stand — dann wurde etwas anderes geprüft als das, was rausginge. Das ist
// der Unterschied zur Senderoute, wo der Abdruck nur zusätzlich absichert: Dort
// steht die Freigabeprüfung als zweites Netz dahinter, hier gibt es keins.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    postId?: string;
    art?: string;
    bestanden?: boolean;
    befund?: string;
    /** Abdruck der Fassung, die der Prüfer vor sich hatte. */
    fassung?: string;
  };

  if (!body.postId) return NextResponse.json({ error: "Keine Post-Kennung" }, { status: 400 });
  if (!istPruefArt(body.art)) {
    return NextResponse.json({ error: "Unbekannte Prüfart" }, { status: 400 });
  }
  if (typeof body.bestanden !== "boolean") {
    // Kein Standardwert: „bestanden" ist die Aussage selbst, und eine Aussage,
    // die man weglassen kann, wird weggelassen.
    return NextResponse.json({ error: "Kein Urteil übergeben" }, { status: 400 });
  }
  const befund = (body.befund ?? "").trim();
  const befundUrteil = pruefeBefund(befund);
  if (!befundUrteil.ok) {
    return NextResponse.json({ error: befundUrteil.grund }, { status: 400 });
  }
  if (!body.fassung) {
    return NextResponse.json(
      { error: "Kein Fassungs-Abdruck übergeben — eine Prüfung ohne Bezug ist keine." },
      { status: 400 },
    );
  }

  let post;
  try {
    post = baueAllePosts(await socialKennzahlen(), await ladeFassungen()).find((p) => p.id === body.postId);
  } catch (err) {
    return NextResponse.json({ error: `Zahlen nicht abrufbar: ${(err as Error).message}` }, { status: 503 });
  }
  if (!post) return NextResponse.json({ error: "Unbekannte Post-Kennung" }, { status: 404 });

  const abdruck = fassungsAbdruck({ text: post.text, bild: post.bild });
  if (body.fassung !== abdruck) {
    return NextResponse.json(
      {
        error:
          "Der Browser zeigt einen anderen Stand als die Ablage. Entweder ist eine Änderung noch nicht gespeichert, oder der Datenstand hat sich bewegt — Seite neu laden und noch einmal ansehen.",
      },
      { status: 409 },
    );
  }

  try {
    await speicherePruefung({
      post_id: post.id,
      fassung_fingerabdruck: abdruck,
      art: body.art,
      bestanden: body.bestanden,
      befund,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  // Der gespeicherte Stand zurück, damit die Ansicht ihr Urteil sofort neu
  // rechnen kann, ohne die Seite neu zu laden — dieselbe Eigenschaft, die der
  // Redaktionstisch beim Umfärben schon hat.
  return NextResponse.json({
    ok: true,
    pruefung: {
      post_id: post.id,
      fassung_fingerabdruck: abdruck,
      art: body.art,
      bestanden: body.bestanden,
      befund,
      geprueft_am: new Date().toISOString(),
    },
  });
}
