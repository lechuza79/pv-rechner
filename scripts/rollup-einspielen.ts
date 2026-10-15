/**
 * Spielt den Neuaufbau der Regionssummen ein — mit Sicherung und Nachrechnen.
 *
 *   npx tsx scripts/rollup-einspielen.ts            # einspielen, prüfen, bei Abweichung zurück
 *   npx tsx scripts/rollup-einspielen.ts --trocken  # nur den heutigen Stand zählen
 *
 * WARUM MIT SICHERUNG: Die Funktion leert die Summen und baut sie neu. Geht
 * dabei etwas schief, stehen alle rund 400 Kreis- und 16 Landesseiten ohne
 * Zahlen da — ohne Fehler, ohne roten Test und ohne kaputtes Aussehen, weil
 * eine Seite mit leeren Kacheln aussieht wie eine Seite mit wenig Daten.
 * Deshalb: Kopie anlegen, neu bauen, Zeile für Zeile vergleichen, und bei einer
 * Abweichung die Kopie zurückschreiben, statt sie zu erklären.
 *
 * Der Vergleich prüft nur den DEUTSCHEN Bestand. Ein zweiter Markt bringt
 * zusätzliche Zeilen mit, und die sind kein Befund — eine Prüfung, die jede neue
 * Zeile anmeckert, wird beim ersten Marktstart aufgeweicht.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { MASTR_ROLLUP_SQL, rollupSchrittweise } from "../lib/mastr-rollup-sql";

const TROCKEN = process.argv.includes("--trocken");

type Zeile = {
  region_key: string;
  energietraeger: string;
  segment: string;
  year: number;
  count: number;
  kwp: number;
  kwh: number;
};

/** Seitenweise UND sortiert — sonst kommen Zeilen doppelt und andere nie. */
async function alle(db: SupabaseClient, tabelle: string): Promise<Zeile[]> {
  const out: Zeile[] = [];
  const SEITE = 1000;
  for (let von = 0; ; von += SEITE) {
    const { data, error } = await db
      .from(tabelle)
      .select("region_key, energietraeger, segment, year, count, kwp, kwh")
      .order("region_key")
      .order("energietraeger")
      .order("segment")
      .order("year")
      .range(von, von + SEITE - 1);
    if (error) throw new Error(`${tabelle}: ${error.message}`);
    const z = (data ?? []) as unknown as Zeile[];
    out.push(...z);
    if (z.length < SEITE) break;
  }
  return out;
}

