/**
 * Moves wind capacity in the database to the municipality each turbine STANDS
 * in, without waiting for the next monthly import.
 *
 * From the next monthly run on the import places every turbine by location
 * (lib/wind-standort.ts). This script repairs what earlier runs wrote.
 *
 * It MOVES, it does not rebuild: for every turbine whose location differs from
 * its register municipality it subtracts count and capacity from the register
 * bucket (municipality × commissioning year) and adds them to the location
 * bucket. The reason is measured: the export cached on this machine carries the
 * same file name as the one the database was built from and still differs by
 * 59 turbines (09.10.2026) — the authority republishes under the same name.
 * Rebuilding wind from it would mix two register states; moving keeps the
 * database's own state and conserves every total by construction.
 *
 * A turbine whose register bucket in the database cannot give it up (bucket
 * missing or too small — it is not in the database's state) is skipped and
 * counted, never forced. Solar, storage and every other carrier stay untouched.
 *
 *   npm run mastr:wind-standort                 # report only
 *   npm run mastr:wind-standort -- --schreiben  # write and rebuild
 *
 * NOT idempotent by nature — a second run would move the same turbines again —
 * so it stamps mastr_meta.notes and refuses to run twice on the same import.
 * The next monthly import writes fresh notes and places by location itself.
 */
import { createClient } from "@supabase/supabase-js";
import { aktuellerGemeindeschluessel } from "../lib/ags-nachfolger";
import { rollupSchrittweise } from "../lib/mastr-rollup-sql";
import { windGemeinde } from "../lib/wind-standort";
import { heuteInBerlin } from "../lib/zeit";
import { findCachedZip, listZipEntries, parseKwp, parseYear, streamXmlRecords, UNIT_SPECS } from "./mastr-bnetza-refresh";
import { ladeGemeindeflaechen } from "./lib/vg250";

const MARKE = "[wind nach Standort verschoben]";

type Zeile = { region_id: string; segment: string; year: number; count: number; kwp: number };
const rund = (x: number) => Math.round(x * 100) / 100;
const k = (region: string, year: number) => `${region}|n/a|${year}`;

