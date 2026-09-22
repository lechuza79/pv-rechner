/**
 * The monthly run of the municipality pages: every town's data package from
 * the SAME register export the database import used.
 *
 *   npx tsx scripts/gemeinde-monatslauf.ts            (plan only, changes nothing)
 *   npx tsx scripts/gemeinde-monatslauf.ts --los      (run everything)
 *   … --los --ab=pakete                               (resume from a step)
 *
 * WHY ONE EXPORT. Rankings come live from the database, the stories and
 * charts from local caches built from a register zip. Built from two exports
 * (09/2026: database 09-09, caches 09-10) about one package in twelve
 * disagreed with itself. The export is therefore taken from the database's
 * own record (mastr_meta.source_url) and downloaded by that exact name —
 * never "the newest file", which the other scripts would otherwise pick.
 *
 * WHY LOCAL. The ERA5 weather archive lives only on this machine
 * (scripts/.cache/era5-archive, ≈1 GB), like the monthly ERA5 task it builds
 * on. Run after the CI's MaStR import (5th–9th of the month) and within a few
 * days of it: the register server keeps an export for a few days only. If the
 * file is gone the run stops and says so; it never falls back to another date.
 *
 * Steps, each a separate command so a failure names where it stopped:
 *   export   download the database's export, leave no other zip beside it
 *   caches   npm run stories:refresh (story inputs, register detail, discovery,
 *            value units, prepared stories) with the ERA5 archive as weather
 *   wetter   ERA5 months/years the packages need (idempotent)
 *   pakete   scripts/gemeinde-paket.ts --alle --stand=<D> --neu
 *   upload   scripts/gemeinde-paket-upload.ts --stand=<D>
 *   frisch   invalidate the Atlas pages (they read the packages)
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
const los = process.argv.includes("--los");
const ab = process.argv.find((a) => a.startsWith("--ab="))?.slice(5);
const SCHRITTE = ["export", "caches", "wetter", "pakete", "upload", "frisch"] as const;
const BNETZA = "scripts/.cache/bnetza";

function befehl(titel: string, cmd: string, args: string[], env: Record<string, string> = {}) {
  console.log(`\n▶ ${titel}\n  ${cmd} ${args.join(" ")}`);
  if (!los) return;
  const r = spawnSync(cmd, args, { stdio: "inherit", env: { ...process.env, ...env } });
  if (r.status !== 0) {
    console.error(`\n✖ Abgebrochen bei „${titel}" (Exit ${r.status}). Weiter mit --los --ab=<schritt>.`);
    process.exit(1);
  }
}

async function datenbankExport(): Promise<{ url: string; datum: string; datei: string }> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Supabase-Zugang fehlt (.env.local)");
  const r = await fetch(`${url}/rest/v1/mastr_meta?select=source_url&order=id.desc&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const zeile = ((await r.json()) as { source_url?: string }[])[0];
  const m = /(Gesamtdatenexport_(\d{4})(\d{2})(\d{2})_[\d.]+\.zip)$/.exec(zeile?.source_url ?? "");
  if (!m) throw new Error(`Export der Datenbank nicht lesbar: ${zeile?.source_url}`);
  return { url: zeile!.source_url!, datum: `${m[2]}-${m[3]}-${m[4]}`, datei: m[1] };
}

/** Months the packages need: the 20 months up to the one before D, and the three years before D's year. */
function wetterBedarf(datum: string) {
  const [j, m] = datum.split("-").map(Number);
  const monate: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const d = new Date(Date.UTC(j, m - 1 - i, 15));
    monate.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return { monate: monate.reverse(), jahre: [j - 3, j - 2, j - 1] };
}

async function main() {
  const exp = await datenbankExport();
  console.log(`Export der Datenbank: ${exp.datei} (Stand ${exp.datum})${los ? "" : " — nur Plan, nichts wird ausgeführt (--los)"}`);
  const start = ab ? SCHRITTE.indexOf(ab as (typeof SCHRITTE)[number]) : 0;
  if (start < 0) throw new Error(`Unbekannter Schritt: ${ab}`);
  const schritt = (s: (typeof SCHRITTE)[number]) => SCHRITTE.indexOf(s) >= start;

  if (schritt("export")) {
    const ziel = path.join(BNETZA, exp.datei);
    // The other scripts pick "the newest" or "the first" zip in the folder;
    // with exactly one there, they all pick the database's export.
    const andere = existsSync(BNETZA) ? readdirSync(BNETZA).filter((f) => f.endsWith(".zip") && f !== exp.datei) : [];
    console.log(`\n▶ Export bereitlegen: ${ziel}${andere.length ? ` (entfernt: ${andere.join(", ")})` : ""}`);
    if (los) {
      for (const f of andere) rmSync(path.join(BNETZA, f));
      if (!existsSync(ziel) || statSync(ziel).size < 1e9) {
        const head = await fetch(exp.url, { method: "HEAD" });
        if (!head.ok) {
          console.error(`✖ ${exp.url} ist nicht mehr abrufbar (HTTP ${head.status}). Der Server hält Exporte nur wenige Tage; der Lauf muss kurz nach dem Datenbank-Import laufen. Kein Rückfall auf ein anderes Datum.`);
          process.exit(1);
        }
        befehl("Export laden", "curl", ["-fL", "--retry", "3", "-A", "solar-check-health-check", "-o", ziel, exp.url]);
      }
    }
  }
  if (schritt("caches")) befehl("Story-Caches aus dem Export", "npm", ["run", "stories:refresh"], { STORY_WEATHER_PROVIDER: "era5-archive" });
  if (schritt("wetter")) {
    const { monate, jahre } = wetterBedarf(exp.datum);
    for (const y of jahre) befehl(`ERA5 Jahr ${y}`, "npm", ["run", "era5:sync", "--", `--year=${y}`]);
    for (const mo of monate) befehl(`ERA5 Monat ${mo}`, "npm", ["run", "era5:sync", "--", `--month=${mo}`]);
  }
  if (schritt("pakete"))
    befehl("Pakete aller Orte", "npx", ["tsx", "--conditions=react-server", "scripts/gemeinde-paket.ts", "--alle", `--stand=${exp.datum}`, "--neu"]);
  if (schritt("upload")) befehl("Pakete hochladen", "npx", ["tsx", "scripts/gemeinde-paket-upload.ts", `--stand=${exp.datum}`]);
  if (schritt("frisch")) {
    // The same call the CI's MaStR import makes after its run.
    const base = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";
    console.log(`\n▶ Atlas-Seiten für ungültig erklären\n  POST ${base}/api/atlas/revalidate`);
    if (los) {
      if (!process.env.CRON_SECRET) throw new Error("CRON_SECRET fehlt (.env.local)");
      const r = await fetch(`${base}/api/atlas/revalidate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}`, "User-Agent": "solar-check-health-check" },
      });
      if (!r.ok) {
        console.error(`✖ Invalidierung: HTTP ${r.status}`);
        process.exit(1);
      }
    }
  }
  console.log(los ? "\n✓ Monatslauf fertig." : "\nPlan ausgegeben. Ausführen mit --los.");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
