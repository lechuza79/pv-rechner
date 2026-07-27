import { NextRequest, NextResponse } from "next/server";
import { supabase as serviceDb } from "../../../../lib/supabase-server";
import { isAdminSession } from "../../../../lib/admin-guard";
import { loadUtilityBundle, hookFor } from "../../../../lib/utilities-server";
import {
  UTILITY_TYP_LABEL,
  utilityCategoryLabel,
  type UtilityArea,
  type UtilityTyp,
} from "../../../../lib/utilities";
import { naeherungsHinweis } from "../../../../lib/utility-hook";
import { isOutreachStatus } from "../../../../lib/outreach-status";
import { fmtMixLeistung, fmtPvLeistung, fmtSpeicherKwh, fmtWattProKopf } from "../../../../lib/atlas-format";

// Cockpit-API für Stadtwerke / Energieversorger. Interne Tabellen ohne
// anon-Read, deshalb immer über den Service-Client und nie über den Browser —
// dasselbe Muster wie beim Kommunen-Outreach.

export const dynamic = "force-dynamic";

const TYPEN = Object.keys(UTILITY_TYP_LABEL) as UtilityTyp[];

/** Ein Versorger, anzeigefertig. Zahlen kommen fertig formatiert aus den
 *  kanonischen Formattern — die Oberfläche klebt nie selbst eine Einheit an. */
function toView(area: UtilityArea, hook: ReturnType<typeof hookFor>) {
  const u = area.utility;
  return {
    id: u.id,
    name: u.name,
    typ: u.typ,
    typLabel: UTILITY_TYP_LABEL[u.typ],
    website: u.website,
    kontaktEmail: u.kontaktEmail,
    kontaktseiteUrl: u.kontaktseiteUrl,
    sitzGemeindeId: u.sitzGemeindeId,
    status: u.status,
    notiz: u.notiz,
    bundeslandAgs: area.bundeslandAgs,
    gemeindeCount: area.gemeindeCount,
    einwohner: area.stats.population,
    // Näherungs-Angaben — gehören an JEDE Aggregat-Anzeige.
    quellen: area.quellen,
    vermutetAnteil: area.vermutetAnteil,
    ueberlappend: area.ueberlappend,
    ohneDaten: area.ohneDaten,
    mehrereBundeslaender: area.mehrereBundeslaender,
    hinweis: naeherungsHinweis(area),
    // Kennzahlen des Gebiets.
    werte: {
      erzeugung: fmtMixLeistung(area.erzeugungKw),
      solar: fmtPvLeistung(area.solarKwp),
      dachPrivat: fmtPvLeistung(area.stats.privatDachKwp),
      dachGewerbe: fmtPvLeistung(area.stats.gewerbeDachKwp),
      freiflaeche: fmtPvLeistung(area.stats.freiflaecheKwp),
      wind: fmtMixLeistung(area.stats.windKwp),
      biomasse: fmtMixLeistung(area.stats.biomasseKwp),
      wasser: fmtMixLeistung(area.stats.wasserKwp),
      speicher: fmtSpeicherKwh(area.speicherKwh),
      zubau: fmtPvLeistung(area.zubauKwp),
      dachProKopf:
        area.stats.population > 0
          ? fmtWattProKopf((area.stats.privatDachKwp * 1000) / area.stats.population)
          : null,
    },
    aufhaenger: hook.headline,
    aufhaengerHinweis: hook.hinweis,
    aufhaengerKategorie: hook.categoryKey ? utilityCategoryLabel(hook.categoryKey) : null,
  };
}

