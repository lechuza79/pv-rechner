import { NextRequest, NextResponse } from "next/server";
import { istAdminOderCron } from "../../../../lib/admin-guard";
import { loescheVorlage, speichereVorlage } from "../../../../lib/social-vorlagen-db";
import { socialKennzahlen } from "../../../../lib/social-kennzahlen";
import { baueAllePosts } from "../../../../lib/social-posts";
import { pruefeVorlage } from "../../../../lib/social-vorlage";

// Speichern und Zurücksetzen einer bearbeiteten Textvorlage.
//
// Vor dem Speichern wird geprüft, ob alle Platzhalter bekannt sind. Ohne diese
// Prüfung stünde später eine Klammer im Beitrag, und gemerkt hätte es niemand —
// dieselbe Sorte Fehler wie eine Einheit, die niemandem auffällt.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await istAdminOderCron(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { postId, vorlage } = (await req.json().catch(() => ({}))) as { postId?: string; vorlage?: string };
  if (!postId) return NextResponse.json({ error: "Keine Post-Kennung" }, { status: 400 });

  try {
    // Zurücksetzen auf die eingebaute Fassung.
    if (vorlage == null || !vorlage.trim()) {
      await loescheVorlage(postId);
      return NextResponse.json({ ok: true, zurueckgesetzt: true });
    }

    const post = baueAllePosts(await socialKennzahlen()).find((p) => p.id === postId);
    if (!post?.platzhalter) {
      return NextResponse.json({ error: "Dieser Post ist nicht auf Vorlagen umgestellt" }, { status: 400 });
    }
    const werte = Object.fromEntries(post.platzhalter.map((p) => [p.name, p.wert]));
    const befund = pruefeVorlage(vorlage, werte);
    if (befund.unbekannt.length) {
      return NextResponse.json(
        { error: `Unbekannte Platzhalter: ${befund.unbekannt.map((p) => `{${p}}`).join(", ")}` },
        { status: 400 },
      );
    }

    await speichereVorlage(postId, vorlage);
    // Ungenutzte Werte sind kein Fehler, aber einen Hinweis wert: Wer eine Zahl
    // aus dem Text nimmt, verliert sie stillschweigend.
    return NextResponse.json({ ok: true, ungenutzt: befund.ungenutzt });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
