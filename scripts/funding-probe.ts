/**
 * Prüfstand der Förderprogramme — Buchführung über das, was wirklich an der
 * Amtsquelle gelesen wurde.
 *
 *   npm run foerder:probe -- --vorrat
 *   npm run foerder:probe -- --ok frankfurt-klimabonus --wie traeger --url https://… --zitat "…"
 *   npm run foerder:probe -- --fehl frankfurt-klimabonus --wie pruefseite
 *
 * WARUM (16.08.2026): Der Wächter-Auftrag verlangte „merke dir, welche Programme
 * du nur sekundär belegen konntest, und arbeite sie in den Folgeläufen ab" — eine
 * Anweisung, die kein Lauf befolgen kann, weil jeder Lauf bei null anfängt. Die
 * Protokolltabelle dafür (`funding_checks`) existiert seit Juli und wurde nie
 * beschrieben. Dieses Skript ist die Schreibseite, lib/funding-verify-state.ts
 * die Leseseite; die Reihenfolge-, Fälligkeits- und Eskalationsregeln stehen dort
 * EINMAL und sind dort von Tests festgenagelt — hier wird nichts nachformuliert.
 *
 * Absichtlich NICHT in diesem Skript: das Umstellen eines Programm-Status. Der
 * Status lebt im Code-Seed (lib/funding-programs.ts) und wird von dort in die
 * Datenbank gespiegelt; ein Skript, das ihn direkt in der Datenbank dreht, würde
 * beim nächsten Resync stillschweigend überschrieben. Die Eskalation wird deshalb
 * ausgegeben, nicht ausgeführt — der Wächter ändert den Seed wie bei jedem
 * anderen Befund auch.
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  arbeitsvorrat,
  eskalationsVorschlag,
  pruefstandFuer,
  zaehltAlsGeprueft,
  type Erreichbarkeit,
  type PruefVersuch,
  type SeitenAenderung,
} from "../lib/funding-verify-state";
import type { FundingProgram } from "../lib/funding-programs";
import { heuteInBerlin } from "../lib/zeit";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(): void {
  const envPath = resolve(SCRIPT_DIR, "..", ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvFile();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen (.env.local).");
  process.exit(1);
}
const sb = createClient(url, key);

const ERREICHBARKEITEN: Erreichbarkeit[] = ["traeger", "archiv", "sekundaer", "pruefseite", "gesperrt"];

/**
 * Wert eines Schalters — alle Wörter bis zum nächsten Schalter.
 *
 * Bewusst nicht nur `argv[i + 1]`: `npm run … -- --zitat "ein ganzer Satz"`
 * zerlegt den Satz wieder in einzelne Argumente, und ein Zitat, das nach dem
 * ersten Wort abbricht, ist als Beleg wertlos — genau das ist beim ersten
 * scharfen Aufruf passiert.
 */
function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const rest: string[] = [];
  for (let j = i + 1; j < process.argv.length && !process.argv[j].startsWith("--"); j++) {
    rest.push(process.argv[j]);
  }
  return rest.length ? rest.join(" ") : undefined;
}

// Der DEUTSCHE Kalendertag. Dieses Datum wird als „Zuletzt geprüft" auf jeder
// Förderseite ausgegeben, also als Kalendertag gelesen. Über `toISOString()`
// gemessen lag es zwischen 00:00 und 02:00 deutscher Sommerzeit einen Tag
// zurück — ein Wächter-Lauf kurz nach Mitternacht hätte den Vortag gestempelt
// und die Prüfung damit um einen Tag älter aussehen lassen, als sie ist.
const heute = heuteInBerlin();

async function ladeProgramme(): Promise<FundingProgram[]> {
  const { data, error } = await sb.from("funding_programs").select("id, data, last_verified, archived");
  if (error) throw new Error(`Programme nicht lesbar: ${error.message}`);
  return (data ?? [])
    .filter((r) => !r.archived)
    .map((r) => ({ ...(r.data as FundingProgram), id: r.id, lastVerified: r.last_verified ?? undefined }));
}

async function ladeVersuche(): Promise<PruefVersuch[]> {
  // `source` trägt die Erreichbarkeit — die Spalte gibt es seit der Anlage der
  // Tabelle, sie war nur nie befüllt. Zeilen ohne bekannte Erreichbarkeit
  // (Altbestand, manuelle Einträge) werden übergangen statt geraten.
  const { data, error } = await sb
    .from("funding_checks")
    .select("program_id, checked_at, source")
    .order("checked_at", { ascending: true });
  if (error) throw new Error(`Prüfprotokoll nicht lesbar: ${error.message}`);
  return (data ?? [])
    .filter((r): r is { program_id: string; checked_at: string; source: Erreichbarkeit } =>
      ERREICHBARKEITEN.includes(r.source as Erreichbarkeit))
    .map((r) => ({ programId: r.program_id, checkedAt: r.checked_at, erreichbarkeit: r.source }));
}

/**
 * Meldungen des Seiten-Wächters: welche Amtsseite hat sich bewegt oder war für
 * den maschinellen Abruf zu.
 *
 * Beide machen fällig, aber KEINES zählt als Fehlversuch — der Crawler fährt die
 * Eskalationsleiter nicht (kein echter Browser, kein Archiv). Aus dem
 * Rechenzentrum sperren mehr Städte als von einem Wohnanschluss; würde das als
 * Fehlversuch zählen, schaltete der Crawler binnen drei Tagen Programme ab, die
 * ein Browser problemlos liest.
 */
