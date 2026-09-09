import "server-only";
import { supabase } from "./supabase-server";
import { withDbTimeout, DB_SOFT_READ_TIMEOUT_MS } from "./db-timeout";
import { AWARD_CATEGORY_BY_KEY, dedupFreiflaeche, formatAwardValue, type GemeindeStats } from "./awards";
import { bundeslandByAgs } from "./mastr-regions";
import { getRegionById } from "./atlas";
import { ortPhrase } from "./atlas-orte";
import type { VergleichsPlatz } from "./orts-stories";
import {
  LEVEL_LABEL,
  scopeIn,
  computePlacements,
  hookText,
  selectHook,
  type HookExample,
  type HookKind,
  type HookLevel,
  type HookSettings,
  type Placement,
  DEFAULT_HOOK_SETTINGS,
} from "./award-hook";

// Geteilter Server-Loader für die Award-Ansichten. Die breite Grundtabelle
// mastr_gemeinde_award (~11k Zeilen) + Name/Bezeichnung aus mastr_regions — ms
// statt Sekunden, NIE live über die 562k-Rohzeilen.
//
// Bewusst KEIN unstable_cache FÜR DIE GROSSEN WERTE: dessen Datencache deckelt
// bei 2 MB, und die Grundtabelle + der Hook-Index liegen darüber (gemessen:
// 7,11 MB) → Cache scheitert je Request und wirft, die Ansicht rechnet jedes Mal
// neu → „Suche dauert ewig". Stattdessen ein prozess-lokales Memo mit Ablauf:
// die Zahlen ändern sich nur im Monatslauf.
//
// DER SATZ GILT DER GRÖSSE, NICHT DEM WERKZEUG — und das ist der Unterschied,
// den er bis zum 08.09.2026 verwischt hat. Ein prozess-lokales Memo spart den
// zweiten Aufruf, nie den ersten; wo ein Wert im SEITENAUFBAU gebraucht wird,
// zahlt ihn jede frisch gestartete Function noch einmal. Ein kleines
// Ergebnis gehört deshalb sehr wohl in den geteilten Cache (siehe
// `auszeichnungsOrte`: 49 kB). Wer hier etwas Neues cachen will, misst zuerst,
// wie groß es ist.

const TTL_MS = 60 * 60 * 1000;

