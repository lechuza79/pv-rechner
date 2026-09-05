/**
 * Vollmessung: Was kostet uns die Sperre der kreisfreien Städte?
 *
 *   npm run atlas:kreisfrei              volle Messung
 *   npm run atlas:kreisfrei -- --trocken zeigt nur, was gefragt würde
 *
 * WOZU: Die Atlas-Kreisebene ist gesperrt, weil auf LANDKREISE niemand sucht
 * (Messung 18.08.2026: „photovoltaik landkreis würzburg" 10 Suchen/Monat). Im
 * Gebietsschlüssel sitzen dort aber auch die 110 kreisfreien Städte — Köln,
 * Essen, Düsseldorf, Osnabrück. Eine Stadt ist kein Landkreis, und nach ihr wird
 * unter ihrem Namen gesucht. Diese Messung beantwortet, ob die Mitsperre etwas
 * kostet, und für welche Städte eine Freigabe kollisionsfrei wäre.
 *
 * DREI QUELLEN, weil keine allein reicht:
 *   1. Suchvolumen (DataForSEO)  — gibt es Nachfrage? Vorbehalt: Der Dienst
 *      meldet unterhalb von 10 Suchen/Monat GAR NICHTS ("null" heißt "keine
 *      Daten", nicht "keine Nachfrage"). Für Großstädte ist das unkritisch.
 *   2. Search Console             — bekommen wir auf diesen Ortsnamen HEUTE
 *      schon Einblendungen, und auf welcher Seite? Das ist die einzige Zahl,
 *      die nicht geschätzt ist.
 *   3. Eigener Katalog            — hat die Stadt schon eine Förderseite? Dann
 *      konkurrieren zwei eigene Seiten, und die Förderseite steht teils auf
 *      Position 3.
 *
 * Das Ergebnis ist eine Liste, keine Entscheidung. Freigegeben wird über den
 * Releaseplan, mit Nachweis.
 */
import { envLaden } from "./env-laden";
envLaden();
import { createClient } from "@supabase/supabase-js";
import { ATLAS_CITIES } from "../lib/atlas-cities";
import { ortSchluessel } from "../lib/release-plan";

const trocken = process.argv.includes("--trocken");
const LOGIN = process.env.DATAFORSEO_LOGIN;
const PASSWORT = process.env.DATAFORSEO_PASSWORD;
const CRON = process.env.CRON_SECRET;
const BASIS = process.env.SEO_BASE_URL || "https://solar-check.io";

type Stadt = { ags: string; name: string; slug: string; bundesland: string };

/** Kreisfrei heißt: kein Landkreis, kein Kreis, keine Region, kein Verband. */
function istEchterKreis(name: string): boolean {
  return /^(Landkreis|Kreis|Region|StädteRegion|Regionalverband)\b/i.test(name) || /kreis$/i.test(name);
}

/**
 * Der Name, nach dem Menschen suchen — ohne amtliche Zusätze.
 *
 * Das Melderegister führt „Oldenburg (Oldb)", „Halle (Saale)", „Freiburg im
 * Breisgau". Gesucht wird nach „oldenburg". Zwei Gründe für die Bereinigung:
 * Der Suchvolumen-Dienst weist Klammern als ungültige Zeichen ZURÜCK und
 * verwirft dabei den ganzen Sammelaufruf — beim ersten Lauf am 29.08.2026 stand
 * deshalb für alle 107 Städte „kein Suchvolumen" im Bericht, Köln und Hamburg
 * eingeschlossen. Und selbst wenn er sie annähme, wäre „photovoltaik oldenburg
 * (oldb)" die falsche Frage.
 */
function suchName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function kreisfreieStaedte(): Promise<Stadt[]> {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await db
    .from("mastr_regions")
    .select("region_id, name, slug, level, parent_region_id")
    .eq("level", "landkreis")
    .limit(1000);
  if (error) throw new Error(error.message);
  const zeilen = (data ?? []) as any[];

  const { data: laender } = await db
    .from("mastr_regions")
    .select("region_id, slug")
    .eq("level", "bundesland")
    .limit(100);
  const blSlug = new Map(((laender ?? []) as any[]).map((l) => [l.region_id, l.slug]));

  return zeilen
    .filter((z) => !istEchterKreis(z.name) && z.slug)
    .map((z) => ({
      ags: z.region_id,
      name: z.name,
      slug: z.slug,
      bundesland: blSlug.get(z.parent_region_id) ?? "?",
    }));
}

