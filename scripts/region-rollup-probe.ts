/**
 * Baut die neuen Regionssummen in eine SCHATTENTABELLE und hält sie Zeile für
 * Zeile gegen die laufenden — ohne die laufenden anzufassen.
 *
 * WARUM NICHT EINFACH NEU BAUEN (06.10.2026): Der Neuaufbau leert die Tabelle
 * zuerst. Geht dabei etwas schief, stehen alle ~400 Kreis- und 16 Landesseiten
 * ohne Zahlen da — und zwar ohne Fehler, ohne roten Test und ohne kaputtes
 * Aussehen, weil eine Seite mit leeren Kacheln aussieht wie eine Seite mit
 * wenig Daten. Deshalb erst vergleichen, dann tauschen.
 *
 * Der Vergleich ist in der Richtung streng, die zählt: Jede Zelle muss auf
 * beiden Seiten existieren UND denselben Wert tragen. Eine Zeile, die nur in
 * einer der beiden steht, ist ein Befund — in der einen Richtung ein verlorener
 * Ort, in der anderen eine erfundene Summe.
 *
 * READ ONLY auf den Produktivdaten: Angelegt und befüllt wird ausschließlich
 * die Zugehörigkeit (neu, von niemandem gelesen) und die Schattentabelle.
 */
import { createClient } from "@supabase/supabase-js";

const schreiben = process.argv.includes("--tauschen");
const ausfuehrlich = process.argv.includes("--alle");

type Zeile = {
  region_key: string;
  energietraeger: string;
  segment: string;
  year: number;
  count: number;
  kwp: number;
  kwh: number;
};

