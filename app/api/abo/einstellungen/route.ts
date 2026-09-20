import { NextRequest, NextResponse } from "next/server";
import { pruefeEinstellungen } from "../../../../lib/abo-token";
import {
  aboAbmeldenFuer,
  aboEinstellungen,
  aboEinstellungenSetzen,
  techniken,
} from "../../../../lib/gemeinde-abo";
import { getRegionById, atlasPathForRegionId } from "../../../../lib/atlas";
import { ATLAS_CITIES, cityPath, isCityPublished } from "../../../../lib/atlas-cities";

// ─── Was habe ich abonniert, und wie ändere ich es? ──────────────────────────
//
// Die Adresse ist nur mit einem signierten Link zu erreichen, den ausschließlich
// bekommt, wer Zugang zum betreffenden Postfach hat. Ohne gültiges Token gibt
// es keine Auskunft und keine Änderung.
//
// DIE ANTWORT UNTERSCHEIDET NICHT zwischen „Token gefälscht" und „Abo gibt es
// nicht mehr": beides ist „ungültig". Sonst verrät diese Adresse, welche
// Kennungen es gibt — dieselbe Zurückhaltung wie bei der Abmeldung und bei der
// Anmeldung.
//
// KEIN ZWISCHENSPEICHER: Die Antwort hängt am Token und ändert sich mit jedem
// Klick des Inhabers. Eine zwischengespeicherte Fassung zeigte dem nächsten
// Aufrufer fremde Einstellungen.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UNGUELTIG = NextResponse.json({ error: "ungueltig" }, { status: 404 });

export async function GET(req: NextRequest) {
  const befund = pruefeEinstellungen(new URL(req.url).searchParams.get("t") ?? "");
  if (!befund.ok) return UNGUELTIG;

  const daten = await aboEinstellungen(befund.aboId);
  if (!daten) return UNGUELTIG;

  const abos = await Promise.all(daten.abos.map((a) => mitOrt(a)));
  return NextResponse.json({ email: daten.email, abos });
}

export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const befund = pruefeEinstellungen(typeof payload.t === "string" ? payload.t : "");
  if (!befund.ok) return UNGUELTIG;

  const zielId = typeof payload.aboId === "string" ? payload.aboId : "";
  if (!zielId) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });

  // Abmelden ist die eine Änderung, die sich nicht zurücknehmen lässt — sie
  // steht deshalb als eigener Zweig und nicht als Sonderfall des Speicherns.
  if (payload.abmelden === true) {
    const ok = await aboAbmeldenFuer(befund.aboId, zielId, new Date().toISOString());
    return ok ? NextResponse.json({ ok: true }) : UNGUELTIG;
  }

  // Nur bekannte Techniken; alles andere fällt weg — dieselbe Filterung wie bei
  // der Anmeldung, und aus demselben Grund: Ein Freitext aus dem Browser landete
  // sonst in der Datenbank.
  const ok = await aboEinstellungenSetzen(befund.aboId, zielId, {
    technikenGewaehlt: techniken(payload.techniken),
    // Streng auf `true`: Jeder andere Wert gilt als nein. Die Angabe steuert
    // nur den Ton einer künftigen Meldung, nie einen Zugang.
    ausVerwaltung: payload.ausVerwaltung === true,
  });
  return ok ? NextResponse.json({ ok: true }) : UNGUELTIG;
}

/**
 * Ortsname und Adresse zum Schlüssel.
 *
 * Die Seite zeigt beides — ein Abo, das nur eine achtstellige Zahl nennt, ist
 * für seinen Inhaber keine Auskunft. Fällt die Auflösung aus, bleibt der
 * Eintrag trotzdem bedienbar: Der Name fehlt dann, die Abmeldung nicht.
 */
async function mitOrt(a: {
  id: string;
  regionId: string;
  quelle: "gemeinde" | "foerderung";
  status: string;
  technikenGewaehlt: string[];
  ausVerwaltung: boolean;
}) {
  const region = await getRegionById(a.regionId).catch(() => null);
  const stadt = ATLAS_CITIES.find((c) => c.ags === a.regionId);
  const pfad =
    a.quelle === "foerderung" && stadt && isCityPublished(stadt)
      ? cityPath(stadt)
      : await atlasPathForRegionId(a.regionId).catch(() => null);
  return {
    id: a.id,
    ortName: region?.name ?? null,
    ortPfad: pfad,
    quelle: a.quelle,
    status: a.status,
    techniken: a.technikenGewaehlt,
    ausVerwaltung: a.ausVerwaltung,
  };
}
