/**
 * Hält die Kindermengen BEIDER Regeln über den GANZEN Bestand gegeneinander,
 * bevor eine Atlas-Seite auf die neue Regel umgestellt wird. READ ONLY.
 *
 * WARUM (06.10.2026): Die Atlas-Funktionen beantworteten „welche Kinder hat
 * diese Region" über die Zeichenlänge des Schlüssels — zwei Stellen Land, fünf
 * Kreis, acht Gemeinde — und „welche gehören darunter" über den gemeinsamen
 * Anfang. Das ist eine Eigenschaft des deutschen Gemeindeschlüssels, keine der
 * Sache: Eine Zürcher Gemeindenummer beginnt nicht mit der ihres Kantons, und
 * sie ist nicht fest sechsstellig — ein Anfangsvergleich auf „1" träfe dort 12,
 * 100 und 1234 mit. Für einen zweiten Markt muss die Hierarchie also aus dem
 * Verzeichnis kommen, nicht aus der Schreibweise.
 *
 * Die deutschen Seiten dürfen sich dabei um kein einziges Kind verschieben, und
 * dieses Skript ist der Beleg, nicht die Zusage.
 *
 * DER VERGLEICH IST UNABHÄNGIG. Die eine Seite schneidet den Schlüssel ab, die
 * andere folgt `parent_region_id`, das der Import aus dem amtlichen Verzeichnis
 * schreibt. Beide aus derselben Quelle abzuleiten hieße, die Annahme mit sich
 * selbst zu vergleichen — dieser Fehler ist in diesem Projekt schon einmal
 * ausgeliefert worden.
 *
 * Verglichen werden drei Ebenen in einem Durchgang:
 *   Bund   → Länder      (Länge 2)
 *   Land   → Kreise      (Länge 5, gemeinsamer Anfang)
 *   Kreis  → Gemeinden   (Länge 8, gemeinsamer Anfang)
 *
 * Eine Abweichung ist in beide Richtungen ein Befund: ein Kind, das die heutigen
 * Seiten zeigen und das Verzeichnis nicht kennt — oder umgekehrt eines, das
 * nach dem Umbau zusätzlich erscheinen würde.
 *
 *   npx tsx scripts/region-kinder-messen.ts            # vergleichen
 *   npx tsx scripts/region-kinder-messen.ts --alle      # alle Abweichungen zeigen
 *   npx tsx scripts/region-kinder-messen.ts --sabotage  # Gegenprobe: muss ROT werden
 */
import { createClient } from "@supabase/supabase-js";

const ausfuehrlich = process.argv.includes("--alle");
/**
 * Die Gegenprobe zum Netz selbst: leitet die Kreise absichtlich aus EINER
 * Stelle statt zwei ab. Wird der Lauf damit nicht rot, prüft er nichts — und
 * ein Netz, dessen Maschen man nicht nachzählt, ist eine Zusage.
 */
const sabotage = process.argv.includes("--sabotage");