const kennung = (z: Zeile) => `${z.region_key}|${z.energietraeger}|${z.segment}|${z.year}`;
const rund = (n: number) => Math.round(n * 100) / 100;
/** Deutsche Schlüssel sind rein numerisch (der Bund ist der leere String). */
const istDeutsch = (key: string) => key === "" || /^\d+$/.test(key);

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL und SUPABASE_SERVICE_KEY fehlen.");
  const db = createClient(url, key, { auth: { persistSession: false } });
  const sql = async (text: string) => {
    const { error } = await db.rpc("exec_sql", { sql: text });
    if (error) throw new Error(error.message);
  };

  console.log("Lese den heutigen Stand …");
  const vorher = await alle(db, "mastr_region_rollup");
  const vorherDe = vorher.filter((z) => istDeutsch(z.region_key));
  console.log(`  ${vorher.length} Zeilen, davon deutsch ${vorherDe.length}`);
  if (vorherDe.length === 0) throw new Error("Kein deutscher Bestand gefunden — hier wird nichts eingespielt.");

  if (TROCKEN) {
    console.log("--trocken: nichts geändert.");
    return;
  }

  console.log("Lege eine Sicherung an …");
  await sql(`
    SET LOCAL statement_timeout = 0;
    DROP TABLE IF EXISTS mastr_region_rollup_sicherung;
    CREATE TABLE mastr_region_rollup_sicherung AS SELECT * FROM mastr_region_rollup;
    ALTER TABLE mastr_region_rollup_sicherung ENABLE ROW LEVEL SECURITY;
  `);

  console.log("Spiele die Funktionen ein …");
  await sql(MASTR_ROLLUP_SQL);
  // PostgREST kennt eine neue Funktion erst nach dem Schema-Neuladen — ohne das
  // antwortet der Aufruf mit „not found in the schema cache", obwohl sie da ist.
  await sql("NOTIFY pgrst, 'reload schema';");
  await new Promise((r) => setTimeout(r, 4000));

  // SCHRITTWEISE, nicht in einem Aufruf: Das Zeitlimit der Rolle sind acht
  // Sekunden, und es lässt sich von innen nicht aufheben (siehe Kopf von
  // lib/mastr-rollup-sql.ts). Jeder Aufruf hier ist ein eigenes Statement und
  // bekommt seine eigenen acht Sekunden.
  const { data: traeger, error: tFehler } = await db
    .from("mastr_aggregates_gem")
    .select("energietraeger")
    .limit(100_000);
  if (tFehler) throw new Error(`Energieträger lesen: ${tFehler.message}`);
  const liste = [...new Set((traeger ?? []).map((r) => (r as { energietraeger: string }).energietraeger))].sort();
  console.log(`  Energieträger: ${liste.join(", ")}`);
  console.log("Baue neu …");
  await rollupSchrittweise((fn, args) => db.rpc(fn, args ?? {}), liste);

  console.log("Vergleiche den deutschen Bestand …");
  const nachher = await alle(db, "mastr_region_rollup");
  const nachherDe = new Map(nachher.filter((z) => istDeutsch(z.region_key)).map((z) => [kennung(z), z]));
  const verloren: string[] = [];
  const anders: string[] = [];
  for (const a of vorherDe) {
    const b = nachherDe.get(kennung(a));
    if (!b) {
      verloren.push(kennung(a));
      continue;
    }
    if (Number(a.count) !== Number(b.count) || rund(a.kwp) !== rund(b.kwp) || rund(a.kwh) !== rund(b.kwh)) {
      anders.push(`${kennung(a)}: ${a.count}/${rund(a.kwp)}/${rund(a.kwh)} → ${b.count}/${rund(b.kwp)}/${rund(b.kwh)}`);
    }
  }
  const vorherSchluessel = new Set(vorherDe.map(kennung));
  const erfunden = [...nachherDe.keys()].filter((k) => !vorherSchluessel.has(k));
  const neueMaerkte = nachher.filter((z) => !istDeutsch(z.region_key)).length;

  console.log(`\n  verlorene deutsche Zeilen: ${verloren.length}`);
  console.log(`  erfundene deutsche Zeilen: ${erfunden.length}`);
  console.log(`  abweichende Werte:         ${anders.length}`);
  console.log(`  Zeilen anderer Märkte:     ${neueMaerkte}`);
  for (const z of [...verloren.slice(0, 5), ...erfunden.slice(0, 5), ...anders.slice(0, 5)]) console.log(`    · ${z}`);

  if (verloren.length + erfunden.length + anders.length > 0) {
    console.log("\nROT — der deutsche Bestand hat sich bewegt. Ich schreibe die Sicherung zurück.");
    await sql(`
      SET LOCAL statement_timeout = 0;
      TRUNCATE mastr_region_rollup;
      INSERT INTO mastr_region_rollup SELECT * FROM mastr_region_rollup_sicherung;
    `);
    const zurueck = await alle(db, "mastr_region_rollup");
    console.log(`  zurückgeschrieben: ${zurueck.length} Zeilen (vorher ${vorher.length})`);
    process.exit(1);
  }

  console.log("\nGRÜN — der deutsche Bestand ist zeichengleich. Eingespielt.");
  await sql("DROP TABLE IF EXISTS mastr_region_rollup_sicherung;");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