async function volumen(begriffe: string[]): Promise<Map<string, number | null>> {
  const auth = Buffer.from(`${LOGIN}:${PASSWORT}`).toString("base64");
  const map = new Map<string, number | null>();
  // Der Dienst nimmt höchstens 1.000 Begriffe je Aufruf; wir bleiben darunter.
  for (let i = 0; i < begriffe.length; i += 700) {
    const teil = begriffe.slice(i, i + 700);
    const res = await fetch("https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify([{ keywords: teil, location_code: 2276, language_code: "de" }]),
    });
    if (!res.ok) throw new Error(`Suchvolumen antwortete ${res.status}`);
    const d: any = await res.json();
    const aufgabe = d?.tasks?.[0];
    if (aufgabe?.status_code >= 40000) {
      throw new Error(`Suchvolumen: ${aufgabe.status_message} (${aufgabe.status_code})`);
    }
    const treffer = aufgabe?.result ?? [];
    if (!treffer.length) throw new Error(`Suchvolumen lieferte nichts für ${teil.length} Begriffe`);
    for (const t of treffer) {
      map.set(String(t.keyword).toLowerCase(), t.search_volume ?? null);
    }
  }
  // NIE einen leeren Abruf als „keine Nachfrage" durchgehen lassen. Ein Lauf,
  // bei dem AUSNAHMSLOS jeder Wert fehlt, ist ein Werkzeugfehler und kein
  // Ergebnis — beim ersten Lauf am 29.08.2026 stand deshalb „Suchvolumen 0" für
  // Köln und Hamburg im Bericht. Dieselbe Trennung wie in der Kostenwache
  // zwischen „nichts gefunden" und „konnte nicht nachsehen".
  const bekannt = [...map.values()].filter((v) => v != null).length;
  if (bekannt === 0) {
    throw new Error(
      `Kein einziger Begriff hat ein Suchvolumen — das ist ein Abruffehler, kein Befund. ` +
        `Erneut versuchen statt die Nullen zu berichten.`,
    );
  }
  return map;
}

/** Anfragen der Search Console mit Seite — die einzige ungeschätzte Quelle. */
async function gscAnfragen(): Promise<{ query: string; page: string; impressions: number; clicks: number; position: number }[]> {
  const res = await fetch(`${BASIS}/api/seo/gsc?dim=query&days=90`, {
    headers: { Authorization: `Bearer ${CRON}` },
  });
  if (!res.ok) throw new Error(`Search-Console-Route antwortete ${res.status}`);
  const d: any = await res.json();
  return (d?.queries ?? []) as any[];
}