type Paar = { eltern: string; kind: string; in_laenge: boolean; in_verzeichnis: boolean };

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL und SUPABASE_SERVICE_KEY fehlen.");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const sql = async (text: string) => {
    const { error } = await db.rpc("exec_sql", { sql: text });
    if (error) throw new Error(error.message);
  };

  const landStellen = sabotage ? 1 : 2;

  // Gerechnet wird IN der Datenbank: es geht um 596.000 Aggregatzeilen und
  // 65.000 Rollup-Schlüssel, die über die Leitung zu ziehen wäre Verschwendung.
  // Das Ergebnis ist bewusst nur die DIFFERENZ — stimmt alles, kommt nichts.
  await sql(`
    SET LOCAL statement_timeout = 0;
    DROP TABLE IF EXISTS mastr_kinder_vergleich;
    CREATE TABLE mastr_kinder_vergleich AS
    WITH schluessel AS (SELECT DISTINCT region_key FROM mastr_region_rollup),
    orte AS (SELECT DISTINCT region_id FROM mastr_aggregates_gem),
    nach_laenge AS (
      SELECT '' AS eltern, region_key AS kind FROM schluessel WHERE length(region_key) = 2
      UNION ALL
      SELECT left(region_key, ${landStellen}), region_key FROM schluessel WHERE length(region_key) = 5
      UNION ALL
      SELECT left(region_id, 5), region_id FROM orte
    ),
    nach_verzeichnis AS (
      -- 'de' ist der Bundes-Elternteil des Verzeichnisses; der Bundes-Schlüssel
      -- der Atlas-Funktionen ist der leere String. Hier vergleichbar gemacht.
      SELECT CASE WHEN r.parent_region_id = 'de' THEN '' ELSE r.parent_region_id END AS eltern,
             r.region_id AS kind
        FROM mastr_regions r
       WHERE r.parent_region_id IS NOT NULL
         AND (r.region_id IN (SELECT region_key FROM schluessel)
              OR r.region_id IN (SELECT region_id FROM orte))
    )
    SELECT coalesce(a.eltern, b.eltern) AS eltern,
           coalesce(a.kind, b.kind) AS kind,
           (a.kind IS NOT NULL) AS in_laenge,
           (b.kind IS NOT NULL) AS in_verzeichnis
      FROM (SELECT DISTINCT eltern, kind FROM nach_laenge) a
      FULL OUTER JOIN (SELECT DISTINCT eltern, kind FROM nach_verzeichnis) b
        ON a.eltern = b.eltern AND a.kind = b.kind
     WHERE a.kind IS NULL OR b.kind IS NULL;
    ALTER TABLE mastr_kinder_vergleich ENABLE ROW LEVEL SECURITY;
    NOTIFY pgrst, 'reload schema';
  `);
  // PostgREST kennt eine frische Tabelle erst nach dem Schema-Neuladen.
  await new Promise((r) => setTimeout(r, 4000));

  const { data, error, count } = await db
    .from("mastr_kinder_vergleich")
    .select("*", { count: "exact" })
    .order("eltern")
    .order("kind")
    .limit(ausfuehrlich ? 5000 : 25);
  if (error) throw new Error(`Vergleich lesen: ${error.message}`);
  const paare = (data ?? []) as unknown as Paar[];

  console.log(`${"─".repeat(70)}`);
  if (sabotage) console.log("SABOTAGE aktiv: Kreise aus einer Stelle statt zwei.\n");
  console.log(`Abweichende Eltern-Kind-Paare: ${count}`);
  for (const p of paare) {
    console.log(
      `  · ${p.eltern || "BUND"} → ${p.kind}   nur nach ${p.in_laenge ? "Länge/Anfang" : "Verzeichnis"}`,
    );
  }
  if ((count ?? 0) > paare.length) {
    console.log(`  … ${(count ?? 0) - paare.length} weitere (--alle zeigt alle)`);
  }

  await sql("DROP TABLE IF EXISTS mastr_kinder_vergleich; NOTIFY pgrst, 'reload schema';");

  console.log(`\n${"─".repeat(70)}`);
  if (sabotage) {
    if ((count ?? 0) > 0) {
      console.log("Gegenprobe bestanden: die Sabotage wurde erkannt.");
      process.exit(0);
    }
    console.log("GEGENPROBE GESCHEITERT — der Vergleich sieht nichts und meldet trotzdem grün.");
    process.exit(1);
  }
  if ((count ?? 0) === 0) {
    console.log("GRÜN — das Verzeichnis liefert genau dieselben Kinder wie Länge und Anfang.");
    process.exit(0);
  }
  console.log(`ROT — ${count} Abweichungen. Die Umstellung ist NICHT freigegeben.`);
  console.log("Jede ist ein Befund: entweder zeigen die heutigen Seiten ein Kind zu viel,");
  console.log("oder das Verzeichnis kennt eines nicht. Beides gehört geklärt.");
  process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
