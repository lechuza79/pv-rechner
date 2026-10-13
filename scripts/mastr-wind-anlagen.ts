/**
 * Wind turbines one by one — from the same BNetzA dump the monthly import loads.
 *
 * The main import keeps only count and capacity per Gemeinde. This run keeps
 * every turbine with its position, hub height and rotor, which is what a yield
 * estimate needs. It writes its own table and never touches the aggregates.
 *
 * Every status is kept, not only "in operation": decommissioned and planned
 * turbines are the repowering story, and filtering is cheap later while a
 * dropped row needs another 3 GB download.
 *
 *   npx tsx scripts/mastr-wind-anlagen.ts --probe      # print one raw record
 *   npx tsx scripts/mastr-wind-anlagen.ts --trocken    # parse and count only
 *   npx tsx scripts/mastr-wind-anlagen.ts              # create table, write rows
 */
import { createClient } from "@supabase/supabase-js";
import { aktuellerGemeindeschluessel } from "../lib/ags-nachfolger";
import { windGemeinde } from "../lib/wind-standort";
import { ladeGemeindeflaechen, type Vg250Gemeinden } from "./lib/vg250";
import { MASTR_WIND_SQL, MASTR_WIND_TABELLE } from "../lib/mastr-wind-sql";
import { UNIT_SPECS, findCachedZip, listZipEntries, parseKwp, streamXmlRecords } from "./mastr-bnetza-refresh";

const flag = (name: string) => process.argv.includes(`--${name}`);

export type WindZeile = {
  mastr_nr: string;
  /** Municipality the turbine STANDS in (lib/wind-standort.ts) — the key every
   *  Atlas number uses. */
  region_id: string | null;
  /** The municipality the register names. Kept: where the two differ, the
   *  register entry is wrong, and that is worth being able to show. */
  region_id_register: string | null;
  status: string;
  lage: string | null;
  lat: number | null;
  lon: number | null;
  brutto_kw: number | null;
  netto_kw: number | null;
  nabenhoehe_m: number | null;
  rotor_m: number | null;
  hersteller: string | null;
  typ: string | null;
  windpark: string | null;
  inbetriebnahme: string | null;
  stilllegung: string | null;
  buergerenergie: boolean | null;
  abschaltung_nachts: boolean | null;
  abschaltung_tierschutz: boolean | null;
  /** Key into the EEG payment data, where measured feed-in per plant lives. */
  eeg_nr: string | null;
  /** Register number of the operator (ABR…). The operator's own row lives in
   *  windbetreiber; this is the only link from a turbine to who runs it. */
  betreiber_nr: string | null;
};

/** Catalogue codes → the words they stand for (manufacturer, on/offshore). */
export type Katalog = Map<string, string>;

const jaNein = (raw: string | undefined) => (raw === "1" ? true : raw === "0" ? false : null);

