import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "../../../../lib/rate-limit";
import { nachbarschaft, VOLLE_LISTE_ZEILEN } from "../../../../lib/atlas-nachbarn";
import { GROESSENKLASSE_BY_SLUG } from "../../../../lib/gemeindegroesse";

// Die Vergleichsgruppe einer Kommune in einem größeren Gebiet.
//
// WARUM ALS ROUTE UND NICHT IM SEITEN-RENDER: Die Kreis-Nachbarn liegen ohnehin
// auf der Seite. Land und Bund nicht — Hessen hat rund 420 Gemeinden,
// Deutschland über elftausend. Sie vorsorglich mitzuliefern hieße, jede
// Gemeindeseite um ein Vielfaches zu vergrößern für eine Liste, die die meisten
// Leser nie aufschlagen. Geladen wird deshalb erst, wenn jemand die
// Bezugsgröße wirklich umstellt — dasselbe Muster wie bei den Platzierungen.
//
// KEIN OFFENER ZUGRIFF AUF BELIEBIGE ABFRAGEN: Gebiet, Eigentümer und Klasse
// sind gegen feste Listen geprüft, die Kommune ist ein Schlüssel aus unseren
// eigenen Daten. Ohne die Prüfung wäre `prefix` ein freier Filter auf die
// Bestandstabelle.

const OWNERS = ["alle", "privat", "gewerbe"] as const;

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "atlas-nachbarn");
  if (limited) return limited;

  const p = req.nextUrl.searchParams;
  const prefix = p.get("gebiet") ?? "";
  const owner = p.get("owner") ?? "alle";
  const klasseSlug = p.get("klasse") ?? "";
  const regionId = p.get("region") ?? "";

  // Der Gebiets-Schlüssel ist eine Zahl ohne Aussehen: "" (bundesweit), zwei
  // Stellen (Land) oder fünf (Kreis). Alles andere ist kein Gebiet, das wir
  // kennen — und ein durchgereichter Freitext wäre ein Filter auf die
  // Bestandstabelle, den niemand vorgesehen hat.
  if (!/^(\d{2}|\d{5})?$/.test(prefix)) {
    return NextResponse.json({ error: "gebiet ungültig" }, { status: 400 });
  }
  if (!OWNERS.includes(owner as (typeof OWNERS)[number])) {
    return NextResponse.json({ error: "owner ungültig" }, { status: 400 });
  }
  if (!GROESSENKLASSE_BY_SLUG[klasseSlug]) {
    return NextResponse.json({ error: "klasse ungültig" }, { status: 400 });
  }
  if (!/^\d{2,8}$/.test(regionId)) {
    return NextResponse.json({ error: "region ungültig" }, { status: 400 });
  }

  try {
    const daten = await nachbarschaft({
      prefix,
      owner: owner as (typeof OWNERS)[number],
      klasseSlug,
      regionId,
      // Zwei Größen, sonst nichts: die fünf Zeilen der Karte oder die hundert
      // des Fensters. Eine freie Zahl von außen wäre ein Hebel, mit dem sich
      // beliebig große Antworten bestellen lassen.
      top: p.get("voll") === "1" ? VOLLE_LISTE_ZEILEN : undefined,
    });
    if (!daten) return NextResponse.json({ error: "keine Daten" }, { status: 404 });
    return NextResponse.json(daten, {
      headers: {
        // Der Bestand ändert sich einmal im Monat. Die Antwort hängt nur an
        // Gebiet, Eigentümer, Klasse und Kommune — alles vier stehen in der
        // Adresse, also ist sie im CDN teilbar.
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error("[atlas/nachbarn] failed:", (err as Error).message);
    return NextResponse.json({ error: "Daten konnten nicht geladen werden" }, { status: 500 });
  }
}
