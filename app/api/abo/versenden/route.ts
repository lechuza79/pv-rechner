import { NextRequest, NextResponse } from "next/server";
import { aboLauf } from "../../../../lib/abo-lauf";
import { orteMitAbos } from "../../../../lib/gemeinde-abo";

// ─── Der Versandlauf für die Meldungen ───────────────────────────────────────
//
// Hinter dem Betriebsgeheimnis, aufgerufen vom nächtlichen Ablauf. Er geht die
// Orte durch, für die es bestätigte Abos gibt, und schickt nur dort, wo es
// wirklich etwas zu berichten gibt — das entscheidet die Rechnung, nicht ein
// Kalender.
//
// PROBELAUF MIT `?trocken=1`: rechnet alles durch und verschickt nichts. Der
// erste Aufruf in einer neuen Umgebung gehört so gemacht; ein Versandlauf, den
// noch nie jemand ohne Wirkung gesehen hat, ist ein Versandlauf, dessen erste
// Wirkung eine echte Mail ist.
//
// EIN EINZELNER ORT MIT `?ags=`: für die Nachschau, wenn jemand fragt „warum
// habe ich nichts bekommen". Antwortet dann mit derselben Rechnung, die auch
// der Lauf anstellt.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Der Lauf geht über alle Orte mit Abonnenten und schickt je Empfänger eine
// Mail. Das Standard-Zeitbudget einer Funktion reicht dafür nicht, sobald es
// mehr als eine Handvoll sind.
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const erwartet = process.env.CRON_SECRET;
  if (!erwartet || req.headers.get("authorization") !== `Bearer ${erwartet}`) {
    return NextResponse.json({ error: "Nicht berechtigt." }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const trocken = params.get("trocken") === "1";
  const einzeln = params.get("ags");

  // Die Adresse für die Links in den Mails. KEIN Rückfall auf die
  // Produktionsadresse: In einer Testumgebung zeigten die Abmeldelinks sonst
  // auf die echte Seite, und ein Klick dort meldete ein fremdes Abo ab.
  const basisUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!basisUrl) {
    return NextResponse.json(
      { error: "Basis-Adresse fehlt — ohne sie zeigen die Links in den Mails ins Leere." },
      { status: 503 },
    );
  }

  const orte = einzeln ? [einzeln] : await orteMitAbos();

  const ergebnis = await aboLauf({
    orte,
    jetzt: new Date(),
    basisUrl: basisUrl.replace(/\/$/, ""),
    trocken,
  });

  return NextResponse.json({ trocken, ...ergebnis });
}
