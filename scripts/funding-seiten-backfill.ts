/**
 * Bestehende Fundstellen in die Seiten-Tabelle übernehmen.
 *
 *   npx tsx scripts/funding-seiten-backfill.ts --dry            # nur zählen
 *   npx tsx scripts/funding-seiten-backfill.ts                  # übernehmen
 *   npx tsx scripts/funding-seiten-backfill.ts --normalisieren  # Dubletten einsammeln
 *
 * WARUM (19.08.2026): `funding_seiten` erlaubt mehrere Förderseiten je Gemeinde.
 * Der vorhandene Bestand steckt verteilt in zwei Tabellen, jeweils auf eine
 * Adresse je Gemeinde zusammengedrückt: `kommunen_kontakt.thema_foerderung_url`
 * (der Fund der URL-Suche) und `funding_coverage` (dieselbe Adresse, aber mit
 * Technik-Einordnung und Leseergebnis). Beide werden hier vereinigt — die
 * Quelltabellen bleiben unangetastet, weil eine andere Sitzung gerade in
 * `funding_coverage` schreibt.
 *
 * Der Lauf ist idempotent: Er führt Funde über `fundEinfuegen` zusammen, statt
 * zu überschreiben. Ein zweiter Lauf ändert nichts, ein späterer Lauf nach neuen
 * Funden ergänzt nur.
 */
import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  seitenSchluessel, istInterneRoute, technikenSchreiben, technikenLesen, fundEinfuegen,
  type FoerderSeite, type LeseErgebnis, type SeitenQuelle,
} from "../lib/funding-seiten";

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
const dry = process.argv.includes("--dry");
const nurNormalisieren = process.argv.includes("--normalisieren");

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

/** Leseergebnis der alten Tabelle auf die neue Sprache bringen. */
function leseErgebnis(alt: string | null | undefined): LeseErgebnis | null {
  if (!alt) return null;
  const k = alt.toLowerCase();
  if (k.includes("aufgenommen") || k.includes("uebernommen") || k.includes("übernommen")) return "aufgenommen";
  if (k.includes("ausgelaufen") || k.includes("beendet")) return "ausgelaufen";
  if (k.includes("keine") || k.includes("verworfen") || k.includes("kein-treffer")) return "keine-foerderung";
  return "unklar";
}

/**
 * Bestand nachziehen, wenn die Normalisierung schärfer geworden ist.
 *
 * Zwei Sorten Müll, beide am ersten echten Lauf gemessen (19.08.2026): Adressen,
 * die nach neuer Regel auf eine bereits vorhandene Seite zusammenfallen
 * (Vorschau- und Verweis-Parameter), und interne Routen des Redaktionssystems
 * (Übersetzungen, Skript-Pfade). Beide tragen einen eigenen Fingerabdruck und
 * ließen den Wächter dauerhaft Bewegung melden, wo keine ist.
 */
async function normalisieren(): Promise<void> {
  const seiten = await alleZeilen<{ region_id: string; url: string; gelesen_ergebnis: string | null }>(
    "funding_seiten", "region_id, url, gelesen_ergebnis",
  );
  const behalten = new Map<string, string>();   // schluessel -> url
  const weg: { region_id: string; url: string }[] = [];
  for (const s of seiten) {
    if (istInterneRoute(s.url)) { weg.push(s); continue; }
    const k = `${s.region_id}|${seitenSchluessel(s.url)}`;
    const schon = behalten.get(k);
    if (schon === undefined) { behalten.set(k, s.url); continue; }
    // Bei zwei Fassungen derselben Seite die gelesene behalten.
    if (s.gelesen_ergebnis && !schon.includes("?")) { weg.push({ region_id: s.region_id, url: schon }); behalten.set(k, s.url); }
    else weg.push(s);
  }
  console.log(`Seiten im Bestand:   ${seiten.length}`);
  console.log(`  interne Routen und Dubletten: ${weg.length}`);
  if (dry || !weg.length) return;
  for (const w of weg) {
    const { error } = await sb.from("funding_seiten").delete().eq("region_id", w.region_id).eq("url", w.url);
    if (error) throw new Error(`Löschen ${w.region_id} ${w.url}: ${error.message}`);
  }
  console.log(`  entfernt: ${weg.length}`);
}

