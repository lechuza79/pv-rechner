import { NextRequest, NextResponse } from "next/server";
import { ladeKatalog } from "../../../lib/wp-katalog-db";
import { empfehlungenFuer, type WpFall } from "../../../lib/wp-empfehlung";

// ─── Passende Geräte zum gerechneten Fall ─────────────────────────────────────
//
// Der Wärmepumpen-Rechner ist eine Client-Komponente und kennt seinen Fall erst
// nach der Eingabe — die Geräte können deshalb nicht mit der Seite vorgerendert
// werden. Diese Route nimmt den Fall entgegen und gibt die Auswahl zurück.
//
// Sie gibt NIE den ganzen Katalog aus: Die Eignungsprüfung ist der Sinn der
// Sache, und eine ungefilterte Liste wäre eine zweite Ausgabe derselben Daten
// ohne sie.

export const dynamic = "force-dynamic";

const MAX_KW = 100;

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;

  const auslegungKw = Number.parseFloat(p.get("kw") ?? "");
  const vorlaufC = Number.parseInt(p.get("vorlauf") ?? "", 10);
  const typ = p.get("typ");

  if (!Number.isFinite(auslegungKw) || auslegungKw <= 0 || auslegungKw > MAX_KW) {
    return NextResponse.json({ error: "kw fehlt oder ist unplausibel" }, { status: 400 });
  }
  if (!Number.isFinite(vorlaufC) || vorlaufC < 20 || vorlaufC > 80) {
    return NextResponse.json({ error: "vorlauf fehlt oder ist unplausibel" }, { status: 400 });
  }
  if (typ !== "lwwp" && typ !== "swwp") {
    return NextResponse.json({ error: "typ muss lwwp oder swwp sein" }, { status: 400 });
  }

  const fall: WpFall = { auslegungKw, vorlaufC, wpType: typ };
  const stand = await ladeKatalog(typ === "swwp" ? "sole-wasser" : "luft-wasser");

  // Ein veralteter Katalog wird nicht angezeigt, sondern als solcher gemeldet.
  // Ein Preis neben einem Kaufknopf ist die Angabe, die am schnellsten falsch
  // wird — lieber keine Geräte als solche von vorletzter Woche.
  if (!stand.frisch) {
    return NextResponse.json(
      { empfehlungen: [], grund: "katalog-veraltet", abgerufenIso: stand.abgerufenIso },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      empfehlungen: empfehlungenFuer(stand.geraete, fall),
      abgerufenIso: stand.abgerufenIso,
      auswahlAus: stand.geraete.length,
    },
    // Kurz zwischenspeichern: Der Katalog ändert sich täglich, die Anfrage
    // wiederholt sich aber bei jedem Umschalten im Ergebnis.
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
