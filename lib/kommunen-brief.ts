import "server-only";
import { supabase as serviceDb } from "./supabase-server";
import { renderOutreachDraft, type OutreachDraft } from "./kommunen-outreach-draft";
import { mitHerkunft } from "./brief-herkunft";
import { buildHookIndex, loadElternSlugs } from "./awards-server";
import { AWARD_CATEGORY_BY_KEY } from "./awards";
import { ranglisteUrl } from "./atlas-ranking";
import { DEFAULT_HOOK_SETTINGS } from "./award-hook";
import { atlasPathForRegionId, getRegionById, ownerAnker, type AtlasOwner } from "./atlas";
import { getRegionAtlasData } from "./mastr-data";
import { bundeslandByAgs } from "./mastr-regions";
import { ortPhrase } from "./atlas-orte";
import { gemeindeVergleich } from "./gemeinde-vergleich";
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
  /** Geht der Brief an ein Presse-/Redaktionspostfach? Dann entfällt die Bitte
   *  um Weiterleitung — wir schreiben bereits an die Stelle, die sie nennt. */
  opt?: { anPresse?: boolean },
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

  //
  // DIE SEITE DARF DEN BRIEF NICHT WIDERLEGEN — und tut es seit dem 20.08.2026
  // nicht mehr, weil beide aus DERSELBEN Rechnung sprechen.
  //
  // Vorher rechnete der Brief seinen Vergleich hier selbst (auf den privaten
  // Dächern), die Gemeindeseite ihren eigenen (auf der Gesamtleistung). Beide
  // richtig, beide konnten in verschiedene Richtungen zeigen: Melsungen stand
  // im Brief mit „39 % mehr" und auf der verlinkten Seite mit „6 % unter dem
  // Hessen-Schnitt, hier ist also noch viel Luft nach oben" — im ersten
  // Absatz, ohne Scrollen sichtbar. Vier der achtzehn Briefe des ersten Schubs
  // waren betroffen.
  //
  // Die Sofortmaßnahme war eine Bremse (`seiteSagtNachzuegler`): Der Brief
  // schwieg, sobald die Gesamtleistung unter dem Landesschnitt lag — und
  // verlor damit seine einzige eingängige Zahl. Sie ist ersatzlos weg. Die
  // Seite nennt jetzt BEIDE Größen und benennt die schwächere ausdrücklich
  // („… für alle Anlagen"); damit steht der Brief-Satz wieder überall, wo er
  // wahr ist, ohne dass ihm etwas widerspricht.
  const blAgs = regionId.slice(0, 2);
  const [atlas, blAtlas, blRegion] = await Promise.all([
    getRegionAtlasData(regionId),
    getRegionAtlasData(blAgs),
    getRegionById(blAgs),
  ]);
  const blName = bundeslandByAgs(blAgs)?.name ?? null;
  const vergleich = blName
    ? gemeindeVergleich({
        atlas,
        population: reg.population,
        blAtlas,
        blPopulation: blRegion?.population,
        blName,
      })
    : null;
  const vergleichBezug = blName ? ortPhrase({ name: blName, level: "bundesland" }) : "";
  const hook = index.rows.find((r) => r.regionId === regionId);

  //
  // DER LINK OEFFNET DIE SEITE IN DER STELLUNG, VON DER DER BRIEF HANDELT.
  //
  // Die Gemeindeseite zeigt von Haus aus alle Anlagen. Der Brief handelt aber
  // von dem, was die Buerger gebaut haben — und genau diese Zahl suchte der
  // Leser dann von Hand, waehrend oben eine andere stand (Melsungen: 880 Wp
  // gesamt gegen 576 Wp privat). Der Rauteteil stellt den Umschalter, der
  // Sprung landet am Bestandsblock.
  //
  // Abgeleitet aus der KATEGORIE des Aufhaengers, nicht fest gesetzt: Heute
  // sind alle Aufhaenger Buerger-Kategorien (HOOK_TRAEGER), aber das ist eine
  // Einstellung und keine Naturkonstante.
  const bestandOwner: AtlasOwner =
    hook?.categoryKey && AWARD_CATEGORY_BY_KEY[hook.categoryKey]?.traeger === "gewerbe"
      ? "gewerbe"
      : "privat";
  const seiteUrl = path
    ? mitHerkunft(`${SITE_URL}${path}#${ownerAnker(bestandOwner)}`)
    : null;

  const variante: AskVariante =
    (leadRow?.ask_variante as AskVariante | null) ??
    askVariante({ population: reg.population, operativeStelle: !!leadRow?.verantwortlich_operativ });

  const liste = (() => {
    const kat = hook?.categoryKey ? AWARD_CATEGORY_BY_KEY[hook.categoryKey]?.slug : undefined;
    const bl = elternSlugsMap[regionId.slice(0, 2)];
    const kreis = elternSlugsMap[regionId.slice(0, 5)];
    const gebiet = hook?.level === "bund" ? [] : hook?.level === "land" ? [bl] : [bl, kreis];
    // MIT ANKER: Der Link belegt eine Platzierung, er lädt nicht zum Stöbern
    // ein. Ohne ihn beginnt der Leser über drei Reihen Umschaltern und sucht
    // die Tabelle, die die Adresse längst richtig ausgewählt hat.
    const pfad = ranglisteUrl(kat, hook?.klasseSlug ?? null, gebiet, true);
    return pfad ? mitHerkunft(`${SITE_URL}${pfad}`) : null;
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
    einwohner: reg.population ?? null,
    wo: hook?.wo ?? "in der Region",
    bestleistung: hook?.bestleistung ?? "einen bemerkenswerten Solar-Ausbau",
    themaDativ: hook?.themaDativ ?? "Solar-Ausbau",
    phrase: hook?.phrase ?? "beim Solar-Ausbau",
    gruppe: hook?.gruppe ?? hook?.wo ?? "in der Region",
    rangWert: hook?.valueStr ?? null,
    rangBasis: hook?.basisStr ?? null,
    vergleich,
    vergleichBezug,
    empfaenger: empfaenger ?? null,
    anPresse: !!opt?.anPresse,
    rang: hook?.rank && hook?.total && hook?.gruppe ? { platz: hook.rank, von: hook.total } : null,
    weitere: hook?.weitere ?? [],
    ranglisteUrl: liste,
    // Die fertige Grafik für genau diesen Ort — live geprüft, kein Anhang.
    //
    // OHNE HERKUNFTSKENNUNG, anders als die beiden Links darüber: Diese Adresse
    // ist die Vorschau auf das Widget und landet, wenn das Angebot angenommen
    // wird, im Einbettungscode auf der Website der Gemeinde. Dort wäre sie kein
    // Brief-Klick mehr, sondern dauerhaft jeder Aufruf des eingebauten Widgets
    // — die Zählung würde von da an etwas anderes messen, als sie behauptet.
    widgetUrl: `${SITE_URL}/embed/gemeinde-solar?ags=${regionId}`,
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
