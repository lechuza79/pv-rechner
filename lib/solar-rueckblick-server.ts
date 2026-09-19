import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { supabase } from "./supabase-server";
import { DB_SOFT_READ_TIMEOUT_MS, withDbTimeout } from "./db-timeout";

/**
 * Read side of the ten-year retrospective. The numbers are computed offline
 * per postcode (scripts, ERA5 archive) and only READ here — no weather archive
 * and no hourly simulation at request time.
 *
 * `RUECKBLICK_LOKAL_DIR` lets a local review read results from files instead
 * of the database, so a preview never writes into the shared production table.
 * It is ignored on Vercel.
 */

export type RueckblickAntwort = {
  plz: string;
  vorteilOhneWp: number;
  vorteilMitWp: number;
  jahre: { jahr: number; vorteilOhneWp: number; vorteilMitWp: number; erzeugungKwh: number }[];
  annahmen: Record<string, unknown>;
  wetterquelle: string;
  berechnetAm: string;
};

export async function rueckblickFuerPlz(plz: string): Promise<RueckblickAntwort | null> {
  const lokal = process.env.VERCEL ? undefined : process.env.RUECKBLICK_LOKAL_DIR;
  if (lokal) {
    try {
      return JSON.parse(await readFile(path.join(lokal, `${plz}.json`), "utf8")) as RueckblickAntwort;
    } catch {
      return null;
    }
  }
  if (!supabase) return null;
  const { data, error } = await withDbTimeout(
    supabase
      .from("solar_rueckblick")
      .select("plz,vorteil_ohne_wp,vorteil_mit_wp,jahre,annahmen,wetterquelle,berechnet_am")
      .eq("plz", plz)
      .maybeSingle(),
    "solar-rueckblick: plz",
    DB_SOFT_READ_TIMEOUT_MS,
  );
  if (error || !data) return null;
  const r = data as {
    plz: string; vorteil_ohne_wp: number; vorteil_mit_wp: number; jahre: RueckblickAntwort["jahre"];
    annahmen: Record<string, unknown>; wetterquelle: string; berechnet_am: string;
  };
  return {
    plz: r.plz,
    vorteilOhneWp: Number(r.vorteil_ohne_wp),
    vorteilMitWp: Number(r.vorteil_mit_wp),
    jahre: r.jahre,
    annahmen: r.annahmen,
    wetterquelle: r.wetterquelle,
    berechnetAm: r.berechnet_am,
  };
}
