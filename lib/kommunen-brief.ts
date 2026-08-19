import "server-only";
import { supabase as serviceDb } from "./supabase-server";
import { renderOutreachDraft, type OutreachDraft } from "./kommunen-outreach-draft";
import { buildHookIndex, loadElternSlugs } from "./awards-server";
import { AWARD_CATEGORY_BY_KEY } from "./awards";
import { ranglisteUrl } from "./atlas-ranking";
import { DEFAULT_HOOK_SETTINGS } from "./award-hook";
import { atlasPathForRegionId } from "./atlas";
import { getRegionAtlasData } from "./mastr-data";
import { askVariante, type AskVariante } from "./kommunen-ask";

// EINE Stelle, an der ein Anschreiben entsteht.
//
// Die Zusammensetzung — Aufhänger aus dem Award-Kern, Zahlen aus derselben
// Quelle wie die Atlas-Seite, Rangliste-Adresse aus derselben Rechnung wie der
// Rang — stand bis zum 19.08.2026 nur im Cockpit-Endpunkt. Das Versandpaket
// hätte sie ein zweites Mal zusammengesetzt, und damit wäre genau das möglich
// geworden, wogegen die ganze Konstruktion gebaut ist: im Cockpit steht eine
// Zahl, in der verschickten Mail eine andere.
//
// Server-only, weil der Award-Kern die Grundtabelle über den Service-Key liest.

const SITE_URL = "https://solar-check.io";

export type BriefErgebnis = {
  regionId: string;
  name: string;
  population: number | null;
  variante: AskVariante;
  seiteUrl: string | null;
  ranglisteUrl: string | null;
  /** Datenstand des Marktstammdatenregisters (ISO) — steht in der Meldung. */
  stand: string;
  draft: OutreachDraft;
};

export type BriefFehler = { grund: "keine-db" | "unbekannt" | "gesperrt" };

/**
 * Anschreiben für EINE Gemeinde bauen.
 *
 * Gesperrte Gemeinden bekommen nie eines — die Sperre ist der Widerspruch nach
 * Art. 21 DSGVO bzw. § 7 UWG und muss an der Quelle greifen, nicht erst im
 * Versand-Skript.
 */
export async function briefFuerGemeinde(
  regionId: string,
  /** Empfängeradresse, falls bekannt — sie entscheidet allein, welche Quelle
   *  die Herkunftsangabe nach Art. 14 nennt (siehe kommunen-outreach-draft). */
  empfaenger?: string | null,
): Promise<BriefErgebnis | BriefFehler> {
  if (!serviceDb) return { grund: "keine-db" };

  const [{ data: reg }, { data: leadRow }, path, index, elternSlugsMap] = await Promise.all([
    serviceDb.from("mastr_regions").select("name, bezeichnung, population, slug").eq("region_id", regionId).single(),
    serviceDb
      .from("kommunen_kontakt")
      .select("outreach_status, verantwortlich_funktion, verantwortlich_operativ, ask_variante")
      .eq("region_id", regionId)
      .maybeSingle(),
    atlasPathForRegionId(regionId),
    buildHookIndex(DEFAULT_HOOK_SETTINGS),
    loadElternSlugs(),
  ]);
  if (!reg) return { grund: "unbekannt" };
  if (leadRow?.outreach_status === "gesperrt") return { grund: "gesperrt" };

  const atlas = await getRegionAtlasData(regionId);
  const hook = index.rows.find((r) => r.regionId === regionId);

  const seiteUrl = path ? `${SITE_URL}${path}` : null;

  const variante: AskVariante =
    (leadRow?.ask_variante as AskVariante | null) ??
    askVariante({ population: reg.population, operativeStelle: !!leadRow?.verantwortlich_operativ });

  const liste = (() => {
    const kat = hook?.categoryKey ? AWARD_CATEGORY_BY_KEY[hook.categoryKey]?.slug : undefined;
    const bl = elternSlugsMap[regionId.slice(0, 2)];
    const kreis = elternSlugsMap[regionId.slice(0, 5)];
    const gebiet = hook?.level === "bund" ? [] : hook?.level === "land" ? [bl] : [bl, kreis];
    const pfad = ranglisteUrl(kat, hook?.klasseSlug ?? null, gebiet);
    return pfad ? `${SITE_URL}${pfad}` : null;
  })();

  const draft = renderOutreachDraft({
    name: reg.name,
    pageUrl: seiteUrl,
    betreff: hook?.betreff ?? `So steht ${reg.name} beim Solar-Ausbau da`,
    einstieg:
      hook?.einstieg ??
      `Wir haben den Solarausbau in ${reg.name} aus den amtlichen Anlagendaten aufbereitet — hier der Überblick für Ihre Gemeinde.`,
    variante,
    funktion: leadRow?.verantwortlich_operativ ? leadRow.verantwortlich_funktion : null,
    wo: hook?.wo ?? "in der Region",
    bestleistung: hook?.bestleistung ?? "einen bemerkenswerten Solar-Ausbau",
    themaDativ: hook?.themaDativ ?? "Solar-Ausbau",
    phrase: hook?.phrase ?? "beim Solar-Ausbau",
    gruppe: hook?.gruppe ?? hook?.wo ?? "in der Region",
    rangWert: hook?.valueStr ?? null,
    rangBasis: hook?.basisStr ?? null,
    empfaenger: empfaenger ?? null,
    rang: hook?.rank && hook?.total && hook?.gruppe ? { platz: hook.rank, von: hook.total } : null,
    weitere: hook?.weitere ?? [],
    ranglisteUrl: liste,
    zahlen: {
      anlagen: atlas.solar.total_count,
      leistungKwp: atlas.solar.total_kwp,
      privatDachKwp: atlas.solar.by_segment.find((x) => x.segment === "privat_dach")?.kwp ?? null,
      wpProKopf: reg.population ? Math.round((atlas.solar.total_kwp * 1000) / reg.population) : null,
      stand: atlas.data_as_of,
    },
  });

  return {
    regionId,
    name: reg.name,
    population: reg.population ?? null,
    variante,
    seiteUrl,
    ranglisteUrl: liste,
    stand: atlas.data_as_of,
    draft,
  };
}

export function istBriefFehler(x: BriefErgebnis | BriefFehler): x is BriefFehler {
  return "grund" in x;
}
