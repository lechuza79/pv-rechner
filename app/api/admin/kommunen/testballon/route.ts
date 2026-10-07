import { NextRequest, NextResponse } from "next/server";
import { supabase as serviceDb } from "../../../../../lib/supabase-server";
import { buildHookIndex } from "../../../../../lib/awards-server";
import { DEFAULT_HOOK_SETTINGS } from "../../../../../lib/award-hook";
import { domainOf } from "../../../../../lib/kommunen-profil";
import {
  waehleTestballon,
  waehleGanzeKreise,
  SCHUEBE,
  AKTUELLER_SCHUB,
  type Kandidat,
} from "../../../../../lib/kommunen-testballon";
import { askVariante, refToken } from "../../../../../lib/kommunen-ask";
import { postfachBefund } from "../../../../../lib/outreach-mail";
import { empfaengerFuerBrief } from "../../../../../lib/kommunen-presse";
import { windgemeinde } from "../../../../../lib/windgemeinden";
import { istAdminOderCron } from "../../../../../lib/admin-guard";

// Versandliste zusammenstellen und FESTSCHREIBEN (kampagne + charge je Gemeinde).
// Läuft in der Next-Umgebung, weil der Aufhänger aus dem Award-Rechenkern kommt
// (lib/awards-server ist server-only und im Script nicht importierbar) — und
// weil es damit dieselbe Aufhänger-Quelle ist wie der Anschreiben-Generator.
//
// POST /api/admin/kommunen/testballon   { schub?: string, dry?: boolean }
//
// WELCHER Schub gezogen wird, steht nicht mehr im Aufruf, sondern in
// lib/kommunen-testballon.ts (`SCHUEBE`). Gebiet, Kanal und Zielmenge gehören
// zur Kampagne — wer sie beim zweiten Zug anders angibt, bekommt eine andere
// Liste unter demselben Namen, und die Auswertung vergleicht danach zwei Dinge,
// die nur gleich heißen.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!(await istAdminOderCron(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const body = (await req.json().catch(() => ({}))) as { schub?: string; dry?: boolean };
  const schluessel = body.schub ?? AKTUELLER_SCHUB;
  const schub = SCHUEBE[schluessel];
  if (!schub) {
    return NextResponse.json(
      { error: `Unbekannter Schub „${schluessel}" — bekannt: ${Object.keys(SCHUEBE).join(", ")}` },
      { status: 400 },
    );
  }
  const bl = schub.bl;
  const KAMPAGNE = schub.kampagne;
  const dry = !!body.dry;

  // Kontaktzeilen der Ziel-Bundesländer, paginiert.
  type Zeile = {
    region_id: string;
    website: string | null;
    kontakt_url: string | null;
    rollen_email: string | null;
    rollen_email_quelle: string | null;
    presse_email: string | null;
    klima_email: string | null;
    presse_kontakt_email: string | null;
    contacted_at: string | null;
    verwaltung_domain: string | null;
    outreach_status: string;
    kampagne: string | null;
    charge: number | null;
    ask_variante: string | null;
    variante_manuell: boolean | null;
    ref_token: string | null;
    verantwortlich_operativ: boolean | null;
    mastr_regions:
      | { name: string; population: number | null; slug: string | null }
      | { name: string; population: number | null; slug: string | null }[];
  };
  const zeilen: Zeile[] = [];
  for (const prefix of bl) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await serviceDb
        .from("kommunen_kontakt")
        .select(
          "region_id, website, kontakt_url, rollen_email, rollen_email_quelle, presse_email, klima_email, presse_kontakt_email, contacted_at, verwaltung_domain, outreach_status, kampagne, charge, ask_variante, variante_manuell, ref_token, verantwortlich_operativ, mastr_regions!inner(name, population, slug)",
        )
        .like("region_id", `${prefix}%`)
        .order("region_id")
        .range(from, from + 999);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!data?.length) break;
      zeilen.push(...(data as unknown as Zeile[]));
      if (data.length < 1000) break;
    }
  }

  const index = await buildHookIndex(DEFAULT_HOOK_SETTINGS);
  const hookByRegion = new Map(index.rows.map((r) => [r.regionId, r]));

  // Districts that already received at least one letter.
  const angeschrieben = new Set(zeilen.filter((z) => z.contacted_at).map((z) => z.region_id.slice(0, 5)));

  const kandidaten: Kandidat[] = [];
  for (const z of zeilen) {
    // Schon kontaktiert, gesperrt oder in einer Kampagne → nicht erneut wählen.
    if (z.outreach_status !== "offen" || z.kampagne) continue;
    if (schub.nurAngeschriebeneKreise && !angeschrieben.has(z.region_id.slice(0, 5))) continue;
    if (schub.kreise && !schub.kreise.includes(z.region_id.slice(0, 5))) continue;
    if (z.region_id.length !== 8) continue; // district administrations get their own letter
    if (schub.ohneWindgemeinden && windgemeinde(z.region_id)) continue;
    const hook = hookByRegion.get(z.region_id) ?? null;
    // Whole districts take every town with a hook — win, podium or top tenth,
    // the largest level first (DE > BL > district); the older batches only took
    // first places. Towns without any hook get the short info letter, but only
    // in a batch that declares it (`briefarten`).
    const ohnePlatzierung = !hook || hook.kind === "neutral";
    if (ohnePlatzierung && !(schub.briefarten ?? ["platzierung"]).includes("info")) continue;
    if (!schub.kreise && hook?.kind !== "sieger") continue;
    const reg = Array.isArray(z.mastr_regions) ? z.mastr_regions[0] : z.mastr_regions;
    kandidaten.push({
      regionId: z.region_id,
      name: reg?.name ?? z.region_id,
      population: reg?.population ?? 0,
      // Belegter Verbund schlägt den eigenen Host: die fremde Domain im
      // Impressum ist ein Nachweis, der eigene Host nur ein Indiz.
      verbundKey: z.verwaltung_domain ?? domainOf(z.website ?? "") ?? null,
      hookKind: hook?.kind ?? "neutral",
      hookRang: hook?.rank ?? 99,
      hookTotal: hook?.total ?? 0,
      // Erreichbar heißt: über DEN Kanal erreichbar, den dieser Schub testet.
      // Ein Schub für den Mail-Versand darf keine Gemeinde festschreiben, die
      // nur ein Kontaktformular hat — sie stünde dann in der Kampagne, bekäme
      // aber nie eine Mail und fehlte in jeder Auswertung als „nicht erreicht".
      // ERREICHBAR HEISST AUCH: an eine Adresse, die wir benutzen dürfen.
      // Vorher prüfte nur das Versandpaket, ob das Postfach ein Funktionskonto
      // der zuständigen Verwaltung ist — die Gemeinde stand dann in der
      // Kampagne, bekam aber nie eine Mail und fehlte in jeder Auswertung als
      // „nicht erreicht". Dieselbe Prüfung an beiden Enden.
      hatKanal:
        schub.kanal === "brief-empfaenger"
          ? briefKanal(z, reg?.name ?? "")
          : schub.kanal === "rollen-postfach"
          ? !!z.rollen_email && postfachBefund(z.rollen_email, reg?.name ?? "", z.verwaltung_domain).ok
          : !!(z.kontakt_url || z.rollen_email),
    });
  }

  const auswahl = schub.kreise
    ? // Each town's own news item, even when an Amt reads several of them: the
      // district goes out in one day, as decided on 05.10.2026.
      waehleGanzeKreise(kandidaten, schub.regeln.chargeGroesse, (k) => k.regionId)
    : waehleTestballon(kandidaten, schub.regeln);
  // A second draw into the same campaign continues after its last charge:
  // reusing charge 1 would mix new towns into a day that has already gone out.
  const letzteCharge = Math.max(0, ...zeilen.filter((z) => z.kampagne === KAMPAGNE).map((z) => z.charge ?? 0));
  for (const g of auswahl.gewaehlt) g.charge += letzteCharge;

  // Bereits vergebene Weiterleitungs-Token, damit ein zweiter Lauf keine
  // Dubletten erzeugt und bestehende Links gültig bleiben.
  // Tokens are unique across ALL states: "schwerin" exists in Mecklenburg-Vorpommern
  // and in Brandenburg, and a set built from this batch's states alone missed it.
  const vergeben = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await serviceDb
      .from("kommunen_kontakt")
      .select("ref_token")
      .not("ref_token", "is", null)
      .order("region_id")
      .range(from, from + 999);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    for (const r of data ?? []) vergeben.add((r as { ref_token: string }).ref_token);
    if (!data || data.length < 1000) break;
  }
  const zeileVon = new Map(zeilen.map((z) => [z.region_id, z]));

  if (!dry) {
    const now = new Date().toISOString();
    for (const g of auswahl.gewaehlt) {
      const z = zeileVon.get(g.regionId);
      const reg = z ? (Array.isArray(z.mastr_regions) ? z.mastr_regions[0] : z.mastr_regions) : null;
      const patch: Record<string, unknown> = { kampagne: KAMPAGNE, charge: g.charge, updated_at: now };

      // Variante nur setzen, wenn sie nicht von Hand gepflegt wurde.
      if (!z?.variante_manuell) {
        patch.ask_variante = askVariante({
          population: reg?.population ?? null,
          operativeStelle: !!z?.verantwortlich_operativ,
        });
      }
      // Token einmal vergeben und danach nie ändern — ein bereits verschickter
      // Link muss gültig bleiben.
      if (!z?.ref_token) {
        const t = refToken(reg?.slug ?? null, g.regionId, vergeben);
        vergeben.add(t);
        patch.ref_token = t;
      }

      const { error } = await serviceDb
        .from("kommunen_kontakt")
        .update(patch)
        .eq("region_id", g.regionId)
        .eq("outreach_status", "offen"); // niemals einen laufenden Vorgang überschreiben
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const namen = new Map(kandidaten.map((k) => [k.regionId, k.name]));
  const proCharge = new Map<number, number>();
  for (const g of auswahl.gewaehlt) proCharge.set(g.charge, (proCharge.get(g.charge) ?? 0) + 1);
  return NextResponse.json({
    schub: schluessel,
    kampagne: KAMPAGNE,
    kanal: schub.kanal,
    bl,
    dry,
    bericht: auswahl.bericht,
    charge1: auswahl.gewaehlt
      .filter((g) => g.charge === 1)
      .map((g) => ({ region_id: g.regionId, name: namen.get(g.regionId) })),
    anzahl: {
      gesamt: auswahl.gewaehlt.length,
      chargen: Array.from(proCharge.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([charge, n]) => ({ charge, n })),
    },
  });
}

/** The address the letter will really go to passes the same check the send runs. */
function briefKanal(
  z: { rollen_email: string | null; rollen_email_quelle: string | null; presse_email: string | null; klima_email: string | null; presse_kontakt_email: string | null; verwaltung_domain: string | null },
  name: string,
): boolean {
  const ziel = empfaengerFuerBrief({ rollenEmail: z.rollen_email, presseEmail: z.presse_email, klimaEmail: z.klima_email, presseKontaktEmail: z.presse_kontakt_email, rollenQuelle: z.rollen_email_quelle });
  return !!ziel.email && postfachBefund(ziel.email, name, z.verwaltung_domain, { belegteRolle: ziel.belegt }).ok;
}
