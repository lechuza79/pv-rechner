/**
 * Measures whether an EXPLICIT parent relation produces the same regional
 * totals as today's PREFIX rule — before any production code relies on it.
 *
 * WHY THIS EXISTS (06.10.2026): The district and state totals of the atlas are
 * built by grouping the municipality key by its first five / first two
 * characters, and the query functions filter by the same prefix. That encodes
 * one assumption: a municipality key starts with its district key. It holds in
 * Germany and does not hold in Switzerland — a Zurich municipality number does
 * not start with its canton number. Supporting a second market therefore means
 * replacing "the child key starts with the parent key" by a membership that is
 * written down.
 *
 * The German numbers must not move by a single digit while that happens, and
 * this script is the proof, not a promise. It is READ ONLY.
 *
 * THE COMPARISON IS INDEPENDENT, AND THAT IS THE WHOLE POINT. The explicit side
 * does not slice the key — it follows `parent_region_id`, which the import
 * writes from the official directory. Deriving both sides from the prefix would
 * compare the assumption with itself; the project has shipped that mistake
 * before (a guard that asserted a constant appears in the module where it is
 * defined).
 *
 * Reports three things, each of which can fail on its own:
 *   1. membership — does the parent link agree with the prefix, per region?
 *   2. totals     — do the sums agree, per region and year and segment?
 *   3. coverage   — is any municipality missing from the directory, or any
 *                   directory entry missing from the aggregates?
 *
 * A disagreement is a finding either way: it means today's totals are wrong
 * somewhere, or the directory is.
 */
import { createClient } from "@supabase/supabase-js";

type Aggregat = {
  region_id: string;
  energietraeger: string;
  segment: string;
  year: number;
  count: number;
  kwp: number;
  kwh: number | null;
};

type Region = { region_id: string; parent_region_id: string | null; level: string; name: string };

type Summe = { count: number; kwp: number };

const ausfuehrlich = process.argv.includes("--alle");

/** Die Zelle, über die verglichen wird — Träger, Segment und Jahr bleiben getrennt. */
function zelle(a: Pick<Aggregat, "energietraeger" | "segment" | "year">): string {
  return `${a.energietraeger}|${a.segment}|${a.year}`;
}