async function ladeAenderungen(): Promise<SeitenAenderung[]> {
  const { data, error } = await sb
    .from("funding_checks")
    .select("program_id, checked_at, source")
    .in("source", ["seite-geaendert", "seite-unerreichbar"])
    .order("checked_at", { ascending: true });
  if (error) throw new Error(`Änderungsmeldungen nicht lesbar: ${error.message}`);
  return (data ?? []).map((r) => ({
    programId: r.program_id,
    changedAt: r.checked_at,
    art: r.source === "seite-geaendert" ? ("geaendert" as const) : ("unerreichbar" as const),
  }));
}

async function zeigeVorrat(): Promise<void> {
  const [programme, versuche, aenderungen] = await Promise.all([
    ladeProgramme(),
    ladeVersuche(),
    ladeAenderungen(),
  ]);
  const vorrat = arbeitsvorrat(programme, versuche, heute, aenderungen);
  const nachId = new Map(programme.map((p) => [p.id, p]));

  if (!vorrat.length) {
    console.log("Arbeitsvorrat leer — jedes Programm war innerhalb des Prüfintervalls an seiner Amtsquelle.");
    return;
  }

  console.log(`Arbeitsvorrat (${vorrat.length}), oben zuerst prüfen:\n`);
  for (const s of vorrat) {
    const p = nachId.get(s.programId);
    const alter = Number.isFinite(s.tageSeitQuellenpruefung) ? `${s.tageSeitQuellenpruefung} Tage` : "nie geprüft";
    const haengt = s.fehlversuche ? `, ${s.fehlversuche}× nicht rangekommen` : "";
    const bewegt = s.seiteGeaendert
      ? "  ⟵ AMTSSEITE HAT SICH GEÄNDERT"
      : s.seiteUnerreichbar
        ? "  ⟵ Abruf kam nicht durch (Browser nötig)"
        : "";
    console.log(`  ${p?.name ?? s.programId} (${p?.region ?? "?"}) — ${alter}${haengt}${bewegt}`);
    if (p) {
      const e = eskalationsVorschlag(p, s);
      if (e) console.log(`    → ESKALATION: Status auf "${e.statusNeu}" setzen. ${e.entscheidung}`);
    }
  }
}

async function protokolliere(programId: string, erreichbarkeit: Erreichbarkeit): Promise<void> {
  if (!ERREICHBARKEITEN.includes(erreichbarkeit)) {
    console.error(`--wie muss eines von ${ERREICHBARKEITEN.join(" | ")} sein.`);
    process.exit(1);
  }

  const programme = await ladeProgramme();
  const program = programme.find((p) => p.id === programId);
  if (!program) {
    console.error(`Unbekanntes Programm: ${programId}`);
    process.exit(1);
  }

  const { error } = await sb.from("funding_checks").insert({
    program_id: programId,
    verdict: flag("verdikt") ?? (zaehltAlsGeprueft(erreichbarkeit) ? "MATCH" : "UNREACHABLE"),
    source: erreichbarkeit,
    note: flag("notiz") ?? flag("url") ?? null,
    found: flag("zitat") ? { zitat: flag("zitat"), url: flag("url") ?? null } : null,
  });
  if (error) {
    console.error(`Protokolleintrag fehlgeschlagen: ${error.message}`);
    process.exit(1);
  }

  // Nur der Blick auf die Amtsquelle setzt das Datum, das auf den Seiten als
  // "Zuletzt geprüft" steht. Ein Archiv-Stand belegt den Inhalt von damals, nicht
  // dass die Förderung heute noch läuft — er darf die Uhr nicht zurückstellen.
  if (zaehltAlsGeprueft(erreichbarkeit)) {
    const { error: e2 } = await sb.from("funding_programs").update({ last_verified: heute }).eq("id", programId);
    if (e2) {
      console.error(`Prüfdatum nicht gesetzt: ${e2.message}`);
      process.exit(1);
    }
    console.log(`${program.name}: an der Amtsquelle geprüft, "Zuletzt geprüft" auf ${heute} gesetzt.`);
    return;
  }

  const versuche = await ladeVersuche();
  const stand = pruefstandFuer(program, versuche, heute);
  console.log(`${program.name}: Versuch als "${erreichbarkeit}" protokolliert (${stand.fehlversuche}× in Folge nicht an der Quelle).`);

  const e = eskalationsVorschlag(program, stand);
  if (e) {
    console.log(`\nESKALATION — Status im Seed auf "${e.statusNeu}" setzen und als Entscheidung melden:`);
    console.log(e.entscheidung);
    process.exitCode = 2; // "erledigt, aber es steht etwas an" — wie beim Gesundheitscheck
  }
}

async function main(): Promise<void> {
  const okId = flag("ok");
  const fehlId = flag("fehl");

  if (process.argv.includes("--vorrat")) {
    await zeigeVorrat();
  } else if (okId) {
    await protokolliere(okId, (flag("wie") ?? "traeger") as Erreichbarkeit);
  } else if (fehlId) {
    const wie = flag("wie");
    if (!wie) {
      console.error("--fehl braucht --wie: pruefseite | gesperrt | sekundaer | archiv");
      process.exit(1);
    }
    await protokolliere(fehlId, wie as Erreichbarkeit);
  } else {
    console.log(
      "Prüfstand der Förderprogramme.\n\n" +
        "  --vorrat                                  was als Nächstes zu prüfen ist\n" +
        "  --ok <id> --wie traeger --url … --zitat …  an der Amtsquelle gelesen\n" +
        "  --fehl <id> --wie pruefseite|gesperrt|sekundaer|archiv\n",
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
