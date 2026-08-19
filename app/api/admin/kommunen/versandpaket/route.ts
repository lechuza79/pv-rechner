import { NextRequest, NextResponse } from "next/server";
import { supabase as serviceDb } from "../../../../../lib/supabase-server";
import { briefFuerGemeinde, istBriefFehler } from "../../../../../lib/kommunen-brief";
import { istAdminOderCron } from "../../../../../lib/admin-guard";
import { SCHUEBE, AKTUELLER_SCHUB } from "../../../../../lib/kommunen-testballon";
import { versandfenster } from "../../../../../lib/schulferien";
import { postfachBefund } from "../../../../../lib/outreach-mail";
import { heuteInBerlin } from "../../../../../lib/zeit";

// Das fertige Versandpaket einer Charge: je Gemeinde Empfänger, Betreff und
// Brieftext — gebaut aus DERSELBEN Funktion wie der Entwurf im Cockpit
// (lib/kommunen-brief.ts).
//
// WARUM DAS EINE ROUTE IST UND KEIN SKRIPT: Der Aufhänger kommt aus dem
// Award-Rechenkern, und der liest die Grundtabelle mit dem Service-Key
// (`server-only`). Ein Skript, das dieselbe Rechnung noch einmal aufbaut, wäre
// eine zweite Fassung der Ranglisten — genau die Sorte Kopie, die irgendwann
// eine andere Zahl in die Mail schreibt als auf die verlinkte Seite.
//
// KEIN offener Endpunkt: Zugang nur mit Admin-Session oder mit CRON_SECRET
// (das Versand-Skript läuft ohne Browser). Zurückgegeben werden ausschließlich
// Gemeinden der angefragten Kampagne — nie eine Adresse, die der Aufrufer
// hereinreicht.
//
// GET /api/admin/kommunen/versandpaket?schub=…&charge=1&limit=25

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Warum eine Gemeinde der Kampagne NICHT ins Paket kommt. */
export type Uebersprungen = { region_id: string; name: string | null; grund: string };

export async function GET(req: NextRequest) {
  if (!(await istAdminOderCron(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const sp = req.nextUrl.searchParams;
  const schluessel = sp.get("schub") ?? AKTUELLER_SCHUB;
  const schub = SCHUEBE[schluessel];
  if (!schub) return NextResponse.json({ error: `Unbekannter Schub „${schluessel}"` }, { status: 400 });
  const charge = parseInt(sp.get("charge") ?? "1", 10);
  const limit = Math.min(50, Math.max(1, parseInt(sp.get("limit") ?? "25", 10)));
  // Der Stichtag ist ein DEUTSCHER Kalendertag, kein UTC-Tag. Zwischen 00:00
  // und 02:00 Sommerzeit liegt das UTC-Datum einen Tag zurück — am ersten
  // Ferientag hätte die Sperre in diesem Fenster nicht gegriffen. Dieselbe
  // Falle wie bei der Balkon-Monatsfrist.
  const heute = (sp.get("heute") ?? heuteInBerlin()).slice(0, 10);

  const { data, error } = await serviceDb
    .from("kommunen_kontakt")
    .select(
      "region_id, rollen_email, kontakt_url, outreach_status, contacted_at, charge, ask_variante, mastr_regions!inner(name)",
    )
    .eq("kampagne", schub.kampagne)
    .eq("charge", charge)
    .order("region_id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Zeile = {
    region_id: string;
    rollen_email: string | null;
    outreach_status: string;
    contacted_at: string | null;
    mastr_regions: { name: string } | { name: string }[];
  };
  const zeilen = (data ?? []) as unknown as Zeile[];
  const nameVon = (z: Zeile) => (Array.isArray(z.mastr_regions) ? z.mastr_regions[0]?.name : z.mastr_regions?.name) ?? null;

  const uebersprungen: Uebersprungen[] = [];
  const paket: {
    region_id: string;
    name: string;
    empfaenger: string;
    subject: string;
    body: string;
    variante: string;
    seite_url: string | null;
    rangliste_url: string | null;
    stand: string;
  }[] = [];

  for (const z of zeilen) {
    if (paket.length >= limit) break;
    const name = nameVon(z);
    const skip = (grund: string) => uebersprungen.push({ region_id: z.region_id, name, grund });

    // Reihenfolge der Prüfungen: erst die harten Ausschlüsse, dann die teure
    // Brief-Erzeugung. Ein gesperrter Ort darf nicht einmal einen Entwurf
    // erzeugen (siehe lib/kommunen-brief.ts) — hier steht die Prüfung ein
    // zweites Mal, weil eine Sicherheitsgrenze keine zweite Kopie ist, sondern
    // die Stelle, an der sie eines Tages fehlt.
    if (z.outreach_status === "gesperrt") {
      skip("gesperrt — Widerspruch liegt vor");
      continue;
    }
    if (z.contacted_at || z.outreach_status === "kontaktiert" || z.outreach_status === "geantwortet") {
      skip(`schon angeschrieben am ${z.contacted_at?.slice(0, 10) ?? "?"}`);
      continue;
    }
    if (!z.rollen_email) {
      skip("kein Rollen-Postfach");
      continue;
    }
    const fenster = versandfenster(z.region_id.slice(0, 2), heute);
    if (!fenster.frei) {
      skip(fenster.grund);
      continue;
    }
    // Ist das überhaupt ein Funktionspostfach der zuständigen Verwaltung?
    // Zwei Briefe des ersten Schubs gingen an das Amtspostfach einer ANDEREN
    // Kommune, und mehrere an Adressen mit dem Nachnamen eines ehrenamtlichen
    // Ortsbürgermeisters. Beides ist beim Einsammeln entstanden; hier wird es
    // abgefangen, statt den Datenbestand rückwirkend umzuschreiben.
    const postfach = postfachBefund(z.rollen_email, name ?? "");
    if (!postfach.ok) {
      skip(postfach.grund);
      continue;
    }

    const gebaut = await briefFuerGemeinde(z.region_id, z.rollen_email);
    if (istBriefFehler(gebaut)) {
      skip(`Brief nicht erzeugbar (${gebaut.grund})`);
      continue;
    }
    paket.push({
      region_id: gebaut.regionId,
      name: gebaut.name,
      empfaenger: z.rollen_email,
      subject: gebaut.draft.subject,
      body: gebaut.draft.body,
      variante: gebaut.variante,
      seite_url: gebaut.seiteUrl,
      rangliste_url: gebaut.ranglisteUrl,
      stand: gebaut.stand,
    });
  }

  return NextResponse.json({
    schub: schluessel,
    kampagne: schub.kampagne,
    charge,
    heute,
    inCharge: zeilen.length,
    paket,
    uebersprungen,
  });
}