async function main() {
  const staedte = await kreisfreieStaedte();
  console.log(`${staedte.length} kreisfreie Städte auf der gesperrten Kreisebene\n`);

  const begriffe = staedte.flatMap((s) => [
    `photovoltaik ${suchName(s.name)}`,
    `solaranlagen ${suchName(s.name)}`,
  ]);

  if (trocken) {
    console.log(`Zu messen wären ${begriffe.length} Begriffe über DataForSEO,`);
    console.log(`dazu die Search-Console-Anfragen der letzten 90 Tage und der Förderkatalog.`);
    console.log(`Geschätzte Kosten: unter 0,05 $ (Suchvolumen ist ein Sammelaufruf).\n`);
    for (const s of staedte.slice(0, 10)) console.log(`  ${s.name} (${s.ags})`);
    console.log(`  … und ${staedte.length - 10} weitere`);
    return;
  }

  if (!LOGIN || !PASSWORT || !CRON) {
    console.error("Zugangsdaten fehlen (DATAFORSEO_LOGIN/PASSWORD, CRON_SECRET).");
    process.exit(1);
  }

  const vol = await volumen(begriffe);
  const anfragen = await gscAnfragen();
  const mitFoerderseite = new Set(ATLAS_CITIES.map((c) => ortSchluessel(c.ags)));

  type Zeile = Stadt & {
    /** Ist der Ortsname eindeutig? Sonst keine Search-Console-Zahlen. */
    eindeutig: boolean;
    volPv: number | null;
    volSolar: number | null;
    foerderseite: boolean;
    gscEinblendungen: number;
    gscKlicks: number;
    gscBesteSeite: string;
    gscBestePos: number | null;
  };

  // Mehrdeutige Ortsnamen: „Frankfurt (Oder)" wird zu „frankfurt" — und trifft
  // dann die Anfragen von Frankfurt am Main. Im ersten Lauf stand deshalb bei
  // Frankfurt (Oder) eine Förderseite aus HESSEN auf Position 1 mit 142
  // Einblendungen. Solche Städte bekommen keine Search-Console-Zahlen, statt
  // fremde zu erben; das Suchvolumen bleibt (es gilt dem Namen, nicht dem Ort).
  const nameZaehlung = new Map<string, number>();
  for (const s of staedte) nameZaehlung.set(suchName(s.name), (nameZaehlung.get(suchName(s.name)) ?? 0) + 1);

  const zeilen: Zeile[] = staedte.map((s) => {
    const nadel = suchName(s.name);
    const eindeutig = (nameZaehlung.get(nadel) ?? 0) === 1 && !/\(/.test(s.name);
    // Nur Anfragen, die den Ortsnamen als eigenes Wort tragen — "essen" steckt
    // sonst in "essen und trinken", und "Kassel" in "kasseler".
    const treffer = eindeutig
      ? anfragen.filter((a) => new RegExp(`\\b${nadel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(a.query.toLowerCase()))
      : [];
    const einbl = treffer.reduce((n, t) => n + (t.impressions ?? 0), 0);
    const klicks = treffer.reduce((n, t) => n + (t.clicks ?? 0), 0);
    const beste = treffer.slice().sort((a, b) => (a.position ?? 999) - (b.position ?? 999))[0];
    return {
      ...s,
      eindeutig,
      volPv: vol.get(`photovoltaik ${nadel}`) ?? null,
      volSolar: vol.get(`solaranlagen ${nadel}`) ?? null,
      foerderseite: mitFoerderseite.has(ortSchluessel(s.ags)),
      gscEinblendungen: einbl,
      gscKlicks: klicks,
      gscBesteSeite: beste?.page?.replace(BASIS, "") ?? "",
      gscBestePos: beste?.position ?? null,
    };
  });

  const nachfrage = (z: Zeile) => (z.volPv ?? 0) + (z.volSolar ?? 0);
  zeilen.sort((a, b) => nachfrage(b) - nachfrage(a));

  const frei = zeilen.filter((z) => !z.foerderseite);
  const belegt = zeilen.filter((z) => z.foerderseite);
  const mitVolumen = zeilen.filter((z) => nachfrage(z) > 0);

  console.log(`ÜBERBLICK`);
  console.log(`  mit messbarem Suchvolumen: ${mitVolumen.length} von ${zeilen.length}`);
  console.log(`  Summe Suchvolumen aller kreisfreien Städte: ${zeilen.reduce((n, z) => n + nachfrage(z), 0)}/Monat`);
  console.log(`  ohne Förderseite (kollisionsfrei freigebbar): ${frei.length}`);
  console.log(`  MIT Förderseite (Kollisionsrisiko): ${belegt.length}`);
  console.log(`  Einblendungen auf Ortsnamen in 90 Tagen: ${zeilen.reduce((n, z) => n + z.gscEinblendungen, 0)}`);
  console.log(`  davon Klicks: ${zeilen.reduce((n, z) => n + z.gscKlicks, 0)}\n`);

  const kopf = `  ${"Stadt".padEnd(24)} ${"Vol".padStart(5)} ${"Förders.".padEnd(9)} ${"Einbl.".padStart(6)} ${"Kl.".padStart(4)} beste Seite heute`;
  console.log(`OHNE FÖRDERSEITE — nach Nachfrage sortiert:\n${kopf}`);
  for (const z of frei.slice(0, 30)) {
    console.log(
      `  ${z.name.slice(0, 23).padEnd(24)} ${String(nachfrage(z)).padStart(5)} ${"—".padEnd(9)} ` +
        `${String(z.gscEinblendungen).padStart(6)} ${String(z.gscKlicks).padStart(4)} ${z.gscBesteSeite.slice(0, 40)}`,
    );
  }

  console.log(`\nMIT FÖRDERSEITE — hier konkurrieren zwei eigene Seiten:\n${kopf}`);
  for (const z of belegt.slice(0, 30)) {
    console.log(
      `  ${z.name.slice(0, 23).padEnd(24)} ${String(nachfrage(z)).padStart(5)} ${"ja".padEnd(9)} ` +
        `${String(z.gscEinblendungen).padStart(6)} ${String(z.gscKlicks).padStart(4)} ` +
        `${z.gscBesteSeite.slice(0, 40)}${z.gscBestePos ? ` (Pos ${z.gscBestePos.toFixed(0)})` : ""}`,
    );
  }

  console.log(
    `\nVORBEHALT: Ein leeres Suchvolumen heißt „keine Daten", nicht „keine Nachfrage" —\n` +
      `der Dienst meldet unterhalb von 10 Suchen im Monat nichts. Die Einblendungen der\n` +
      `Search Console sind die einzige ungeschätzte Spalte.`,
  );
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
