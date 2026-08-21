/**
 * Die Ask-Variante eines festgeschriebenen Schubs neu berechnen.
 *
 * WOZU: `ask_variante` wird beim Festschreiben des Schubs gespeichert, und der
 * Brief benutzt den gespeicherten Wert. Ändert sich die Regel danach
 * (`WIDGET_AB_EINWOHNER`), bekämen die schon eingeplanten Gemeinden weiterhin
 * die alte Fassung — die Regel im Code und die Zuordnung in der Datenbank
 * liefen auseinander, ohne dass irgendwo etwas rot würde.
 *
 * DREI SCHRANKEN, jede gegen einen Schaden, den man nicht zurücknehmen kann:
 *   - Wer schon angeschrieben ist (`versendet_variante` gesetzt), bleibt
 *     unangetastet. Sonst stünde in der Auswertung eine Fassung, die nie
 *     verschickt wurde.
 *   - Von Hand gesetzte Zuordnungen (`variante_manuell`) gewinnen immer.
 *   - Ohne `--schreiben` wird nur gezeigt, was sich ändern würde.
 *
 *   npx tsx scripts/kommunen-variante-neu.ts [--schub=…] [--schreiben]
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { askVariante, ASK_LABEL, type AskVariante } from "../lib/kommunen-ask";
import { AKTUELLER_SCHUB, SCHUEBE } from "../lib/kommunen-testballon";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(): void {
  const p = resolve(SCRIPT_DIR, "..", ".env.local");
  if (!existsSync(p)) return;
  for (const zeile of readFileSync(p, "utf-8").split("\n")) {
    const m = zeile.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const arg = (name: string): string | undefined =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const hat = (name: string) => process.argv.includes(`--${name}`);

async function main(): Promise<void> {
  loadEnvFile();
  const schub = arg("schub") ?? AKTUELLER_SCHUB;
  if (!SCHUEBE[schub]) throw new Error(`Unbekannter Schub „${schub}".`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL/SUPABASE_SERVICE_KEY fehlen.");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await db
    .from("kommunen_kontakt")
    .select(
      "region_id, charge, ask_variante, variante_manuell, versendet_variante, verantwortlich_operativ, mastr_regions!inner(name, population)",
    )
    .eq("kampagne", schub);
  if (error) throw new Error(`Konnte den Schub nicht lesen: ${error.message}`);

  const zeilen = (data ?? []) as unknown as {
    region_id: string;
    charge: number | null;
    ask_variante: AskVariante | null;
    variante_manuell: boolean | null;
    versendet_variante: string | null;
    verantwortlich_operativ: boolean | null;
    mastr_regions: { name: string; population: number | null };
  }[];

  const aenderungen = zeilen
    .filter((z) => !z.versendet_variante && !z.variante_manuell)
    .map((z) => ({
      z,
      neu: askVariante({ population: z.mastr_regions.population, operativeStelle: !!z.verantwortlich_operativ }),
    }))
    .filter((x) => x.neu !== x.z.ask_variante);

  const gesperrt = zeilen.filter((z) => z.versendet_variante).length;
  const vonHand = zeilen.filter((z) => !z.versendet_variante && z.variante_manuell).length;

  // eslint-disable-next-line no-console
  const log = console.log;
  log(`Schub ${schub}: ${zeilen.length} Gemeinden, davon ${gesperrt} bereits angeschrieben, ${vonHand} von Hand gesetzt.`);
  log(`${aenderungen.length} Zuordnungen würden sich ändern:`);
  for (const { z, neu } of aenderungen.sort((a, b) => (a.z.charge ?? 0) - (b.z.charge ?? 0))) {
    log(
      `  Charge ${z.charge ?? "-"}  ${z.mastr_regions.name.padEnd(22)} ${String(z.mastr_regions.population ?? "?").padStart(7)} EW  ` +
        `${ASK_LABEL[z.ask_variante ?? "nur_meldung"]} → ${ASK_LABEL[neu]}`,
    );
  }

  if (!hat("schreiben")) {
    log("");
    log("Nichts geschrieben. Zum Übernehmen: --schreiben");
    return;
  }

  let geschrieben = 0;
  for (const { z, neu } of aenderungen) {
    const { error: e } = await db
      .from("kommunen_kontakt")
      .update({ ask_variante: neu, updated_at: new Date().toISOString() })
      .eq("region_id", z.region_id)
      .is("versendet_variante", null); // zweite Sicherung direkt an der Schreibung
    if (e) throw new Error(`${z.mastr_regions.name}: ${e.message}`);
    geschrieben += 1;
  }
  log(`✓ ${geschrieben} ${geschrieben === 1 ? "Zuordnung" : "Zuordnungen"} übernommen`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
