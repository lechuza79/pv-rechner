import { NextRequest, NextResponse } from "next/server";
import { supabase as serviceDb } from "../../../../lib/supabase-server";
import { isAdminSession } from "../../../../lib/admin-guard";
import { loadUtilityBundle, hookFor, invalidateUtilityBundle } from "../../../../lib/utilities-server";
import {
  UTILITY_TYP_LABEL,
  computeHighlights,
  erzeugungsMix,
  besteAdresse,
  THEMA_LABEL,
  utilityCategoryLabel,
  type UtilityArea,
  type UtilityTyp,
} from "../../../../lib/utilities";
import { naeherungsHinweis } from "../../../../lib/utility-hook";
import { isOutreachStatus } from "../../../../lib/outreach-status";
import { atlasPathForRegionId } from "../../../../lib/atlas";
import { fmtMixLeistung, fmtPvLeistung, fmtSpeicherKwh, fmtWattProKopf } from "../../../../lib/atlas-format";

// Cockpit-API für Stadtwerke / Energieversorger. Interne Tabellen ohne
// anon-Read, deshalb immer über den Service-Client und nie über den Browser —
// dasselbe Muster wie beim Kommunen-Outreach.

export const dynamic = "force-dynamic";

// Die Atlas-Seite wird verlinkt, um sie dem Versorger zu zeigen — deshalb immer
// die öffentliche Adresse, nicht die lokale.
const SITE_URL = "https://solar-check.io";

const TYPEN = Object.keys(UTILITY_TYP_LABEL) as UtilityTyp[];
const PAGE_SIZE = 50;

/** Ein Versorger, anzeigefertig. Zahlen kommen fertig formatiert aus den
 *  kanonischen Formattern — die Oberfläche klebt nie selbst eine Einheit an. */
function toView(
  area: UtilityArea,
  hook: ReturnType<typeof hookFor>,
  atlasUrl: string | null = null,
  alle: UtilityArea[] = [],
) {
  const u = area.utility;
  return {
    id: u.id,
    /** Unsere Atlas-Seite der Sitzgemeinde — das, was man dem Versorger zeigt. */
    atlasUrl,
    /** Hervorgehobene Kennzahlen, jeweils mit ihrem Vergleichsmaßstab. */
    highlights: computeHighlights(area, alle.length ? alle : [area]),
    /** Woraus sich die Erzeugungsleistung zusammensetzt — echter Anteil an der
     *  installierten Leistung im Gebiet, NICHT am Strommix. */
    mix: erzeugungsMix(area).map((t) => ({
      art: t.art,
      anzeige: fmtMixLeistung(t.kw),
      anteil: t.anteil,
      prozent: `${(t.anteil * 100).toLocaleString("de-DE", { maximumFractionDigits: 0 })} %`,
    })),
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
    // Kontakt + Themen aus dem Website-Lauf.
    telefon: u.telefon,
    ort: u.ort,
    impressumUrl: u.impressumUrl,
    verbundDomain: u.verbundDomain,
    profilGeprueft: !!u.profilGeprueftAm,
    kontakt: besteAdresse(u),
    verantwortlich: u.verantwortlichZeile
      ? {
          zeile: u.verantwortlichZeile,
          funktion: u.verantwortlichFunktion,
          operativ: !!u.verantwortlichOperativ,
        }
      : null,
    themen: u.themen.map((t) => ({ ...t, label: THEMA_LABEL[t.thema] ?? t.thema })),
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

    const eigene = bundle.memberships.filter((m) => m.utilityId === detailId);
    const ids = eigene.map((m) => m.regionId);

    // Zu jeder Gemeinde die beiden Wege nach draußen: ihre eigene Website (für
    // die Recherche, wer dort versorgt) und unsere Atlas-Seite (das, was man dem
    // Versorger später zeigt).
    const [{ data: kontakte }, pfade] = await Promise.all([
      serviceDb.from("kommunen_kontakt").select("region_id, website, kontakt_url").in("region_id", ids),
      Promise.all(ids.map((id) => atlasPathForRegionId(id))),
    ]);
    const kontaktByRegion = new Map((kontakte ?? []).map((k) => [k.region_id as string, k]));
    const pfadByRegion = new Map(ids.map((id, i) => [id, pfade[i]]));

    const gemeinden = eigene
      .map((m) => {
        const g = bundle.statsByRegion.get(m.regionId);
        const k = kontaktByRegion.get(m.regionId);
        const pfad = pfadByRegion.get(m.regionId) ?? null;
        return {
          regionId: m.regionId,
          name: g?.name ?? m.regionId,
          rolle: m.rolle,
          quelle: m.quelle,
          einwohner: g?.population ?? null,
          hatDaten: !!g,
          solar: g ? fmtPvLeistung(g.privatDachKwp + g.gewerbeDachKwp + g.freiflaecheKwp + g.balkonKwp) : null,
          website: (k?.website as string) ?? null,
          kontaktUrl: (k?.kontakt_url as string) ?? null,
          atlasUrl: pfad ? `${SITE_URL}${pfad}` : null,
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
      row: toView(area, hookFor(area, bundle.placements), null, bundle.areas),
      gemeinden,
      platzierungen,
    });
  }

  const typ = sp.get("typ") ?? "";
  const nurGebiet = sp.get("gebiet") === "1";
  const sort = sp.get("sort") ?? "";
  const seite = Math.max(0, parseInt(sp.get("page") ?? "0", 10) || 0);

  let areas = bundle.areas;
  if (bl) areas = areas.filter((a) => a.bundeslandAgs === bl);
  if (status) areas = areas.filter((a) => a.utility.status === status);
  if (typ) areas = areas.filter((a) => a.utility.typ === typ);
  if (nurGebiet) areas = areas.filter((a) => a.gemeindeCount > 0);
  if (q) areas = areas.filter((a) => a.utility.name.toLowerCase().includes(q));

  // Sortierung. Standard ist „größtes Gebiet zuerst" — beim Durchgehen von
  // hunderten Versorgern ist das die nützlichste Reihenfolge.
  const sortierer: Record<string, (a: UtilityArea, b: UtilityArea) => number> = {
    name: (a, b) => a.utility.name.localeCompare(b.utility.name, "de"),
    einwohner: (a, b) => b.stats.population - a.stats.population,
    erzeugung: (a, b) => b.erzeugungKw - a.erzeugungKw,
    gemeinden: (a, b) => b.gemeindeCount - a.gemeindeCount,
  };
  areas = [...areas].sort(sortierer[sort] ?? sortierer.gemeinden);

  const gesamt = areas.length;
  const seiteAreas = areas.slice(seite * PAGE_SIZE, seite * PAGE_SIZE + PAGE_SIZE);

  // Atlas-Pfad der Sitzgemeinde je Versorger (Regionslookup ist gecacht).
  const sitzPfade = await Promise.all(
    seiteAreas.map((a) => (a.utility.sitzGemeindeId ? atlasPathForRegionId(a.utility.sitzGemeindeId) : null)),
  );
  const rows = seiteAreas.map((a, i) =>
    toView(a, hookFor(a, bundle.placements), sitzPfade[i] ? `${SITE_URL}${sitzPfade[i]}` : null, bundle.areas),
  );
  return NextResponse.json({
    rows,
    total: gesamt,
    page: seite,
    pageSize: PAGE_SIZE,
    erfasstGesamt: bundle.areas.length,
  });
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

  invalidateUtilityBundle();
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

  invalidateUtilityBundle();
  return NextResponse.json({ ok: true });
}