async function main() {
  const schreiben = process.argv.includes("--schreiben");
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: meta, error: metaErr } = await db.from("mastr_meta").select("notes").eq("id", 1).single();
  if (metaErr) throw new Error(`mastr_meta: ${metaErr.message}`);
  if (String(meta.notes ?? "").includes(MARKE)) {
    console.log("Dieser Import ist bereits nach Standort verschoben — nichts zu tun.");
    return;
  }

  // Database state, paged AND ordered.
  const bestand = new Map<string, Zeile>();
  for (let o = 0; ; o += 1000) {
    const { data, error } = await db
      .from("mastr_aggregates_gem")
      .select("region_id,segment,year,count,kwp")
      .eq("energietraeger", "wind")
      .order("region_id")
      .order("segment")
      .order("year")
      .range(o, o + 999);
    if (error) throw error;
    for (const z of data as Zeile[]) bestand.set(k(z.region_id, z.year), { ...z, kwp: Number(z.kwp) });
    if (data!.length < 1000) break;
  }
  const summe = () => [...bestand.values()].reduce((s, z) => ({ n: s.n + z.count, kw: s.kw + z.kwp }), { n: 0, kw: 0 });
  const vorher = summe();
  const vorherJeOrt = new Map<string, number>();
  for (const z of bestand.values()) vorherJeOrt.set(z.region_id, (vorherJeOrt.get(z.region_id) ?? 0) + z.kwp);

  // Same filters as the import (status, key, year, capacity), same placement.
  const flaechen = await ladeGemeindeflaechen();
  const spec = UNIT_SPECS.find((s) => s.et === "wind")!;
  const zip = findCachedZip();
  const dateien = (await listZipEntries(zip)).map((e) => e.name).filter((n) => spec.filePattern.test(n));
  const geaendert = new Set<string>();
  let verschoben = 0;
  let verschobenKw = 0;
  let uebersprungen = 0;
  for (const datei of dateien) {
    await streamXmlRecords(zip, datei, spec.recordTag, (row) => {
      if (row.EinheitBetriebsstatus !== "35") return;
      const gks = (row.Gemeindeschluessel ?? "").trim();
      if (gks.length < 8) return;
      const year = parseYear(row.Inbetriebnahmedatum);
      const kw = parseKwp(row.Bruttoleistung);
      if (!year || !kw || kw <= 0) return;
      const register = aktuellerGemeindeschluessel(gks.substring(0, 8));
      const z = windGemeinde(
        { registerAgs: register, breitengrad: row.Breitengrad, laengengrad: row.Laengengrad, ort: row.Ort, gemarkung: row.Gemarkung },
        flaechen,
      );
      if (z.quelle !== "standort") return;
      const von = bestand.get(k(register, year));
      if (!von || von.count < 1 || von.kwp < kw - 0.01) {
        uebersprungen++;
        return;
      }
      von.count -= 1;
      von.kwp = rund(von.kwp - kw);
      const nachKey = k(z.regionId, year);
      const nach = bestand.get(nachKey) ?? { region_id: z.regionId, segment: "n/a", year, count: 0, kwp: 0 };
      nach.count += 1;
      nach.kwp = rund(nach.kwp + kw);
      bestand.set(nachKey, nach);
      geaendert.add(k(register, year));
      geaendert.add(nachKey);
      verschoben++;
      verschobenKw += kw;
    });
  }

  const nachher = summe();
  console.log(
    `${verschoben} Windräder verschoben (${Math.round(verschobenKw / 1000).toLocaleString("de-DE")} MW), ` +
      `${uebersprungen} übersprungen (nicht im Stand der Datenbank).`,
  );
  console.log(`Bund vorher ${vorher.n} / ${Math.round(vorher.kw)} kW, nachher ${nachher.n} / ${Math.round(nachher.kw)} kW`);
  if (vorher.n !== nachher.n || Math.abs(vorher.kw - nachher.kw) > 1) throw new Error("Bundessumme nicht erhalten — Abbruch.");

  const nachherJeOrt = new Map<string, number>();
  for (const z of bestand.values()) nachherJeOrt.set(z.region_id, (nachherJeOrt.get(z.region_id) ?? 0) + z.kwp);
  const orte = [...new Set([...vorherJeOrt.keys(), ...nachherJeOrt.keys()])].filter(
    (id) => Math.abs((nachherJeOrt.get(id) ?? 0) - (vorherJeOrt.get(id) ?? 0)) > 0.5,
  );
  console.log(`${orte.length} Gemeinden ändern ihre Windleistung.`);
  for (const id of ["05566084", "05566064"]) {
    console.log(`  ${id} ${flaechen.name(id)}: ${rund((vorherJeOrt.get(id) ?? 0) / 1000)} → ${rund((nachherJeOrt.get(id) ?? 0) / 1000)} MW`);
  }
  if (!schreiben) {
    console.log("Nur Bericht. Mit --schreiben ausführen.");
    return;
  }

  // A region row must exist for the foreign key.
  const ziele = [...new Set([...geaendert].map((s) => s.split("|")[0]))];
  const vorhanden = new Set<string>();
  for (let i = 0; i < ziele.length; i += 300) {
    const { data, error } = await db.from("mastr_regions").select("region_id").in("region_id", ziele.slice(i, i + 300));
    if (error) throw error;
    for (const r of data!) vorhanden.add(r.region_id);
  }
  const ohneZeile = ziele.filter((id) => !vorhanden.has(id));
  if (ohneZeile.length) throw new Error(`Gemeinden ohne Regionszeile: ${ohneZeile.join(", ")}`);

  const betroffen = [...geaendert].map((s) => bestand.get(s)!);
  const schreibe = betroffen.filter((z) => z.count > 0);
  const leer = betroffen.filter((z) => z.count === 0);
  for (let i = 0; i < schreibe.length; i += 1000) {
    // Every row carries every column (the upsert column-set trap).
    const teil = schreibe.slice(i, i + 1000).map((z) => ({ ...z, energietraeger: "wind", kwh: 0 }));
    const { error } = await db.from("mastr_aggregates_gem").upsert(teil, { onConflict: "region_id,energietraeger,segment,year" });
    if (error) throw new Error(`upsert: ${error.message}`);
  }
  for (const z of leer) {
    const { error } = await db
      .from("mastr_aggregates_gem")
      .delete()
      .eq("region_id", z.region_id)
      .eq("energietraeger", "wind")
      .eq("segment", "n/a")
      .eq("year", z.year);
    if (error) throw new Error(`delete ${z.region_id}/${z.year}: ${error.message}`);
  }
  const { error: markErr } = await db
    .from("mastr_meta")
    .update({ notes: `${meta.notes ?? ""} ${MARKE} ${heuteInBerlin()}`.trim() })
    .eq("id", 1);
  if (markErr) throw new Error(`Marke setzen: ${markErr.message}`);
  console.log(`${schreibe.length} Zeilen geschrieben, ${leer.length} geleert.`);

  const { data: tr, error: trErr } = await db.from("mastr_aggregates_gem").select("energietraeger").limit(100_000);
  if (trErr) throw new Error(`energietraeger lesen: ${trErr.message}`);
  await rollupSchrittweise(
    (fn, args) => db.rpc(fn, args ?? {}),
    [...new Set((tr ?? []).map((r) => (r as { energietraeger: string }).energietraeger))].sort(),
  );
  for (const fn of ["mastr_refresh_gemeinde_solar", "mastr_refresh_gemeinde_award"]) {
    console.log(`Neuberechnung ${fn} …`);
    const { error } = await db.rpc(fn);
    if (error) throw new Error(`${fn}: ${error.message}`);
  }
  console.log("Danach: Atlas-Seiten ungültig erklären, Kreis- und Gemeindepakete neu bauen, Windgemeinden neu erzeugen.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
