/**
 * Welche Technik trägt diese Förderseite? — die Einordnung je EINZELNER Seite.
 *
 *   npm run foerder:technik                 # nächste 400 Seiten einordnen
 *   npm run foerder:technik -- --limit 2000
 *   npm run foerder:technik -- --stand      # nur Fortschritt zeigen
 *
 * WARUM (19.08.2026): Nach dem Umbau der Erfassung kann eine Gemeinde mehrere
 * Förderseiten haben — aber bei den meisten steht keine Technik dran. Damit ist
 * die eigentliche Frage des Betreibers unbeantwortbar: „Haben wir für DIESE
 * Gemeinde eine Wärmepumpen-Seite?" Gemessen vor dem ersten Lauf: 149 von 2.672
 * Seiten trugen eine Technik. Der Rest ist eine Adresse ohne Aussage.
 *
 * ER ERKENNT NICHT NEU. Die Einordnung macht `einordnen` aus
 * `lib/funding-screen-erkennung` — derselbe Erkenner, den das Screening benutzt,
 * mit derselben Nähe-Regel (ein Betrag oder Zuschuss-Wort im selben Textfenster
 * wie der Fachbegriff). Ein zweiter Erkenner wäre eine zweite Wahrheit.
 *
 * NUR EIN TREFFER SETZT EINE TECHNIK. Eine Seite, die die Wärmepumpe bloß
 * erwähnt, ohne dass in Reichweite Geld steht, ist keine Wärmepumpen-Förderseite
 * — sie als solche zu führen wäre dieselbe Fehlerklasse wie ein Prüfdatum für
 * eine Prüfung, die nie stattfand. Das Verdikt wird trotzdem festgehalten, damit
 * sichtbar bleibt, WARUM eine Seite ohne Technik dasteht.
 *
 * GEDÄCHTNIS wie überall sonst: Jede eingeordnete Seite bekommt den
 * Versionsstempel des Erkenners. Wird er geschärft, kommen die alten Zeilen von
 * selbst wieder dran — ohne Stempel bliebe „fast alles eingeordnet" stehen,
 * während für zwei von drei Techniken nie jemand hingesehen hat.
 */

import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { einordnen, sichtbarerText, SCREEN_VERSION } from "../lib/funding-screen-erkennung";
import { technikenSchreiben } from "../lib/funding-seiten";
import { inSchueben } from "../lib/lauf-parallel";

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

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

function zahl(name: string, standard: number): number {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return standard;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) && n > 0 ? n : standard;
}

type Zeile = {
  region_id: string;
  url: string;
  zustand: string | null;
  screen_version: number | null;
  eingeordnet_am: string | null;
};

async function alleZeilen<T>(tabelle: string, spalten: string): Promise<T[]> {
  const raus: T[] = [];
  for (let von = 0; ; von += 1000) {
    const { data, error } = await sb.from(tabelle).select(spalten).range(von, von + 999);
    if (error) throw new Error(`${tabelle}: ${error.message}`);
    if (!data || data.length === 0) break;
    raus.push(...(data as T[]));
    if (data.length < 1000) break;
  }
  return raus;
}

/** Noch nicht oder mit einem älteren Erkenner eingeordnet. */
function offen(z: Zeile): boolean {
  if (z.zustand === "unerreichbar") return false;
  return (z.screen_version ?? 0) < SCREEN_VERSION;
}

async function stand(): Promise<void> {
  const zeilen = await alleZeilen<Zeile>(
    "funding_seiten", "region_id, url, zustand, screen_version, eingeordnet_am",
  );
  const rest = zeilen.filter(offen);
  console.log(`${zeilen.length} Seiten · eingeordnet mit Erkenner ${SCREEN_VERSION}: ${zeilen.length - rest.length}`);
  console.log(`offen: ${rest.length}`);
}

async function main(): Promise<void> {
  if (process.argv.includes("--stand")) return stand();

  const limit = zahl("limit", 400);
  const zeilen = await alleZeilen<Zeile>(
    "funding_seiten", "region_id, url, zustand, screen_version, eingeordnet_am",
  );
  // Nie eingeordnete zuerst, danach die ältesten — dasselbe Reihum wie beim
  // Seiten-Wächter, damit kein Teil des Bestands liegen bleibt.
  const dran = zeilen
    .filter(offen)
    .sort((a, b) => (a.eingeordnet_am ?? "").localeCompare(b.eingeordnet_am ?? ""))
    .slice(0, limit);

  console.log(`${zeilen.length} Seiten bekannt, ${zeilen.filter(offen).length} offen. Ich ordne ${dran.length} ein.\n`);

  const zaehler: Record<string, number> = {};
  const technikZaehler: Record<string, number> = { pv: 0, balkon: 0, waermepumpe: 0 };
  let unerreichbar = 0;
  const jetzt = new Date().toISOString();

  await inSchueben(dran, zahl("gleichzeitig", 8), async (z) => {
    let html: string | null = null;
    try {
      const res = await fetch(z.url.startsWith("http") ? z.url : `https://${z.url}`, {
        headers: { "User-Agent": UA, "Accept-Language": "de-DE,de;q=0.9" },
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) html = await res.text();
    } catch {
      /* unerreichbar */
    }

    if (!html) {
      // Kein Durchgang, kein Stempel: Eine Seite, die wir nicht lesen konnten,
      // ist nicht eingeordnet. Sie nur als „unerreichbar" zu vermerken hält sie
      // im Vorrat, statt sie als erledigt auszuweisen.
      unerreichbar++;
      await sb.from("funding_seiten").update({ zustand: "unerreichbar" })
        .eq("region_id", z.region_id).eq("url", z.url);
      return;
    }

    const befund = einordnen(sichtbarerText(html));
    zaehler[befund.verdikt] = (zaehler[befund.verdikt] ?? 0) + 1;
    for (const t of befund.techniken) technikZaehler[t]++;

    await sb.from("funding_seiten").update({
      // Nur ein Treffer setzt eine Technik — eine bloße Erwähnung ist keine.
      techniken: befund.techniken.length ? technikenSchreiben(befund.techniken) : null,
      screen_verdikt: befund.verdikt,
      screen_version: SCREEN_VERSION,
      eingeordnet_am: jetzt,
      zustand: "erreichbar",
    }).eq("region_id", z.region_id).eq("url", z.url);
  });

  console.log("Verdikte:", zaehler);
  console.log("Techniken erkannt:", technikZaehler);
  console.log(`unerreichbar: ${unerreichbar}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