function addiere(ziel: Map<string, Summe>, schluessel: string, a: Aggregat): void {
  const vorher = ziel.get(schluessel) ?? { count: 0, kwp: 0 };
  ziel.set(schluessel, { count: vorher.count + a.count, kwp: vorher.kwp + a.kwp });
}

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL und SUPABASE_SERVICE_KEY fehlen.");
  const db = createClient(url, key, { auth: { persistSession: false } });

  /**
   * Seitenweise UND sortiert lesen.
   *
   * Postgres darf die Zeilenfolge zwischen zwei Abfragen ändern; über
   * Seitengrenzen hinweg kämen dann Zeilen doppelt und andere gar nicht. Und ein
   * Abruf ohne Paginierung liefert stumm nur die ersten 1.000 Zeilen — bei
   * 591.000 Aggregatzeilen wäre das Ergebnis eine Teilsumme, die wie ein Befund
   * aussieht. Beides ist in diesem Projekt schon einmal passiert.
   */
  async function alleZeilen<T>(tabelle: string, spalten: string, sortierSpalten: string[]): Promise<T[]> {
    const out: T[] = [];
    const SEITE = 1000;
    for (let von = 0; ; von += SEITE) {
      let q = db.from(tabelle).select(spalten);
      for (const s of sortierSpalten) q = q.order(s, { ascending: true });
      const { data, error } = await q.range(von, von + SEITE - 1);
      if (error) throw new Error(`${tabelle}: ${error.message}`);
      const zeilen = (data ?? []) as unknown as T[];
      out.push(...zeilen);
      if (zeilen.length < SEITE) break;
    }
    return out;
  }


  console.log("Lese Regionen-Verzeichnis …");
  const regionen = await alleZeilen<Region>(
    "mastr_regions",
    "region_id, parent_region_id, level, name",
    ["region_id"],
  );
  const elternVon = new Map(regionen.map((r) => [r.region_id, r.parent_region_id]));
  const nameVon = new Map(regionen.map((r) => [r.region_id, r.name]));
  console.log(`  ${regionen.length} Regionen`);

  console.log("Lese Gemeinde-Aggregate …");
  const aggregate = await alleZeilen<Aggregat>(
    "mastr_aggregates_gem",
    "region_id, energietraeger, segment, year, count, kwp, kwh",
    ["region_id", "energietraeger", "segment", "year"],
  );
  console.log(`  ${aggregate.length} Aggregatzeilen`);

  // ── 1. Zugehörigkeit: sagt die Elternbeziehung dasselbe wie das Präfix? ────
  const orte = [...new Set(aggregate.map((a) => a.region_id))].sort();
  const abweichend: string[] = [];
  const ohneVerzeichnis: string[] = [];
  for (const ort of orte) {
    if (!elternVon.has(ort)) {
      ohneVerzeichnis.push(ort);
      continue;
    }
    const ausPraefix = ort.length > 5 ? ort.slice(0, 5) : ort.length > 2 ? ort.slice(0, 2) : "";
    const ausEltern = elternVon.get(ort) ?? "";
    // "de" ist der Bundes-Elternteil der Länder; das Präfix ist dort leer.
    const vergleichbar = ausEltern === "de" ? "" : ausEltern;
    if (ausPraefix !== vergleichbar) {
      abweichend.push(`${ort} (${nameVon.get(ort) ?? "?"}): Präfix ${ausPraefix || "—"} ≠ Elternteil ${ausEltern || "—"}`);
    }
  }

  // ── 2. Summen: beide Mechanismen über dieselben Aggregate ──────────────────
  const perPraefix = new Map<string, Summe>();
  const perEltern = new Map<string, Summe>();
  for (const a of aggregate) {
    const z = zelle(a);
    // heutiger Mechanismus
    if (a.region_id.length >= 5) addiere(perPraefix, `${a.region_id.slice(0, 5)}#${z}`, a);
    if (a.region_id.length >= 2) addiere(perPraefix, `${a.region_id.slice(0, 2)}#${z}`, a);
    addiere(perPraefix, `#${z}`, a);
    // ausgeschriebene Zugehörigkeit: der Kette der Elternteile folgen
    let cursor: string | null = elternVon.get(a.region_id) ?? null;
    const gesehen = new Set<string>();
    while (cursor && !gesehen.has(cursor)) {
      gesehen.add(cursor);
      addiere(perEltern, `${cursor === "de" ? "" : cursor}#${z}`, a);
      cursor = elternVon.get(cursor) ?? null;
    }
  }

  const schluessel = [...new Set([...perPraefix.keys(), ...perEltern.keys()])].sort();
  const summenAbweichung: string[] = [];
  for (const s of schluessel) {
    const p = perPraefix.get(s);
    const e = perEltern.get(s);
    const pc = p?.count ?? 0;
    const ec = e?.count ?? 0;
    const pk = Math.round((p?.kwp ?? 0) * 100) / 100;
    const ek = Math.round((e?.kwp ?? 0) * 100) / 100;
    if (pc !== ec || Math.abs(pk - ek) > 0.01) {
      const [region, rest] = s.split("#");
      summenAbweichung.push(
        `${region || "Bund"} ${rest}: Präfix ${pc}/${pk} kWp ≠ Zugehörigkeit ${ec}/${ek} kWp`,
      );
    }
  }

  // ── 3. Abdeckung ───────────────────────────────────────────────────────────
  const imVerzeichnisOhneAggregat = regionen
    .filter((r) => r.level === "gemeinde" && !orte.includes(r.region_id))
    .map((r) => `${r.region_id} (${r.name})`);

  // ── Bericht ────────────────────────────────────────────────────────────────
  const zeige = (titel: string, liste: string[], grenze = 15) => {
    console.log(`\n${titel}: ${liste.length}`);
    const n = ausfuehrlich ? liste.length : grenze;
    for (const z of liste.slice(0, n)) console.log(`  · ${z}`);
    if (liste.length > n) console.log(`  … ${liste.length - n} weitere (--alle zeigt alle)`);
  };

  console.log(`\n${"─".repeat(70)}`);
  console.log(`Orte mit Aggregaten: ${orte.length} · verglichene Zellen: ${schluessel.length}`);
  zeige("Zugehörigkeit weicht vom Präfix ab", abweichend);
  zeige("Orte ohne Eintrag im Verzeichnis", ohneVerzeichnis);
  zeige("Verzeichnis-Gemeinden ohne eine einzige Anlage", imVerzeichnisOhneAggregat);
  zeige("Summen weichen ab", summenAbweichung);

  const blockierend = abweichend.length + summenAbweichung.length;
  console.log(`\n${"─".repeat(70)}`);
  if (blockierend === 0) {
    console.log("GRÜN — die ausgeschriebene Zugehörigkeit liefert dieselben Zahlen wie das Präfix.");
    console.log("Der Umbau darf beginnen; diese Messung ist danach erneut zu fahren.");
  } else {
    console.log(`ROT — ${blockierend} Abweichungen. Der Umbau ist NICHT freigegeben.`);
    console.log("Jede Abweichung ist ein Befund: entweder stimmen die heutigen Summen nicht,");
    console.log("oder das Verzeichnis. Beides gehört geklärt, bevor etwas umgestellt wird.");
  }
  // Orte ohne Verzeichnis-Eintrag sind kein Blocker, aber genannt: Sie zählen
  // heute über das Präfix mit und würden bei ausgeschriebener Zugehörigkeit
  // herausfallen — genau die stille Lücke, die diese Messung finden soll.
  if (ohneVerzeichnis.length > 0) {
    console.log(`\nACHTUNG: ${ohneVerzeichnis.length} Orte zählen heute nur über das Präfix mit.`);
    console.log("Ohne Verzeichnis-Eintrag verlieren sie ihre Zuordnung beim Umbau.");
  }
  process.exit(blockierend === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
