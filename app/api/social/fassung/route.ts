import { NextRequest, NextResponse } from "next/server";
import { istAdminOderCron } from "../../../../lib/admin-guard";
import { ladeFassungen, setzeVorlageZurueck, speichereFassung } from "../../../../lib/social-vorlagen-db";
import { socialKennzahlen } from "../../../../lib/social-kennzahlen";
import { BILDFORM_NAME, baueAllePosts, type PostBild } from "../../../../lib/social-posts";
import { istKartenStil } from "../../../../lib/social-karten-stil";
import { pruefeVorlage } from "../../../../lib/social-vorlage";

// Die redaktionelle Fassung einer Story speichern: Text, Farbschema, Bildform.
//
// Eine Route für beides, weil es eine Zeile in der Ablage ist und weil beides
// dieselbe Folge hat: Die Freigabe verfällt. Zwei Routen hätten diese Folge
// zweimal beschreiben müssen, und die zweite hätte sie irgendwann vergessen.
//
// Vor dem Speichern eines Textes wird geprüft, ob alle Platzhalter bekannt sind.
// Ohne diese Prüfung stünde später eine Klammer im Beitrag, und gemerkt hätte es
// niemand — dieselbe Sorte Fehler wie eine Einheit, die niemandem auffällt.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await istAdminOderCron(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    postId?: string;
    vorlage?: string | null;
    stil?: string;
    form?: string;
    zuruecksetzen?: boolean;
  };
  if (!body.postId) return NextResponse.json({ error: "Keine Post-Kennung" }, { status: 400 });

  try {
    if (body.zuruecksetzen) {
      await setzeVorlageZurueck(body.postId);
      return NextResponse.json({ ok: true, zurueckgesetzt: true });
    }

    // Nur Farbschema oder Bildform: kein Text zu prüfen, kein Kennzahlen-Abruf.
    if (body.vorlage == null) {
      const stil = istKartenStil(body.stil) ? body.stil : undefined;
      const form = body.form && body.form in BILDFORM_NAME ? (body.form as PostBild["art"]) : undefined;
      if (!stil && !form) {
        return NextResponse.json({ error: "Weder Farbschema noch Bildform erkannt" }, { status: 400 });
      }
      // Ob die Form für DIESES Bild trägt, entscheidet `baueAllePosts` beim
      // Lesen — dort liegen die Zahlen. Eine Form, die morgen nicht mehr passt,
      // fällt dann zurück, statt hier für immer festgeschrieben zu sein.
      await speichereFassung(body.postId, { ...(stil ? { stil } : {}), ...(form ? { form } : {}) });
      return NextResponse.json({ ok: true });
    }

    const posts = baueAllePosts(await socialKennzahlen(), await ladeFassungen());
    const post = posts.find((p) => p.id === body.postId);
    if (!post?.platzhalter) {
      return NextResponse.json({ error: "Dieser Post ist nicht auf Vorlagen umgestellt" }, { status: 400 });
    }
    const werte = Object.fromEntries(post.platzhalter.map((p) => [p.name, p.wert]));
    const befund = pruefeVorlage(body.vorlage, werte);
    if (befund.unbekannt.length) {
      return NextResponse.json(
        { error: `Unbekannte Platzhalter: ${befund.unbekannt.map((p) => `{${p}}`).join(", ")}` },
        { status: 400 },
      );
    }

    await speichereFassung(body.postId, {
      vorlage: body.vorlage,
      ...(istKartenStil(body.stil) ? { stil: body.stil } : {}),
    });
    // Ungenutzte Werte sind kein Fehler, aber einen Hinweis wert: Wer eine Zahl
    // aus dem Text nimmt, verliert sie stillschweigend.
    return NextResponse.json({ ok: true, ungenutzt: befund.ungenutzt });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
