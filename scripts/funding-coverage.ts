/**
 * Abdeckungs-Liste: welche großen Gemeinden haben wir noch nicht geprüft?
 *
 *   npm run foerder:abdeckung           # Top 40 offene Kandidaten
 *   npm run foerder:abdeckung -- --top 200
 *
 * WARUM (17.08.2026): Die Prüfkette für die Programme, die wir KENNEN, ist dicht
 * — Seiten-Wächter, Arbeitsvorrat, Beleg-Verfall. Was wir nicht kennen, kennt
 * aber niemand: Wir führen 38 Programme in gut 110 Städten, Deutschland hat rund
 * 11.000 Gemeinden. Ein neu aufgelegtes kommunales Programm fand bisher nur die
 * breite Suche im täglichen Wächter — stichprobenartig, nicht systematisch.
 *
 * Der Hebel lag schon im Haus: Der Kommunen-Outreach hat für 1.258 Gemeinden die
 * Förderseite der Verwaltung erfasst (`kommunen_kontakt.thema_foerderung_url`).
 * Das ist keine Vermutung und keine Suchtreffer-Liste, sondern eine Adresse, die
 * jemand auf der Amtsdomain gefunden hat. Dieses Skript verbindet sie mit den
 * Einwohnerzahlen (`mastr_regions`) und blendet aus, was wir schon führen —
 * übrig bleibt eine nach Wirkung sortierte Arbeitsliste.
 *
 * Sortiert wird nach Einwohnern, weil die Reichweite daran hängt: Ein Programm in
 * einer Großstadt betrifft mehr Rechner-Nutzer als eines in einer 3.000-Seelen-
 * Gemeinde. Das ist eine Priorisierung, keine Wertung — die Kleinen fallen nicht
 * weg, sie kommen später.
 */

import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { FUNDING_PROGRAMS } from "../lib/funding-programs";

function loadEnvFile(): void {
  const envPath = resolve(process.cwd(), ".env.local");
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
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen.");
  process.exit(1);
}
const sb = createClient(url, key);

function argInt(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(v) ? v : fallback;
}

/**
 * Deckt eines unserer Programme diese Gemeinde ab?
 *
 * Dieselbe Präfix-Logik wie im Rechner: Land = 2 Stellen, Kreis = 5, Gemeinde
 * = 8. Ein Landesprogramm deckt damit jede Gemeinde des Landes ab — wer trotzdem
 * ein eigenes kommunales Programm hat, taucht hier bewusst NICHT auf. Das ist der
 * bekannte Preis dieser Vereinfachung; die Liste ist eine Priorisierung, keine
 * Vollständigkeitsgarantie.
 */
function schonAbgedeckt(ags: string): boolean {
  return Object.values(FUNDING_PROGRAMS).some(
    (p) => p.agsCode && p.agsCode.length >= 5 && ags.startsWith(p.agsCode),
  );
}

// PostgREST liefert stumm höchstens 1.000 Zeilen — bei 11.219 Gemeinden wäre das
// eine still abgeschnittene Liste, die vollständig aussieht.
async function alleZeilen<T>(tabelle: string, spalten: string, filter?: (q: any) => any): Promise<T[]> {
  const out: T[] = [];
  const schritt = 1000;
  for (let von = 0; ; von += schritt) {
    let q = sb.from(tabelle).select(spalten).range(von, von + schritt - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`${tabelle}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < schritt) break;
  }
  return out;
}

/**
 * Zeigt die erfasste Adresse überhaupt in Richtung Energie?
 *
 * BLOCKER gegen eine Scheingenauigkeit: `thema_foerderung_url` wurde für den
 * Kommunen-Outreach gesammelt und beantwortet nur „hat die Verwaltung
 * irgendeine Förderseite?". Gemessen an den Top 25: Leipzigs Adresse führt zur
 * Erzieherausbildung, Kiels zum Mietzuschuss, Oldenburgs zu Verhütungsmitteln.
 * Diese Liste als „1.258 offene PV-Programme" zu lesen wäre eine Zahl, die
 * dreimal zu groß ist. Der Filter trennt deshalb, was thematisch überhaupt in
 * Frage kommt — der Rest braucht eine echte Suche je Stadt und ist damit
 * teurer, nicht unmöglich.
 */
function energieNah(u: string): boolean {
  return /klima|energie|umwelt|solar|photovolt|nachhaltig|bauen|wohnen|sanier/i.test(u);
}

async function main(): Promise<void> {
  const top = argInt("top", 40);

  const kontakte = await alleZeilen<{ region_id: string; thema_foerderung_url: string | null }>(
    "kommunen_kontakt",
    "region_id, thema_foerderung_url",
    (q) => q.not("thema_foerderung_url", "is", null),
  );
  const regionen = await alleZeilen<{ region_id: string; name: string; population: number | null; level: string }>(
    "mastr_regions",
    "region_id, name, population, level",
    (q) => q.eq("level", "gemeinde"),
  );

  const nachId = new Map(regionen.map((r) => [r.region_id, r]));

  const kandidaten = kontakte
    .map((k) => ({ ...k, region: nachId.get(k.region_id) }))
    .filter((k) => k.region && !schonAbgedeckt(k.region_id))
    .map((k) => ({ ...k, nah: energieNah(k.thema_foerderung_url ?? "") }))
    // Thematisch passende zuerst, dann nach Einwohnern — beides zusammen ist die
    // Reihenfolge, in der ein Prüflauf den meisten Nutzen je Aufwand bringt.
    .sort((a, b) => Number(b.nah) - Number(a.nah) || (b.region!.population ?? 0) - (a.region!.population ?? 0));

  const nah = kandidaten.filter((k) => k.nah);
  console.log(
    `Gemeinden mit erfasster Förderseite: ${kontakte.length}\n` +
      `  davon noch nicht abgedeckt:      ${kandidaten.length}\n` +
      `  davon thematisch passend:        ${nah.length}   ← hier anfangen\n`,
  );
  console.log(`Die ${Math.min(top, nah.length)} größten thematisch passenden Kandidaten:\n`);
  for (const k of nah.slice(0, top)) {
    const ew = k.region!.population ? k.region!.population.toLocaleString("de-DE") : "?";
    console.log(`  ${k.region!.name} (${ew} Einw.)`);
    console.log(`     ${k.thema_foerderung_url}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
