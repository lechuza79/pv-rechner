import {loadNewsletterRegion} from "../../../../lib/newsletter-region";
import {abmeldeLink, einstellungenLink} from "../../../../lib/abo-token";
import { NextRequest, NextResponse } from "next/server";
import { aboLauf } from "../../../../lib/abo-lauf";
import { empfaengerFuerOrt, orteMitAbos } from "../../../../lib/gemeinde-abo";

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

/** Prepare links for an existing confirmed subscription; the signing key stays on the server. */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({error:"Nicht berechtigt."},{status:401});
  const body = await req.json().catch(()=>null);
  if (!["links","vorbereiten"].includes(body?.aktion) || typeof body.id !== "string" || typeof body.regionId !== "string" || body.id.length>100 || !/^(de|\d{2}|\d{5}|\d{8}|\d{9})$/.test(body.regionId)) return NextResponse.json({error:"Ungültige Anfrage."},{status:400});
  const abo=(await empfaengerFuerOrt(body.regionId)).find(a=>a.id===body.id && a.quelle==="gemeinde");
  if (!abo) return NextResponse.json({error:"Kein bestätigtes Ortsabo."},{status:404});
  const base=process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/,"");
  if (!base) return NextResponse.json({error:"Basis-Adresse fehlt."},{status:503});
  const regional=body.aktion==="vorbereiten" ? await loadNewsletterRegion(body.regionId,body.month) : null;
  if(regional && !regional.ready)return NextResponse.json({error:regional.reason},{status:422});
  return NextResponse.json({...(regional?.ready?{region:regional.data}:{}),abmeldeUrl:abmeldeLink(base,abo.id),einstellungenUrl:einstellungenLink(base,abo.id)},{headers:{"Cache-Control":"no-store"}});
}