/** Ein Wert, prozess-lokal gecacht mit Ablauf. */
function memoize<T>(fn: () => Promise<T>): () => Promise<T> {
  let cache: { at: number; val: T } | null = null;
  return async () => {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.val;
    const val = await fn();
    cache = { at: Date.now(), val };
    return val;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function pageAll(table: string, select: string, refine?: (q: any) => any): Promise<any[]> {
  if (!supabase) return [];
  const size = 1000;
  const out: unknown[] = [];
  for (let from = 0; ; from += size) {
    let q = supabase.from(table).select(select).order("region_id", { ascending: true }).range(from, from + size - 1);
    if (refine) q = refine(q);
    // Zeitbudget je Seite: Diese Schleife holt über 20.000 Zeilen in Blöcken.
    // Ohne Notbremse hängt ein einziger kränkelnder Block die ganze Seite bis
    // zum Function-Limit — mit ihr wirft er, und der Aufrufer merkt es.
    const { data, error } = await withDbTimeout(q, `awards: ${table} ab ${from}`);
    // Fehler werfen statt still abbrechen: ein Teil-Ergebnis (z. B. nur die ersten
    // 3.000 Gemeinden) würde sonst eine Stunde lang falsche Ranglisten cachen. Der
    // Aufrufer memoisiert nur erfolgreiche, vollständige Läufe.
    if (error) throw new Error(`Award-Daten laden (${table}): ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < size) break;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return out as any[];
}

export const loadAwardStats = memoize(async (): Promise<GemeindeStats[]> => {
  if (!supabase) return [];
  const stats = await pageAll("mastr_gemeinde_award", "*");
  const regions = await pageAll("mastr_regions", "region_id, name, bezeichnung, slug", (q) => q.eq("level", "gemeinde"));
  const meta = new Map(regions.map((r) => [r.region_id as string, r]));
  return stats.map((r) => {
    const m = meta.get(r.region_id as string);
    return {
      regionId: r.region_id as string,
      name: (m?.name as string) ?? (r.region_id as string),
      bezeichnung: (m?.bezeichnung as string) ?? "Gemeinde",
      slug: (m?.slug as string | null) ?? null,
      population: r.population as number,
      privatDachKwp: Number(r.privat_dach_kwp),
      privatDachCount: Number(r.privat_dach_count ?? 0),
      gewerbeDachKwp: Number(r.gewerbe_dach_kwp),
      // Bekannte Doppelzählungen abziehen, bevor Solar-Standort/Freifläche ranken.
      freiflaecheKwp: dedupFreiflaeche(r.region_id as string, Number(r.freiflaeche_kwp)),
      balkonCount: Number(r.balkon_count),
      balkonKwp: Number(r.balkon_kwp),
      batteriePrivatKwh: Number(r.batterie_privat_kwh),
      batteriePrivatCount: Number(r.batterie_privat_count ?? 0),
      batterieGewerbeKwh: Number(r.batterie_gewerbe_kwh),
      windKwp: Number(r.wind_kwp),
      biomasseKwp: Number(r.biomasse_kwp),
      wasserKwp: Number(r.wasser_kwp),
      solarZubauKwp: Number(r.solar_zubau_kwp),
      solarKwp: Number(r.solar_kwp ?? 0),
      solarKwpLy: Number(r.solar_kwp_ly ?? 0),
      solarKwpL3: Number(r.solar_kwp_l3 ?? 0),
      solarKwpL5: Number(r.solar_kwp_l5 ?? 0),
      privatDachKwpLy: Number(r.privat_dach_kwp_ly ?? 0),
      privatDachKwpL3: Number(r.privat_dach_kwp_l3 ?? 0),
      privatDachKwpL5: Number(r.privat_dach_kwp_l5 ?? 0),
      balkonCountLy: Number(r.balkon_count_ly ?? 0),
      batteriePrivatKwhLy: Number(r.batterie_privat_kwh_ly ?? 0),
      freiflaecheKwpLy: Number(r.freiflaeche_kwp_ly ?? 0),
      windKwpLy: Number(r.wind_kwp_ly ?? 0),
    };
  });
});

/**
 * Kreis-Namen (5-stelliger AGS → amtlicher Name) für die Anschreiben-Aufhänger.
 *
 * BEWUSST DER VOLLE NAME, inklusive vorangestellter Gattung. Der Betreff bildet
 * daraus „im Landkreis" (`gattungPhrase`), der Fließtext den Ortsnamen
 * (`scopeIn`, dort läuft `regionDisplayName`). Beide Wege brauchen den vollen
 * Namen als Ausgangspunkt — ihn hier zu kürzen machte aus „im Landkreis" ein
 * „in Schwalm-Eder-Kreis".
 */
export const loadKreisNames = memoize(async (): Promise<Record<string, string>> => {
  const rows = await pageAll("mastr_regions", "region_id, name", (q) => q.eq("level", "landkreis"));
  const out: Record<string, string> = {};
  for (const r of rows) out[r.region_id as string] = r.name as string;
  return out;
});

/** Slugs der Bundesländer und Landkreise (2- und 5-stelliger AGS). Zusammen mit
 *  dem Gemeinde-Slug ergibt das den vollen Atlas-Pfad — 420 Zeilen statt einer
 *  Abfrage je Ranglisten-Eintrag. */
export const loadElternSlugs = memoize(async (): Promise<Record<string, string>> => {
  const rows = await pageAll("mastr_regions", "region_id, slug", (q) =>
    q.in("level", ["bundesland", "landkreis"]).not("slug", "is", null),
  );
  const out: Record<string, string> = {};
  for (const r of rows) out[r.region_id as string] = r.slug as string;
  return out;
});

export type HookIndex = { total: number; dist: Record<HookKind, number>; rows: HookExample[] };

// Prozess-lokales Memo je Einstellungs-Kombination (klein gehalten).
const hookIndexMemo = new Map<string, { at: number; val: HookIndex }>();

/** Für ALLE Gemeinden den fertigen Aufhänger (Betreff/Einstieg) vorberechnen.
 *  Danach ist die Suche in der Ansicht nur ein Filter über dieses Array, nicht
 *  33 Sortierläufe pro Request. */
/**
 * Hat DIESE Gemeinde überhaupt eine Auszeichnung?
 *
 * Die Gemeindeseite lädt ihre Platzierung weiterhin im Browser nach — der
 * Rechenkern zieht rund 11.000 Zeilen, und das gehört nicht in den
 * Seitenaufbau (die Fehlerklasse, die am 27.07.2026 eine Index-Welle gekippt
 * hat). Was die Seite VORHER wissen muss, ist nur eine Ja/Nein-Frage: Soll der
 * Platz für die Kachel reserviert werden?
 *
 * Ohne diese Frage gibt es nur zwei schlechte Antworten — kein Platzhalter
 * (dann springt der Inhalt, sobald die Rangdaten eintreffen) oder immer einer
 * (dann springt er bei den rund zwei Dritteln der Orte OHNE Auszeichnung, nur
 * andersherum).
 *
 * ─── DREI ANLÄUFE, UND WARUM ERST DER DRITTE TRÄGT ──────────────────────────
 *
 * 1. PROZESS-LOKALES MEMO (bis 08.09.2026). Es spart den zweiten Aufruf im
 *    selben Prozess, nie den ERSTEN: Eine frisch gestartete Function baute den
 *    vollen Index einmal auf, 3,70 s für 10.742 Zeilen. In den Gesundheitsläufen
 *    stand genau dieses Muster — erste Stichprobe 5,5 bis 7,9 s, jede folgende
 *    0,6 bis 1,8 s, sechsmal in zwei Tagen, einmal 0,1 s vor der Notbremse.
 *
 * 2. GETEILTER CACHE MIT FRIST (08. bis 09.09.2026). Er löst den Kaltstart und
 *    verschiebt das Problem auf den Fristablauf: Läuft die Frist ab, zahlt der
 *    NÄCHSTE Besucher die 3,7 s im Seitenaufbau. Bei einer Stunde traf das
 *    reihenweise den Gesundheitscheck — am 09.09.2026 drei rote Läufe, jedes
 *    Mal die erste Stichprobe bei 7,2 / 7,2 / 7,6 s, an drei Orten in drei
 *    Bundesländern, 0,8 s vor der Notbremse. Ein Tag statt einer Stunde senkt
 *    die Häufigkeit auf ein Vierundzwanzigstel und beseitigt sie nicht.
 *
 * 3. VORBERECHNET, WIE JETZT. Die Liste entsteht im DATENLAUF und liegt als
 *    Tabelle; der Seitenaufbau liest EINE Zeile über den Primärschlüssel. Die
 *    teure Arbeit ist damit vollständig aus dem Anfrageweg heraus — nicht
 *    seltener, sondern gar nicht mehr darin. Das ist der Unterschied zwischen
 *    „meistens schnell" und „zuverlässig schnell", und für einen
 *    Outreach-Schub zählt nur das zweite.
 *
 * DIE ERSTEN BEIDEN ANLÄUFE WAREN NICHT FALSCH, SONDERN ZU KLEIN. Beide haben
 * die Häufigkeit gesenkt und beide haben denselben Rest gelassen: teure Arbeit
 * im Anfrageweg. Wer hier wieder etwas cacht statt es vorzuberechnen, baut den
 * dritten Anlauf desselben Fehlers.
 *
 * Fällt die Datenbank aus oder ist die Tabelle leer, lautet die Antwort „nein":
 * kein Platzhalter ist der harmlosere Fehler. Damit ein stiller Ausfall nicht
 * unbemerkt bleibt, prüft der Gesundheitscheck Bestand und Alter der Tabelle.
 */
export const AUSZEICHNUNGEN_DDL = `
  create table if not exists atlas_auszeichnungen (
    region_id text primary key,
    erneuert_am timestamptz not null default now()
  );
  alter table atlas_auszeichnungen enable row level security;
`;

const auszeichnungsOrteUncached = async (): Promise<string[]> =>
  (await buildHookIndex(DEFAULT_HOOK_SETTINGS)).rows
    .filter((r) => r.kind !== "neutral")
    .map((r) => r.regionId);

/**
 * Die Liste im Datenlauf neu aufbauen — NICHT im Seitenaufbau.
 *
 * Aufgerufen vom Atlas-Datenlauf, direkt nachdem die Zahlen neu stehen. Erst
 * schreiben, dann die alten Zeilen entfernen: Bricht der Lauf dazwischen ab,
 * stehen zu viele Orte in der Tabelle statt zu wenige — ein Platzhalter zu viel
 * ist der harmlosere Fehler gegenüber einer halb leeren Liste.
 */
export async function baueAuszeichnungen(): Promise<{ orte: number }> {
  if (!supabase) throw new Error("Datenbank nicht eingerichtet");
  await supabase.rpc("exec_sql", { sql: AUSZEICHNUNGEN_DDL });

  const orte = await auszeichnungsOrteUncached();
  const jetzt = new Date().toISOString();
  // Alle Zeilen tragen dieselbe Feldmenge — sonst setzt ein Batch die fehlenden
  // Felder der übrigen Zeilen auf NULL (siehe upsert-spaltenmenge.test.ts).
  for (let i = 0; i < orte.length; i += 500) {
    const teil = orte.slice(i, i + 500).map((region_id) => ({ region_id, erneuert_am: jetzt }));
    const { error } = await supabase.from("atlas_auszeichnungen").upsert(teil);
    if (error) throw new Error(`Auszeichnungen schreiben: ${error.message}`);
  }
  const { error } = await supabase.from("atlas_auszeichnungen").delete().lt("erneuert_am", jetzt);
  if (error) throw new Error(`Auszeichnungen aufräumen: ${error.message}`);
  return { orte: orte.length };
}

export async function hatAuszeichnung(regionId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    // EINE Zeile über den Primärschlüssel. Weiches Zeitbudget, weil es einen
    // vollwertigen Rückfall gibt: keine Antwort heißt „kein Platzhalter".
    const { data } = await withDbTimeout(
      supabase.from("atlas_auszeichnungen").select("region_id").eq("region_id", regionId).maybeSingle(),
      "atlas_auszeichnungen",
      DB_SOFT_READ_TIMEOUT_MS,
    );
    return !!data;
  } catch {
    return false;
  }
}

/** Bestand und Stand der Liste — für den Gesundheitscheck. */
export async function auszeichnungsStand(): Promise<{ orte: number; erneuertAm: string | null }> {
  if (!supabase) return { orte: 0, erneuertAm: null };
  const { count } = await withDbTimeout(
    supabase.from("atlas_auszeichnungen").select("region_id", { count: "exact", head: true }),
    "atlas_auszeichnungen_count",
  );
  const { data } = await withDbTimeout(
    supabase
      .from("atlas_auszeichnungen")
      .select("erneuert_am")
      .order("erneuert_am", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "atlas_auszeichnungen_stand",
  );
  return { orte: count ?? 0, erneuertAm: (data as { erneuert_am?: string } | null)?.erneuert_am ?? null };
}

/**
 * Die Platzierungen EINES Orts — alle, nicht nur die beste.
 *
 * WOFÜR: Der Auszeichnungs-Kasten zeigt genau eine, und nur wo der Ort vorn
 * liegt. Für den Vergleich innerhalb der eigenen Größenklasse („wo stehen wir
 * unter den kleinen Gemeinden im Landkreis") ist auch ein Platz im Mittelfeld
 * eine Aussage — und die gibt es für JEDEN Ort, während die gespeicherten
 * Funde des Suchlaufs naturgemäß nur das Auffällige treffen (gemessen: 313
 * Funde auf 197 von 11.000 Gemeinden).
 *
 * Gerechnet wird nichts Neues: dieselbe Rechnung, aus der Aufhänger, Kasten
 * und Rangliste kommen. Prozess-lokal gemerkt wie der Index selbst.
 */
/**
 * Die Platzierungen ALLER Gemeinden — einmal je Prozess gerechnet.
 *
 * Die Rechnung läuft über alle 11.000 Gemeinden und hängt allein an den
 * Statistiken, die selbst memoisiert sind. Ein Aufruf je Ort war richtig,
 * solange nur eine Gemeindeseite fragte; seit die Templates-Ansicht die
 * Geschichten mehrerer Orte auf einmal baut (lib/orts-beitraege-server.ts),
 * wäre es dieselbe Rechnung sechsmal hintereinander — die Kopplung „teurer mit
 * den Daten", gegen die dieses Projekt seine Regeln hat.
 */
const platzierungsKarte = memoize(async (): Promise<Map<string, Placement[]>> =>
  computePlacements(await loadAwardStats()),
);

export async function platzierungenFuer(regionId: string): Promise<Placement[]> {
  try {
    return (await platzierungsKarte()).get(regionId) ?? [];
  } catch {
    return [];
  }
}

/**
 * Die Platzierungen eines Orts, fertig für den Story-Feed.
 *
 * Die Auswahl steht HIER und nicht in der Oberfläche: Sie hängt an den
 * Merkern des Award-Kerns (Verdachtsfall, dünner Bestand) und an der
 * Kategorie-Tabelle — beides Server-Wissen. Eine Client-Komponente, die auch
 * nur einen Wert von hier importiert, zieht die halbe Rechenkette in das
 * Browser-Bündel jeder der 11.000 Ortsseiten.
 *
 * `ohneKategorie` ist die, die der Auszeichnungs-Kasten oben schon zeigt —
 * zweimal dieselbe Aussage auf einer Seite ist der Fehler, gegen den jener
 * Kasten selbst gebaut wurde.
 */
export async function vergleichsPlaetze(
  regionId: string,
  opts: { ohneKategorie?: string | null; hoechstens?: number } = {},
): Promise<VergleichsPlatz[]> {
  const alle = await platzierungenFuer(regionId);
  // Die Gebietsnamen NACHSCHLAGEN, nicht aus dem Schlüssel bauen: Für den
  // Landkreis stand sonst der rohe Gemeindeschlüssel im Satz („im 06632").
  const gebietsNamen = new Map<string, string>();
  for (const sid of new Set(alle.filter((p) => p.level === "kreis").map((p) => p.scopeId))) {
    const r = await getRegionById(sid);
    if (r) gebietsNamen.set(sid, ortPhrase({ name: r.name, level: "kreis" }));
  }
  return alle
    .filter((p) => !p.spike && !p.duenn)
    // Eine Gruppe unter zehn trägt keinen Rang: „Platz 2 von 3" ist keine
    // Einordnung, sondern eine Aufzählung.
    .filter((p) => p.total >= MIN_GRUPPE_FUER_RANG)
    .filter((p) => p.categoryKey !== opts.ohneKategorie)
    // Nur was WEIT genug vorn steht, um eine Aussage zu sein: das obere
    // Drittel. Weiter hinten sagt der Rang über den Ort wenig und liest sich
    // als Mängelliste — auf der eigenen Seite genauso.
    .filter((p) => p.rank / p.total <= 0.34)
    .sort((a, b) => a.rank / a.total - b.rank / b.total)
    // HÖCHSTENS EINE PLATZIERUNG JE MESSGRÖSSE. Ohne das stand dieselbe Größe
    // dreimal auf der Seite — im Auszeichnungs-Kasten für den Landkreis, im
    // Feed für das Land und noch einmal bundesweit. Drei Karten über
    // Balkonkraftwerke sind kein Feed, sondern eine Wiederholung; die stärkste
    // Ebene genügt.
    .filter((p, _i, arr) => arr.find((q) => q.categoryKey === p.categoryKey) === p)
    .slice(0, opts.hoechstens ?? 2)
    .map((p) => {
      const cat = AWARD_CATEGORY_BY_KEY[p.categoryKey];
      const gebiet = gebietsNamen.get(p.scopeId) ?? gebietsName(p.level, p.scopeId);
      return {
        kategorie: p.categoryKey,
        ebene: p.level,
        klasseSlug: p.klasseSlug,
        klasseLabel: p.klasseLabel,
        gruppe: `${p.klasseLabel} ${gebiet}`.trim(),
        gebiet,
        messgroesse: cat?.themaDativ ?? p.categoryKey,
        rang: p.rank,
        ausN: p.total,
        wert: cat ? formatAwardValue(p.value, cat.format) : String(p.value),
        rohwert: Math.round(p.value * 10) / 10,
        einheit: cat ? einheitVon(cat.format) : "",
      };
    });
}

/** Ab so vielen Orten trägt ein Rang eine Aussage. */
const MIN_GRUPPE_FUER_RANG = 10;

/** „im Landkreis Fulda", „in Hessen", „bundesweit". */
function gebietsName(level: HookLevel, scopeId: string): string {
  if (level === "bund") return "bundesweit";
  const bl = bundeslandByAgs(scopeId.slice(0, 2));
  if (level === "land") return bl ? ortPhrase({ name: bl.name, level: "bundesland" }) : "im Bundesland";
  // Kreis ohne aufgelösten Namen: lieber die Ebene benennen als eine Kennzahl
  // in den Satz schreiben.
  return "im Landkreis";
}

/** Die Einheit, die neben der Zahl steht — nie an sie geklebt. */
function einheitVon(format: string): string {
  if (format === "wattProKopf") return "Wp je Einwohner";
  if (format === "je1000") return "je 1.000 Einwohner";
  if (format === "je100Dach") return "je 100 Dächer";
  if (format === "kwhProKopf") return "kWh je Einwohner";
  return "";
}

export async function buildHookIndex(settings: HookSettings): Promise<HookIndex> {
  const key = JSON.stringify(settings);
  const hit = hookIndexMemo.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.val;

  const [stats, kreisNames] = await Promise.all([loadAwardStats(), loadKreisNames()]);
  const placements = computePlacements(stats);
  const dist: Record<HookKind, number> = { sieger: 0, podium: 0, perzentil: 0, neutral: 0 };
  const rows: HookExample[] = stats.map((g) => {
    const hook = selectHook(placements.get(g.regionId), settings);
    dist[hook.kind]++;
    const names = {
      gemeinde: g.name,
      kreis: kreisNames[g.regionId.slice(0, 5)] ?? "Landkreis",
      land: bundeslandByAgs(g.regionId.slice(0, 2))?.name ?? "",
    };
    const t = hookText(hook, names);
    const others = (placements.get(g.regionId) ?? [])
      .filter((p) => p.total >= settings.minTotal && p.rank <= 3)
      .sort((a, b) => a.rank - b.rank || b.total - a.total)
      .slice(0, 4)
      .map((p) => `${AWARD_CATEGORY_BY_KEY[p.categoryKey]?.label} · ${LEVEL_LABEL[p.level]} · Platz ${p.rank}/${p.total}`);
    // Weitere Spitzenplaetze — dieselbe Gemeinde, andere Kategorie oder Ebene.
    // Der gewaehlte Aufhaenger faellt raus, sonst stuende er zweimal im Brief.
    //
    // EINE ZEILE JE MESSGRÖSSE, NICHT JE EBENE.
    //
    // Vorher stand dieselbe Tatsache bis zu dreimal untereinander, absteigend
    // nach Beeindruckendheit: „Platz 1 von 4.008 bundesweit", darunter „Platz 1
    // von 568 in Rheinland-Pfalz", darunter „Platz 1 von 33 im Landkreis" — und
    // die letzte Zeile entwertete die erste. Ebenso die drei Zubau-Fenster
    // (seit Ende 2025 / 2023 / 2021), die als drei Zeilen dastanden, obwohl sie
    // ineinandergeschachtelt sind. Das ist die Stelle, an der ein Leser merkt,
    // dass niemand den Brief angesehen hat.
    //
    // Deshalb: je Messgröße die stärkste Zeile (größte Vergleichsgruppe), die
    // Zubau-Fenster als EINE Familie, und die gewählte Messgröße ganz heraus —
    // sie steht schon oben.
    const familie = (key: string) => (key.startsWith("tempo-") ? "tempo" : key);
    const besteJeFamilie = new Map<string, Placement>();
    for (const p of placements.get(g.regionId) ?? []) {
      if (p.spike || p.duenn || p.schlusslicht) continue;
      if (p.total < settings.minTotal || p.rank > 3) continue;
      if (familie(p.categoryKey) === familie(hook.categoryKey ?? "")) continue;
      const f = familie(p.categoryKey);
      const bisher = besteJeFamilie.get(f);
      if (!bisher || p.rank < bisher.rank || (p.rank === bisher.rank && p.total > bisher.total)) {
        besteJeFamilie.set(f, p);
      }
    }
    const weitere = Array.from(besteJeFamilie.values())
      .sort((a, b) => a.rank - b.rank || b.total - a.total)
      .slice(0, 2)
      .map((p) => ({
        phrase: AWARD_CATEGORY_BY_KEY[p.categoryKey]?.betreffPhrase ?? `bei ${AWARD_CATEGORY_BY_KEY[p.categoryKey]?.themaDativ}`,
        gruppe: `${p.klasseLabel} ${scopeIn(p.level, names)}`,
        platz: p.rank,
        von: p.total,
      }));
    return {
      regionId: g.regionId,
      name: g.name,
      bl: bundeslandByAgs(g.regionId.slice(0, 2))?.short ?? "",
      population: g.population,
      kind: hook.kind,
      categoryKey: hook.categoryKey,
      level: hook.level,
      scopeId: hook.scopeId,
      betreff: t.betreff,
      einstieg: t.einstieg,
      others,
      weitere,
      rank: hook.rank,
      total: hook.total,
      bestleistung: hook.categoryKey ? (AWARD_CATEGORY_BY_KEY[hook.categoryKey]?.bestleistung ?? null) : null,
      themaDativ: hook.categoryKey ? (AWARD_CATEGORY_BY_KEY[hook.categoryKey]?.themaDativ ?? null) : null,
      phrase: hook.categoryKey ? (AWARD_CATEGORY_BY_KEY[hook.categoryKey]?.betreffPhrase ?? null) : null,
      klasseSlug:
        (placements.get(g.regionId) ?? []).find(
          (p) => p.categoryKey === hook.categoryKey && p.level === hook.level,
        )?.klasseSlug ?? null,
      wo: hook.level ? scopeIn(hook.level, names) : null,
      // Klasse UND Gebiet — der Rang gilt nur innerhalb der Groessenklasse.
      gruppe:
        hook.level && hook.klasseLabel ? `${hook.klasseLabel} ${scopeIn(hook.level, names)}` : null,
      valueStr:
        hook.value != null && hook.categoryKey
          ? formatAwardValue(hook.value, AWARD_CATEGORY_BY_KEY[hook.categoryKey].format)
          : null,
      basisStr: hook.categoryKey ? (AWARD_CATEGORY_BY_KEY[hook.categoryKey]?.basis?.(g) ?? null) : null,
    };
  });

  const result: HookIndex = { total: stats.length, dist, rows };
  if (hookIndexMemo.size > 16) hookIndexMemo.clear();
  hookIndexMemo.set(key, { at: Date.now(), val: result });
  return result;
}