async function main(): Promise<void> {
  console.log(dry ? "Trockenlauf — es wird nichts geschrieben.\n" : "");
  if (nurNormalisieren) return normalisieren();

  const kk = await alleZeilen<{ region_id: string; thema_foerderung_url: string | null }>(
    "kommunen_kontakt", "region_id, thema_foerderung_url",
  );
  const cov = await alleZeilen<{
    region_id: string; url: string | null; verdict: string; techniken: string | null;
    fingerprint: string | null; seite_gesehen_am: string | null; seite_geaendert_am: string | null;
    gelesen_am: string | null; gelesen_ergebnis: string | null; gelesen_notiz: string | null;
  }>(
    "funding_coverage",
    "region_id, url, verdict, techniken, fingerprint, seite_gesehen_am, seite_geaendert_am, gelesen_am, gelesen_ergebnis, gelesen_notiz",
  );

  // Je Gemeinde sammeln, damit `fundEinfuegen` seine Arbeit tun kann.
  const jeGemeinde = new Map<string, FoerderSeite[]>();
  const dazu = (s: FoerderSeite) => {
    const vorher = jeGemeinde.get(s.regionId) ?? [];
    jeGemeinde.set(s.regionId, fundEinfuegen(vorher, s));
  };

  // 1. Die reichere Quelle zuerst: Screening kennt Technik und Leseergebnis.
  for (const c of cov) {
    if (!c.url) continue;
    dazu({
      regionId: c.region_id,
      url: seitenSchluessel(c.url),
      techniken: technikenLesen(c.techniken),
      quelle: "suche" as SeitenQuelle,
      zustand: c.verdict === "unerreichbar" ? "unerreichbar" : "erreichbar",
      fingerprint: c.fingerprint,
      seiteGesehenAm: c.seite_gesehen_am,
      seiteGeaendertAm: c.seite_geaendert_am,
      gelesenAm: c.gelesen_am,
      gelesenErgebnis: leseErgebnis(c.gelesen_ergebnis),
      gelesenNotiz: c.gelesen_notiz,
    });
  }

  // 2. Danach der Kontakt-Bestand — bringt Adressen mit, die nie gescreent wurden.
  for (const k of kk) {
    if (!k.thema_foerderung_url) continue;
    dazu({
      regionId: k.region_id,
      url: seitenSchluessel(k.thema_foerderung_url),
      techniken: [],
      quelle: "outreach",
      zustand: "unbekannt",
    });
  }

  const alle = [...jeGemeinde.values()].flat();
  const mehrfach = [...jeGemeinde.values()].filter((v) => v.length > 1).length;
  console.log(`Gemeinden mit mindestens einer Förderseite: ${jeGemeinde.size}`);
  console.log(`Seiten insgesamt:                          ${alle.length}`);
  console.log(`Gemeinden mit MEHR ALS EINER Seite:        ${mehrfach}`);
  console.log(`  (vor dem Umbau war das strukturell 0)`);

  if (dry) return;

  const zeilen = alle.map((s) => ({
    region_id: s.regionId,
    url: s.url,
    techniken: technikenSchreiben(s.techniken) || null,
    quelle: s.quelle,
    zustand: s.zustand,
    fingerprint: s.fingerprint ?? null,
    seite_gesehen_am: s.seiteGesehenAm ?? null,
    seite_geaendert_am: s.seiteGeaendertAm ?? null,
    gelesen_am: s.gelesenAm ?? null,
    gelesen_ergebnis: s.gelesenErgebnis ?? null,
    gelesen_notiz: s.gelesenNotiz ?? null,
  }));

  for (let i = 0; i < zeilen.length; i += 500) {
    const teil = zeilen.slice(i, i + 500);
    const { error } = await sb.from("funding_seiten").upsert(teil, { onConflict: "region_id,url" });
    if (error) throw new Error(`Schreiben ab ${i}: ${error.message}`);
    process.stdout.write(`\r  geschrieben: ${Math.min(i + 500, zeilen.length)}/${zeilen.length}`);
  }
  console.log("\nfertig.");
}

main().catch((e) => { console.error(String(e)); process.exit(1); });