/** A number from the register, or null — never a guessed zero. */
function zahl(raw: string | undefined): number | null {
  if (!raw || !raw.trim()) return null;
  const n = Number(raw.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Only a plausible ISO day; the register carries typo years like 1900. */
function tag(raw: string | undefined): string | null {
  const s = raw?.trim().slice(0, 10);
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const jahr = Number(s.slice(0, 4));
  return jahr >= 1980 && jahr <= 2100 ? s : null;
}

/** Germany's bounding box; coordinates outside are typos or offshore. */
function koordinate(lat: number | null, lon: number | null) {
  if (lat === null || lon === null) return { lat: null, lon: null };
  if (lat < 47 || lat > 55.2 || lon < 5.5 || lon > 15.2) return { lat: null, lon: null };
  return { lat, lon };
}

const text = (raw: string | undefined) => (raw && raw.trim() ? raw.trim() : null);

export function windZeile(row: Record<string, string>, katalog: Katalog, flaechen: Vg250Gemeinden): WindZeile | null {
  const mastr = text(row.EinheitMastrNummer);
  const status = text(row.EinheitBetriebsstatus);
  if (!mastr || !status) return null;
  const gks = (row.Gemeindeschluessel ?? "").trim();
  const { lat, lon } = koordinate(zahl(row.Breitengrad), zahl(row.Laengengrad));
  const brutto = parseKwp(row.Bruttoleistung);
  const netto = parseKwp(row.Nettonennleistung);
  // Same key translation as the main import, so a turbine lands on the page
  // that exists today and not on a merged-away Gemeinde — then the same
  // placement by location, so this table and the Atlas sums agree.
  const register = gks.length >= 8 ? aktuellerGemeindeschluessel(gks.slice(0, 8)) : null;
  const region_id = register
    ? windGemeinde(
        { registerAgs: register, breitengrad: row.Breitengrad, laengengrad: row.Laengengrad, ort: row.Ort, gemarkung: row.Gemarkung },
        flaechen,
      ).regionId
    : null;
  return {
    mastr_nr: mastr,
    region_id,
    region_id_register: register,
    status,
    lage: row.WindAnLandOderAufSee ? (katalog.get(row.WindAnLandOderAufSee) ?? row.WindAnLandOderAufSee) : null,
    lat,
    lon,
    brutto_kw: brutto > 0 ? brutto : null,
    netto_kw: netto > 0 ? netto : null,
    nabenhoehe_m: zahl(row.Nabenhoehe),
    rotor_m: zahl(row.Rotordurchmesser),
    hersteller: row.Hersteller ? (katalog.get(row.Hersteller) ?? row.Hersteller) : null,
    typ: text(row.Typenbezeichnung),
    windpark: text(row.NameWindpark),
    inbetriebnahme: tag(row.Inbetriebnahmedatum),
    stilllegung: tag(row.DatumEndgueltigeStilllegung),
    buergerenergie: jaNein(row.Buergerenergie),
    abschaltung_nachts: jaNein(row.AuflagenAbschaltungSchallimmissionsschutzNachts),
    abschaltung_tierschutz: jaNein(row.AuflagenAbschaltungTierschutz),
    eeg_nr: text(row.EegMaStRNummer),
    betreiber_nr: text(row.AnlagenbetreiberMastrNummer),
  };
}

async function main() {
  const zipPath = findCachedZip();
  const spec = UNIT_SPECS.find((s) => s.et === "wind")!;
  const eintraege = (await listZipEntries(zipPath)).map((e) => e.name).filter((n) => spec.filePattern.test(n));
  if (eintraege.length === 0) throw new Error("Keine Wind-Dateien im Export gefunden.");

  if (flag("probe")) {
    let gezeigt = false;
    await streamXmlRecords(zipPath, eintraege[0], spec.recordTag, (row) => {
      if (gezeigt) return;
      gezeigt = true;
      console.log(JSON.stringify(row, null, 2));
    });
    return;
  }

  const katalog: Katalog = new Map();
  await streamXmlRecords(zipPath, "Katalogwerte.xml", "Katalogwert", (k) => {
    if (k.Id && k.Wert) katalog.set(k.Id, k.Wert);
  });
  if (katalog.size < 1000) throw new Error(`Katalog unvollständig (${katalog.size} Werte).`);

  const flaechen = await ladeGemeindeflaechen();
  const zeilen: WindZeile[] = [];
  let verworfen = 0;
  for (const name of eintraege) {
    await streamXmlRecords(zipPath, name, spec.recordTag, (row) => {
      const z = windZeile(row, katalog, flaechen);
      if (z) zeilen.push(z);
      else verworfen++;
    });
  }

  const inBetrieb = zeilen.filter((z) => z.status === "35");
  const zaehle = (f: (z: WindZeile) => boolean) => inBetrieb.filter(f).length;
  console.log(`${zeilen.length} Windräder gelesen (${verworfen} ohne Kennung verworfen), ${inBetrieb.length} in Betrieb`);
  console.log(`  in Betrieb mit Gemeinde: ${zaehle((z) => !!z.region_id)}`);
  console.log(`  in Betrieb, nach Standort in anderer Gemeinde als im Register: ${zaehle((z) => z.region_id !== z.region_id_register)}`);
  console.log(`  in Betrieb mit Koordinate: ${zaehle((z) => z.lat !== null)}`);
  console.log(`  in Betrieb mit Nabenhöhe: ${zaehle((z) => z.nabenhoehe_m !== null)}`);
  console.log(`  in Betrieb mit Rotor: ${zaehle((z) => z.rotor_m !== null)}`);
  const lagen = new Map<string, number>();
  for (const z of inBetrieb) lagen.set(z.lage ?? "–", (lagen.get(z.lage ?? "–") ?? 0) + 1);
  console.log(`  Lage-Codes: ${[...lagen].map(([k, v]) => `${k}=${v}`).join(", ")}`);
  const status = new Map<string, number>();
  for (const z of zeilen) status.set(z.status, (status.get(z.status) ?? 0) + 1);
  console.log(`  Status-Codes: ${[...status].map(([k, v]) => `${k}=${v}`).join(", ")}`);
  console.log(`  in Betrieb mit EEG-Nummer: ${zaehle((z) => !!z.eeg_nr)}`);
  console.log(`  in Betrieb mit Betreiber-Nummer: ${zaehle((z) => !!z.betreiber_nr)}`);
  console.log(`  in Betrieb stillgelegt-Datum gesetzt: ${zaehle((z) => !!z.stilllegung)}`);
  const mw = inBetrieb.reduce((s, z) => s + (z.brutto_kw ?? 0), 0) / 1000;
  console.log(`  Leistung in Betrieb: ${Math.round(mw).toLocaleString("de-DE")} MW`);

  if (flag("trocken")) return;

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL und SUPABASE_SERVICE_KEY fehlen.");
  const db = createClient(url, key, { auth: { persistSession: false } });
  const setup = await db.rpc("exec_sql", { sql: MASTR_WIND_SQL });
  if (setup.error) throw new Error(`Tabelle anlegen: ${setup.error.message}`);
  // The schema reload is asynchronous; give the API a moment to pick it up.
  await new Promise((r) => setTimeout(r, 3000));

  // Every row carries every column, so a batch never nulls a field another
  // row happens to lack (the upsert column-set trap).
  const jetzt = new Date().toISOString();
  for (let i = 0; i < zeilen.length; i += 1000) {
    const teil = zeilen.slice(i, i + 1000).map((z) => ({ ...z, updated_at: jetzt }));
    // A new column reaches the API only after its schema reload; 3 s were not
    // always enough (09.10.2026). Retry that one error, nothing else.
    let { error } = await db.from(MASTR_WIND_TABELLE).upsert(teil, { onConflict: "mastr_nr" });
    for (let v = 0; error && /schema cache/.test(error.message) && v < 6; v++) {
      await new Promise((r) => setTimeout(r, 5000));
      ({ error } = await db.from(MASTR_WIND_TABELLE).upsert(teil, { onConflict: "mastr_nr" }));
    }
    if (error) throw new Error(`Schreiben ab Zeile ${i}: ${error.message}`);
  }
  // Turbines that left the register would otherwise stay forever.
  const { error: alt } = await db.from(MASTR_WIND_TABELLE).delete().lt("updated_at", jetzt);
  if (alt) throw new Error(`Aufräumen: ${alt.message}`);
  console.log(`${zeilen.length} Zeilen geschrieben.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