export async function GET(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const sp = req.nextUrl.searchParams;
  const bl = sp.get("bl") ?? "";
  const status = sp.get("status") ?? "";
  const q = (sp.get("q") ?? "").trim().toLowerCase();
  const detailId = sp.get("id") ?? "";

  const bundle = await loadUtilityBundle();

  // Detailansicht: ein Versorger mit seinen zugeordneten Gemeinden.
  if (detailId) {
    const area = bundle.areas.find((a) => a.utility.id === detailId);
    if (!area) return NextResponse.json({ error: "Versorger nicht gefunden" }, { status: 404 });
    const gemeinden = bundle.memberships
      .filter((m) => m.utilityId === detailId)
      .map((m) => {
        const g = bundle.statsByRegion.get(m.regionId);
        return {
          regionId: m.regionId,
          name: g?.name ?? m.regionId,
          rolle: m.rolle,
          quelle: m.quelle,
          einwohner: g?.population ?? null,
          hatDaten: !!g,
          solar: g ? fmtPvLeistung(g.privatDachKwp + g.gewerbeDachKwp + g.freiflaecheKwp + g.balkonKwp) : null,
        };
      })
      .sort((a, b) => (b.einwohner ?? 0) - (a.einwohner ?? 0));

    // Alle glaubwürdigen Platzierungen — der Aufhänger ist die stärkste davon,
    // die übrigen zeigen, worauf sie sich stützt.
    const platzierungen = (bundle.placements.get(detailId) ?? [])
      .filter((p) => p.rank <= 3 || p.rank / Math.max(p.total, 1) <= 0.25)
      .sort((a, b) => a.rank - b.rank || b.total - a.total)
      .slice(0, 8)
      .map((p) => ({
        kategorie: utilityCategoryLabel(p.categoryKey),
        rang: p.rank,
        gesamt: p.total,
        ebene: p.scope === "bund" ? "bundesweit" : "Bundesland",
        groessenklasse: p.sizeBand,
        belastbar: p.total >= 5,
      }));

    return NextResponse.json({
      row: toView(area, hookFor(area, bundle.placements)),
      gemeinden,
      platzierungen,
    });
  }

  let areas = bundle.areas;
  if (bl) areas = areas.filter((a) => a.bundeslandAgs === bl);
  if (status) areas = areas.filter((a) => a.utility.status === status);
  if (q) areas = areas.filter((a) => a.utility.name.toLowerCase().includes(q));

  const rows = areas.map((a) => toView(a, hookFor(a, bundle.placements)));
  return NextResponse.json({ rows, total: rows.length, erfasstGesamt: bundle.areas.length });
}

// Versorger anlegen. Die Sitzgemeinde wird zugleich als Gebiets-Zuordnung
// eingetragen (Rolle „sitz") — ein Versorger versorgt seinen eigenen Sitz.
export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const body = (await req.json()) as {
    name?: string;
    typ?: string;
    website?: string;
    kontakt_email?: string;
    kontaktseite_url?: string;
    sitz_gemeinde_id?: string;
    zuordnung_quelle?: string;
  };

  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
  const typ = body.typ && TYPEN.includes(body.typ as UtilityTyp) ? body.typ : "stadtwerk";

  const { data, error } = await serviceDb
    .from("utilities")
    .insert({
      name,
      typ,
      website: body.website?.trim() || null,
      kontakt_email: body.kontakt_email?.trim() || null,
      kontaktseite_url: body.kontaktseite_url?.trim() || null,
      sitz_gemeinde_id: body.sitz_gemeinde_id || null,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.sitz_gemeinde_id) {
    const quelle = ["verlinkt", "recherchiert", "vermutet"].includes(body.zuordnung_quelle ?? "")
      ? body.zuordnung_quelle
      : "verlinkt";
    const { error: linkErr } = await serviceDb.from("utility_communes").upsert(
      {
        utility_id: data.id,
        commune_id: body.sitz_gemeinde_id,
        rolle: "sitz",
        zuordnung_quelle: quelle,
      },
      { onConflict: "utility_id,commune_id" },
    );
    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}

// Stammdaten / Workflow pflegen.
export async function PATCH(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const body = (await req.json()) as Record<string, string | undefined> & { id?: string };
  if (!body.id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status !== undefined) {
    if (!isOutreachStatus(body.status)) return NextResponse.json({ error: "unbekannter Status" }, { status: 400 });
    patch.status = body.status;
  }
  if (body.typ !== undefined) {
    if (!TYPEN.includes(body.typ as UtilityTyp)) return NextResponse.json({ error: "unbekannter Typ" }, { status: 400 });
    patch.typ = body.typ;
  }
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Name darf nicht leer sein" }, { status: 400 });
    patch.name = name;
  }
  for (const feld of ["website", "kontakt_email", "kontaktseite_url", "notiz"] as const) {
    if (body[feld] !== undefined) patch[feld] = body[feld]?.trim() || null;
  }
  if (body.sitz_gemeinde_id !== undefined) patch.sitz_gemeinde_id = body.sitz_gemeinde_id || null;

  const { error } = await serviceDb.from("utilities").update(patch).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
