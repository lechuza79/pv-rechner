import { NextRequest, NextResponse } from "next/server";
import { supabase as serviceDb } from "../../../../../lib/supabase-server";
import { buildHookIndex } from "../../../../../lib/awards-server";
import { DEFAULT_HOOK_SETTINGS } from "../../../../../lib/award-hook";
import { domainOf } from "../../../../../lib/kommunen-profil";
import { waehleTestballon, TESTBALLON_REGELN, type Kandidat } from "../../../../../lib/kommunen-testballon";
import { askVariante, refToken } from "../../../../../lib/kommunen-ask";

// Versandliste zusammenstellen und FESTSCHREIBEN (kampagne + charge je Gemeinde).
// Läuft in der Next-Umgebung, weil der Aufhänger aus dem Award-Rechenkern kommt
// (lib/awards-server ist server-only und im Script nicht importierbar) — und
// weil es damit dieselbe Aufhänger-Quelle ist wie der Anschreiben-Generator.
//
// POST /api/admin/kommunen/testballon   { bl?: string[], dry?: boolean }

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function isAdmin(): Promise<boolean> {
  const { createClient } = await import("../../../../../lib/supabase-server-component");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user && ADMIN_EMAILS.includes(user.email?.toLowerCase() || "");
}

const KAMPAGNE = "testballon";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const body = (await req.json().catch(() => ({}))) as { bl?: string[]; dry?: boolean };
  const bl = body.bl?.length ? body.bl : ["08", "09"]; // BW + BY
  const dry = !!body.dry;

  // Kontaktzeilen der Ziel-Bundesländer, paginiert.
  type Zeile = {
    region_id: string;
    website: string | null;
    kontakt_url: string | null;
    rollen_email: string | null;
    verwaltung_domain: string | null;
    outreach_status: string;
    kampagne: string | null;
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
          "region_id, website, kontakt_url, rollen_email, verwaltung_domain, outreach_status, kampagne, ask_variante, variante_manuell, ref_token, verantwortlich_operativ, mastr_regions!inner(name, population, slug)",
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

  const kandidaten: Kandidat[] = [];
  for (const z of zeilen) {
    // Schon kontaktiert, gesperrt oder in einer Kampagne → nicht erneut wählen.
    if (z.outreach_status !== "offen" || z.kampagne) continue;
    const hook = hookByRegion.get(z.region_id);
    if (!hook || hook.kind !== "sieger") continue; // Testballon nimmt nur echte Sieger
    const reg = Array.isArray(z.mastr_regions) ? z.mastr_regions[0] : z.mastr_regions;
    kandidaten.push({
      regionId: z.region_id,
      name: reg?.name ?? z.region_id,
      population: reg?.population ?? 0,
      // Belegter Verbund schlägt den eigenen Host: die fremde Domain im
      // Impressum ist ein Nachweis, der eigene Host nur ein Indiz.
      verbundKey: z.verwaltung_domain ?? domainOf(z.website ?? "") ?? null,
      hookKind: hook.kind,
      hookRang: hook.rank ?? 99,
      hookTotal: hook.total ?? 0,
      hatKanal: !!(z.kontakt_url || z.rollen_email),
    });
  }

  const auswahl = waehleTestballon(kandidaten, TESTBALLON_REGELN);

  // Bereits vergebene Weiterleitungs-Token, damit ein zweiter Lauf keine
  // Dubletten erzeugt und bestehende Links gültig bleiben.
  const vergeben = new Set<string>();
  for (const z of zeilen) if (z.ref_token) vergeben.add(z.ref_token);
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
  return NextResponse.json({
    kampagne: KAMPAGNE,
    dry,
    bericht: auswahl.bericht,
    charge1: auswahl.gewaehlt.filter((g) => g.charge === 1).map((g) => ({ region_id: g.regionId, name: namen.get(g.regionId) })),
    anzahl: { gesamt: auswahl.gewaehlt.length, charge1: auswahl.gewaehlt.filter((g) => g.charge === 1).length },
  });
}