function kennung(z: Zeile): string {
  return `${z.region_key}|${z.energietraeger}|${z.segment}|${z.year}`;
}

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL und SUPABASE_SERVICE_KEY fehlen.");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const sql = async (text: string) => {
    const { error } = await db.rpc("exec_sql", { sql: text });
    if (error) throw new Error(error.message);
  };

  /** Seitenweise UND sortiert — sonst kommen Zeilen doppelt und andere nie. */
  async function alle(tabelle: string): Promise<Zeile[]> {
    const out: Zeile[] = [];
    const SEITE = 1000;
    for (let von = 0; ; von += SEITE) {
      const { data, error } = await db
        .from(tabelle)
        .select("region_key, energietraeger, segment, year, count, kwp, kwh")
        .order("region_key", { ascending: true })
        .order("energietraeger", { ascending: true })
        .order("segment", { ascending: true })
        .order("year", { ascending: true })
        .range(von, von + SEITE - 1);
      if (error) throw new Error(`${tabelle}: ${error.message}`);
      const z = (data ?? []) as unknown as Zeile[];
      out.push(...z);
      if (z.length < SEITE) break;
    }
    return out;
  }

  console.log("Lege Zugehörigkeit und Schattentabelle an …");
  await sql(`
    CREATE TABLE IF NOT EXISTS mastr_region_mitglied (
      region_key text NOT NULL,
      gemeinde_id text NOT NULL,
      PRIMARY KEY (region_key, gemeinde_id)
    );
    CREATE INDEX IF NOT EXISTS idx_mrm_gemeinde ON mastr_region_mitglied (gemeinde_id);
    ALTER TABLE mastr_region_mitglied ENABLE ROW LEVEL SECURITY;
    CREATE TABLE IF NOT EXISTS mastr_region_rollup_probe (
      LIKE mastr_region_rollup INCLUDING ALL
    );
    ALTER TABLE mastr_region_rollup_probe ENABLE ROW LEVEL SECURITY;
  `);

  console.log("Erzeuge die Zugehörigkeit aus der heutigen Stellenlogik …");
  await sql(`
    SET LOCAL statement_timeout = 0;
    TRUNCATE mastr_region_mitglied;
    INSERT INTO mastr_region_mitglied (region_key, gemeinde_id)
    SELECT DISTINCT left(region_id,5), region_id FROM mastr_aggregates_gem
    UNION
    SELECT DISTINCT left(region_id,2), region_id FROM mastr_aggregates_gem
    UNION
    SELECT DISTINCT '', region_id FROM mastr_aggregates_gem;
  `);

  console.log("Baue die Summen über den Verbund in die Schattentabelle …");
  const t0 = Date.now();
  await sql(`
    SET LOCAL statement_timeout = 0;
    TRUNCATE mastr_region_rollup_probe;
    INSERT INTO mastr_region_rollup_probe (region_key, energietraeger, segment, year, count, kwp, kwh)
    SELECT m.region_key, a.energietraeger, a.segment, a.year,
           sum(a.count)::bigint, sum(a.kwp), sum(a.kwh)
      FROM mastr_aggregates_gem a
      JOIN mastr_region_mitglied m ON m.gemeinde_id = a.region_id
     GROUP BY 1,2,3,4;
  `);
  const bauMs = Date.now() - t0;
  console.log(`  ${(bauMs / 1000).toFixed(1)} s`);

  console.log("Vergleiche Zeile für Zeile …");
  const [live, probe] = await Promise.all([alle("mastr_region_rollup"), alle("mastr_region_rollup_probe")]);
  const liveMap = new Map(live.map((z) => [kennung(z), z]));
  const probeMap = new Map(probe.map((z) => [kennung(z), z]));

  const nurLive: string[] = [];
  const nurProbe: string[] = [];
  const abweichend: string[] = [];
  const rund = (n: number) => Math.round(n * 100) / 100;

  for (const [k, l] of liveMap) {
    const p = probeMap.get(k);
    if (!p) {
      nurLive.push(k);
      continue;
    }
    if (Number(l.count) !== Number(p.count) || rund(l.kwp) !== rund(p.kwp) || rund(l.kwh) !== rund(p.kwh)) {
      abweichend.push(
        `${k}: laufend ${l.count}/${rund(l.kwp)}/${rund(l.kwh)} ≠ neu ${p.count}/${rund(p.kwp)}/${rund(p.kwh)}`,
      );
    }
  }
  for (const k of probeMap.keys()) if (!liveMap.has(k)) nurProbe.push(k);

  const zeige = (titel: string, liste: string[]) => {
    console.log(`\n${titel}: ${liste.length}`);
    const n = ausfuehrlich ? liste.length : 10;
    for (const z of liste.slice(0, n)) console.log(`  · ${z}`);
    if (liste.length > n) console.log(`  … ${liste.length - n} weitere (--alle zeigt alle)`);
  };

  console.log(`\n${"─".repeat(70)}`);
  console.log(`laufende Zeilen: ${live.length} · neue Zeilen: ${probe.length}`);
  zeige("nur in den laufenden Summen (verlorene Zeile)", nurLive);
  zeige("nur in den neuen Summen (erfundene Zeile)", nurProbe);
  zeige("Wert weicht ab", abweichend);

  const befunde = nurLive.length + nurProbe.length + abweichend.length;
  console.log(`\n${"─".repeat(70)}`);
  if (befunde > 0) {
    console.log(`ROT — ${befunde} Befunde. Es wird nichts getauscht.`);
    process.exit(1);
  }
  console.log("GRÜN — die neuen Summen sind zeichengleich mit den laufenden.");

  if (!schreiben) {
    console.log("Nichts getauscht (Probelauf). Mit --tauschen wird die Füllung umgestellt.");
    return;
  }

  // Getauscht wird die FÜLLUNG, nicht die Tabelle: Die laufenden Summen werden
  // aus derselben Quelle neu gebaut, die der Vergleich gerade bestätigt hat.
  // Ein Tabellentausch (RENAME) würde Rechte, Policies und Fremdbezüge
  // mitnehmen, und das ist mehr Bewegung als nötig.
  console.log("Baue die laufenden Summen aus der Zugehörigkeit neu …");
  await sql(`
    SET LOCAL statement_timeout = 0;
    TRUNCATE mastr_region_rollup;
    INSERT INTO mastr_region_rollup (region_key, energietraeger, segment, year, count, kwp, kwh)
    SELECT region_key, energietraeger, segment, year, count, kwp, kwh
      FROM mastr_region_rollup_probe;
  `);
  const nachher = await alle("mastr_region_rollup");
  console.log(`  ${nachher.length} Zeilen — vorher ${live.length}`);
  if (nachher.length !== probe.length) {
    throw new Error("Zeilenzahl nach dem Tausch weicht ab — sofort nachsehen.");
  }
  console.log("Getauscht und nachgezählt.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
